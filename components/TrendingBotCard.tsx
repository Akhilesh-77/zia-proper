import React, { useState, useEffect } from 'react';
import type { BotProfile } from '../types';
import { generateDynamicDescription } from '../services/geminiService';

interface TrendingBotCardProps {
    bot: BotProfile;
    onChat: () => void;
}

const TrendingBotCard: React.FC<TrendingBotCardProps> = ({ bot, onChat }) => {
    const [dynamicDesc, setDynamicDesc] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchDescription = async () => {
            if (!bot.personality.trim()) {
                if (isMounted) setDynamicDesc(bot.description);
                return;
            }
            try {
                const desc = await generateDynamicDescription(bot.personality);
                if (isMounted) setDynamicDesc(desc);
            } catch (error) {
                console.error("Failed to fetch dynamic description for trending card:", error);
                if (isMounted) setDynamicDesc(bot.description);
            }
        };

        fetchDescription();
        return () => { isMounted = false; };
    }, [bot.id, bot.personality, bot.description]);

    return (
        <div
            onClick={onChat}
            className="w-40 h-72 flex-shrink-0 relative rounded-2xl overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-105 cursor-pointer group"
        >
            <img
                src={bot.chatBackground || bot.photo}
                alt={`${bot.name} background`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white flex flex-col items-center text-center">
                <img
                    src={bot.photo}
                    alt={bot.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/50 mb-2 shadow-md"
                    loading="lazy"
                />
                <h3 className="font-bold text-base truncate w-full">{bot.name}</h3>
                <p className="text-xs text-white/80 italic line-clamp-2">
                    "{dynamicDesc || bot.description}"
                </p>
            </div>
        </div>
    );
};

export default React.memo(TrendingBotCard);