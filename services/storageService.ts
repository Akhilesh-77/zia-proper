import { BotProfile, Persona, ChatMessage, AIModelOption, VoicePreference, ChatSession } from '../types';

// This service uses localForage to persist data via IndexedDB,
// namespaced by user ID.
declare const localforage: any;

interface UserData {
    bots: BotProfile[];
    personas: Persona[];
    chatHistories: Record<string, ChatMessage[]>;
    botUsage: Record<string, number>;
    theme: 'light' | 'dark';
    selectedAI: AIModelOption;
    voicePreference: VoicePreference | null;
    hasConsented: boolean;
    savedImages: string[];
    sessions: ChatSession[];
}

const STORAGE_KEY = 'zia_userData';

// Saves all of the app's data under a single key.
export const saveUserData = async (data: Partial<UserData>): Promise<void> => {
    try {
        // Load existing data to merge, preserving any fields not passed in the new data object
        const existingData = await loadUserData() || {};
        const dataToSave = { ...existingData, ...data };
        await localforage.setItem(STORAGE_KEY, dataToSave);
    } catch (error)
        {
        console.error(`Failed to save data`, error);
    }
};

// Loads all data for the user.
export const loadUserData = async (): Promise<UserData | null> => {
    try {
        const savedData = await localforage.getItem(STORAGE_KEY);
        return savedData ? (savedData as UserData) : null;
    } catch (error) {
        console.error(`Failed to load data`, error);
        return null;
    }
};

// Clears all data for the user.
export const clearUserData = async (): Promise<void> => {
    try {
        await localforage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error(`Failed to clear data`, error);
    }
};