import { BotProfile, Persona, ChatMessage, AIModelOption, VoicePreference } from '../types';

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
}

const STORAGE_KEY_PREFIX = 'userData_';

// Saves all of a user's data under a single key.
export const saveUserData = async (userId: string, data: Partial<UserData>): Promise<void> => {
    if (!userId) {
        console.error("Attempted to save data without a user ID.");
        return;
    }
    try {
        const key = `${STORAGE_KEY_PREFIX}${userId}`;
        // Load existing data to merge, preserving any fields not passed in the new data object
        const existingData = await loadUserData(userId) || {};
        const dataToSave = { ...existingData, ...data };
        await localforage.setItem(key, dataToSave);
    } catch (error) {
        console.error(`Failed to save data for user ${userId}`, error);
    }
};

// Loads all data for a given user.
export const loadUserData = async (userId: string): Promise<UserData | null> => {
    if (!userId) {
        console.error("Attempted to load data without a user ID.");
        return null;
    }
    try {
        const key = `${STORAGE_KEY_PREFIX}${userId}`;
        const savedData = await localforage.getItem(key);
        return savedData ? (savedData as UserData) : null;
    } catch (error) {
        console.error(`Failed to load data for user ${userId}`, error);
        return null;
    }
};

// Clears all data for a given user.
export const clearUserData = async (userId: string): Promise<void> => {
    if (!userId) {
        console.error("Attempted to clear data without a user ID.");
        return;
    }
    try {
        const key = `${STORAGE_KEY_PREFIX}${userId}`;
        await localforage.removeItem(key);
    } catch (error) {
        console.error(`Failed to clear data for user ${userId}`, error);
    }
};