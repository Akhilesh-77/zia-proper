
// FIX: Removed self-import of 'BotProfile' which was causing a conflict with its local declaration.

export type AIModelOption = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-flash-latest' | 'gemini-flash-lite-latest';
export type VoicePreference = string;

export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
}

export interface BotProfile {
  id:string;
  name: string;
  description: string;
  personality: string;
  photo: string; // base64 data URL
  originalPhoto?: string | null; // base64 data URL (uncropped original)
  gif?: string | null; // base64 data URL
  scenario: string;
  chatBackground?: string | null; // base64 data URL
  originalChatBackground?: string | null; // base64 data URL (uncropped original)
  chatBackgroundBrightness?: number; // Brightness percentage (e.g., 100)
  personaId?: string | null;
  isSpicy?: boolean;
  galleryImages?: string[]; // List of additional images (base64)
  originalGalleryImages?: string[]; // List of original uncropped additional images (base64)
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

export interface Persona {
  id: string;
  name: string;
  description?: string;
  personality: string;
  photo?: string | null; // base64 data URL
}

export interface ChatSession {
  startTime: number;
  endTime: number;
  botId: string;
}
