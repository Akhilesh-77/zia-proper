import { BotProfile, Persona, ChatMessage, AIModelOption, VoicePreference, ChatSession } from '../types';

// This service uses localForage to persist data via IndexedDB.
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
    deletedBots: BotProfile[];
    deletedPersonas: Persona[];
}

const OLD_STORAGE_KEY = 'zia_userData';

// Define new keys for individual data pieces
const KEYS: { [K in keyof UserData]: string } = {
    bots: 'zia_bots',
    personas: 'zia_personas',
    chatHistories: 'zia_chatHistories',
    botUsage: 'zia_botUsage',
    theme: 'zia_theme',
    selectedAI: 'zia_selectedAI',
    voicePreference: 'zia_voicePreference',
    hasConsented: 'zia_hasConsented',
    savedImages: 'zia_savedImages',
    sessions: 'zia_sessions',
    deletedBots: 'zia_deletedBots',
    deletedPersonas: 'zia_deletedPersonas',
};


// Migrates data from the old single-key format to the new multi-key format.
export const migrateData = async (): Promise<void> => {
    try {
        const oldData = await localforage.getItem(OLD_STORAGE_KEY);
        if (oldData) {
            console.log("Old data format found. Migrating to new format...");
            const data = oldData as UserData;
            
            const promises = Object.entries(data).map(([key, value]) => {
                const newKey = KEYS[key as keyof UserData];
                if (newKey) {
                    return localforage.setItem(newKey, value);
                }
                return Promise.resolve();
            });

            await Promise.all(promises);
            await localforage.removeItem(OLD_STORAGE_KEY);
            console.log("Migration successful.");
        }
    } catch (error) {
        console.error("Failed during data migration:", error);
    }
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingData: Partial<UserData> = {};

// Saves parts of the app's data under their respective keys.
// Uses debouncing to batch multiple rapid updates (like typing or rapid nav) into fewer DB writes.
export const saveUserData = async (data: Partial<UserData>): Promise<void> => {
    // Merge new data into pending queue
    pendingData = { ...pendingData, ...data };

    // Clear existing timer if any
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    // Set a new timer to save data after a short delay
    saveTimeout = setTimeout(async () => {
        const dataToSave = { ...pendingData };
        pendingData = {}; // Clear pending immediately
        saveTimeout = null;

        try {
            const promises = Object.entries(dataToSave).map(([key, value]) => {
                const typedKey = key as keyof UserData;
                if (KEYS[typedKey]) {
                    return localforage.setItem(KEYS[typedKey], value);
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
        } catch (error) {
            console.error(`Failed to save data`, error);
        }
    }, 500); // 500ms debounce
};

// Loads all data for the user from individual keys.
export const loadUserData = async (): Promise<Partial<UserData>> => {
    try {
        const keyNames = Object.keys(KEYS) as (keyof UserData)[];
        const promises = keyNames.map(keyName => localforage.getItem(KEYS[keyName]));
        const values = await Promise.all(promises);

        const data: Partial<UserData> = {};
        keyNames.forEach((key, index) => {
            if (values[index] !== null && values[index] !== undefined) {
                (data as any)[key] = values[index];
            }
        });
        return data;
    } catch (error) {
        console.error(`Failed to load data`, error);
        return {};
    }
};

// Clears all data for the user.
export const clearUserData = async (): Promise<void> => {
    try {
        await Promise.all(Object.values(KEYS).map(key => localforage.removeItem(key)));
    } catch (error) {
        console.error(`Failed to clear data`, error);
    }
};