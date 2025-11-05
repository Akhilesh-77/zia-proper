import { GoogleGenAI, Content, Part, Modality } from "@google/genai";
import { ChatMessage, AIModelOption, BotProfile } from "../types";
import { xyz } from "./xyz";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper Functions ---

const fileToGenerativePart = (base64Data: string, mimeType: string): Part => {
  return {
    inlineData: {
      data: base64Data.split(',')[1],
      mimeType
    },
  };
};

const RETRY_LIMIT = 3;

async function retry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown = new Error("All retry attempts failed without a specific error.");
    for (let i = 0; i < RETRY_LIMIT; i++) {
        try {
            const result = await fn();
            // Ensure result is a non-empty string or a valid object
            if (typeof result === 'string' && result.trim()) {
                return result;
            }
            if (typeof result !== 'string' && result) {
                 return result;
            }
            lastError = new Error("AI returned an empty or invalid response.");
            console.warn(`Attempt ${i + 1} of ${RETRY_LIMIT} resulted in an empty response. Retrying...`);
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} of ${RETRY_LIMIT} failed with error:`, error, `Retrying...`);
        }
        if (i < RETRY_LIMIT - 1) { // Add delay before next retry
            await new Promise(res => setTimeout(res, 1500 * (i + 1)));
        }
    }
    console.error(`All ${RETRY_LIMIT} attempts failed.`);
    throw lastError;
}


// --- Core AI Call Logic ---

const callGeminiText = async (systemPrompt: string, history: ChatMessage[], model: AIModelOption): Promise<string> => {
    const contents: Content[] = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // If history is empty, the last message is the prompt itself
    if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: '...' }] }); // Dummy user turn to place system prompt
    }

    const response = await ai.models.generateContent({
        model,
        contents,
        config: {
            systemInstruction: systemPrompt,
        },
    });

    return response.text.trim();
};

const fallbackModelMap: Partial<Record<AIModelOption, AIModelOption>> = {
    'gemini-2.5-pro': 'gemini-2.5-flash',
    'gemini-flash-latest': 'gemini-2.5-flash',
    'gemini-2.5-flash': 'gemini-flash-lite-latest',
};


// --- Exposed Service Functions ---

const generateText = async (
    systemPrompt: string,
    history: ChatMessage[],
    selectedAI: AIModelOption
): Promise<string> => {
    
    const primaryApiCall = async (): Promise<string> => {
        console.log(`Attempting to generate text with primary model: ${selectedAI}...`);
        const result = await callGeminiText(systemPrompt, history, selectedAI);
        if (!result.trim()) throw new Error("AI returned an empty response.");
        console.log(`Primary model ${selectedAI} response successful.`);
        return result;
    };

    try {
        return await retry(primaryApiCall);
    } catch (primaryError) {
        console.error(`Primary model ${selectedAI} failed after retries:`, primaryError);
        
        const fallbackAI = fallbackModelMap[selectedAI];
        if (!fallbackAI) {
            console.error(`No fallback available for ${selectedAI}.`);
            throw new Error(`Failed to fetch response from ${selectedAI}: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`);
        }
        
        console.warn(`Attempting to generate text with fallback model: ${fallbackAI}`);
        const fallbackApiCall = async (): Promise<string> => {
            const result = await callGeminiText(systemPrompt, history, fallbackAI);
            if (!result.trim()) throw new Error("AI returned an empty response.");
            console.log(`Fallback model ${fallbackAI} response successful.`);
            return result;
        };

        try {
            return await retry(fallbackApiCall);
        } catch (fallbackError) {
             console.error(`Fallback model ${fallbackAI} also failed after retries:`, fallbackError);
             throw new Error(`Failed to fetch response from AI after attempting fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        }
    }
};


export const generateBotResponse = async (
    history: ChatMessage[], 
    botProfile: Pick<BotProfile, 'personality' | 'isSpicy'>, 
    selectedAI: AIModelOption
): Promise<string> => {
    try {
        // The xyz function is called here to enhance the personality before generating text.
        const enhancedPersonality = xyz(history, history[history.length - 1]?.text || '', botProfile.personality, botProfile.isSpicy || false);
        return await generateText(enhancedPersonality, history, selectedAI);
    } catch (error) {
         return error instanceof Error ? error.message : "An unknown error occurred.";
    }
};


export const generateUserResponseSuggestion = async (
    history: ChatMessage[], 
    personality: string,
    selectedAI: AIModelOption
): Promise<string> => {
    const systemPrompt = `You are helping a user write a response in a chat. Based on the bot's personality and the last few messages, suggest a short, natural, human-like reply from the USER'S perspective. The response should be simple, realistic, and sound like something a real person would type in a chat. Avoid clichés or overly formal language. Bot's personality for context: "${personality}"`;
    try {
        const result = await generateText(systemPrompt, history, selectedAI);
        return result.replace(/"/g, '');
    } catch (error) {
        return `Failed to get suggestion: ${error instanceof Error ? error.message : String(error)}`;
    }
};

export async function generateDynamicDescription(personality: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the following personality description, write a single, very short, intriguing, and dynamic sentence (less than 15 words) that this character might say or think. The sentence should hint at their personality without explicitly stating it. Examples: "Another soul to read.", "Ready for a little chaos?", "The stars whisper secrets to me.". Do not use quotation marks. Personality: "${personality}"`,
    });
    return response.text.trim().replace(/"/g, '');
  } catch (error) {
    console.error("Error generating dynamic description:", error);
    return "I'm ready to chat.";
  }
}

export async function generateScenario(
    personaPersonality: string, 
    userPrompt: string,
    selectedAI: AIModelOption
): Promise<string> {
  const fullPrompt = `You are a creative writer tasked with starting a roleplay chat.
- The bot's personality is: "${personaPersonality}"
- The user has provided an optional theme/idea: "${userPrompt || 'None'}"

Based on this, write a simple, creative, and engaging opening message (a "scenario") from the bot's point of view. The message should set a scene or start a conversation. It must be written in a human-like, first-person style. Keep it concise (2-4 sentences). Do not use quotation marks for the whole message, but you can use them for dialogue within the message. For example, instead of "*I look at you and say "hi"*", it should be something like "I look over at you, a small smile playing on my lips. 'Hi there,' I say softly."`;
  
  try {
    return await generateText(fullPrompt, [], selectedAI);
  } catch (error) {
     return `Failed to generate scenario: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function generateImage(prompt: string, sourceImage: string | null): Promise<string> {
  try {
    const model = 'gemini-2.5-flash-image';
    const parts: Part[] = [{ text: prompt }];

    if (sourceImage) {
      parts[0].text = `Instruction: Preserve the facial structure and identity of the person in the source image. ${prompt}`;
      const mimeType = sourceImage.match(/:(.*?);/)?.[1] || 'image/jpeg';
      parts.unshift(fileToGenerativePart(sourceImage, mimeType));
    }
    
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image was generated. The prompt may have been blocked.");
  } catch (err) {
      console.error("Gemini image generation failed:", err);
      if (err instanceof Error) throw err;
      throw new Error("An unknown error occurred during image generation.");
  }
}
// FIX: Added missing generateCodePrompt function to resolve import error.
export async function generateCodePrompt(task: string, language: string): Promise<string> {
  const systemInstruction = `You are an expert prompt engineer who creates detailed prompts for code-generation AIs. Based on a user's brief request, create a comprehensive prompt that will guide an AI to produce high-quality, production-ready code in ${language}.

The prompt you generate should instruct the AI to:
1. Create complete, runnable code.
2. Follow modern best practices and conventions for ${language}.
3. Include all necessary imports and dependencies.
4. For UI components, provide clean, modern, and responsive styling.
5. Add insightful comments for complex logic.
6. Structure the code logically within a single file or component where applicable.`;

  const userRequest = `Generate a detailed prompt for this task: ${task}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userRequest,
      config: {
        systemInstruction,
      },
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating code prompt:", error);
    if (error instanceof Error) throw error;
    throw new Error("An unknown error occurred during code prompt generation.");
  }
}