import type { ChatMessage } from '../types';

/**
 * This is a placeholder function for user-defined custom logic.
 * It is called before every message is sent to the AI, allowing you
 * to dynamically modify the bot's personality prompt based on chat history,
 * the user's message, or any other custom logic you wish to implement.
 *
 * @param history - An array of previous chat messages in the conversation.
 * @param userMessage - The latest message sent by the user.
 * @param botPrompt - The bot's base personality prompt.
 * @param isSpicy - A boolean flag to enable a spicy conversational tone.
 * @returns {string} The enhanced personality prompt to be sent to the AI.
 */
export const xyz = (
  history: ChatMessage[],
  userMessage: string,
  botPrompt: string,
  isSpicy: boolean
): string => {
  // --- DEVELOPER INSTRUCTION ---
  // You can replace the logic below with your own custom functionality.
  // For example, you could analyze the user's message for specific keywords
  // to trigger different bot behaviors or roleplaying scenarios.
  
  // For demonstration, this function appends an instruction to heighten the
  // romantic and suggestive tension in the conversation.
  console.log(`xyz function called. Spicy mode: ${isSpicy}`);

  let customBehaviorInstruction =
    'Incorporate intense sexual tension and heightened arousal into the conversation. The dialogue should be very suggestive and seductive, building a strong romantic and flirtatious atmosphere. Focus on the emotional and physical sensations of desire.';
  
  if (isSpicy) {
    customBehaviorInstruction += '\n\n🌶️ SPICY MODE ACTIVE: Adopt an especially playful, flirty, and teasing tone. Use witty remarks, suggestive language, and playful banter to create a fun and spicy dynamic.';
  }

  const formattingInstruction = 
    'You must adhere to the following formatting and behavior rules AT ALL TIMES: ' +
    '1. Dialogue Formatting: ALL spoken text must be enclosed in double quotes. Example: "Hey, how are you?". ' +
    '2. Action Formatting: ALL physical actions or descriptions must be enclosed in single asterisks. Example: *smiles slightly*. Do NOT use double asterisks. ' +
    '3. Chat Tone: The conversation MUST feel natural, like a real human speaking. Avoid any dramatic, theatrical, or exaggerated roleplay tones. Keep messages short and realistic. ' +
    '4. Core Personality: Remain perfectly in character based on the initial prompt and maintain context from the entire chat history. ' +
    '5. Emotional Awareness: Be deeply responsive to the user\'s emotional state and tone.';

  return `${botPrompt}\n\n# DYNAMIC INSTRUCTIONS (from xyz())\n${customBehaviorInstruction}\n\n# FORMATTING & BEHAVIOR RULES\n${formattingInstruction}`;
};