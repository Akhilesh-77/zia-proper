import React, { useState, useRef, useEffect } from 'react';
import type { BotProfile } from '../types';
import { generateDynamicDescription } from '../services/geminiService';

interface BotCardProps {
    bot: BotProfile;
    onChat: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onClone?: () => void;
}

const SwipeToChatButton: React.FC<{ botName: string; onSwiped: () => void; }> = ({ botName, onSwiped }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [thumbX, setThumbX] = useState(0);

    const handleDragStart = (clientX: number) => {
        setIsDragging(true);
        setStartX(clientX);
        if (thumbRef.current) {
            thumbRef.current.style.transition = 'none';
        }
    };

    const handleDragMove = (clientX: number) => {
        if (!isDragging || !trackRef.current) return;
        const trackWidth = trackRef.current.offsetWidth;
        const thumbWidth = thumbRef.current?.offsetWidth || 64;
        const maxTranslate = trackWidth - thumbWidth;
        let newX = clientX - startX;
        newX = Math.max(0, Math.min(newX, maxTranslate));
        setThumbX(newX);
    };

    const handleDragEnd = () => {
        if (!isDragging || !trackRef.current) return;
        setIsDragging(false);
        const trackWidth = trackRef.current.offsetWidth;
        const thumbWidth = thumbRef.current?.offsetWidth || 64;
        const swipeThreshold = trackWidth * 0.7;

        if (thumbX + thumbWidth > swipeThreshold) {
            onSwiped();
        }

        if (thumbRef.current) {
            thumbRef.current.style.transition = 'transform 0.3s ease';
        }
        setThumbX(0);
    };
    
    const onMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientX);
    const onMouseMove = (e: MouseEvent) => { if(isDragging) handleDragMove(e.clientX) };
    const onMouseUp = () => handleDragEnd();
    const onMouseLeave = () => handleDragEnd();

    const onTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientX);
    const onTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientX);
    const onTouchEnd = () => handleDragEnd();

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        } else {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, onMouseMove, onMouseUp]);


    return (
        <div 
            ref={trackRef}
            className="w-full h-20 bg-black/30 rounded-full flex items-center p-2 relative shadow-lg backdrop-blur-sm mt-4"
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={onMouseLeave}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div 
                ref={thumbRef}
                className="h-16 w-16 bg-accent rounded-full flex items-center justify-center cursor-pointer select-none"
                style={{ transform: `translateX(${thumbX}px)` }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </div>
            <span className="absolute left-1/2 -translate-x-1/2 text-white/80 select-none pointer-events-none whitespace-nowrap text-lg">Chat with {botName} →</span>
        </div>
    );
};

const BotPreviewModal: React.FC<{ bot: BotProfile, onSwiped: () => void, onClose: () => void }> = ({ bot, onSwiped, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Duration of the animation
    };

    return (
        <div 
            className={`fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} 
            onClick={handleClose}
        >
            <div 
                className={`w-full max-w-md relative transition-transform duration-300 ${isClosing ? 'scale-95' : 'scale-100'}`}
                onClick={e => e.stopPropagation()}
            >
                <img src={bot.photo} alt={bot.name} className="w-full h-auto max-h-[50vh] object-contain rounded-2xl shadow-2xl" />
                <SwipeToChatButton botName={bot.name} onSwiped={onSwiped} />
            </div>
             <button onClick={handleClose} className="absolute top-5 right-5 bg-black/50 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold text-2xl shadow-lg backdrop-blur-sm">&times;</button>
        </div>
    );
}

const BotCard: React.FC<BotCardProps> = ({ bot, onChat, onEdit, onDelete, onClone }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [dynamicDesc, setDynamicDesc] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchDescription = async () => {
        // Fallback to static description if personality is empty
        if (!bot.personality.trim()) {
            setDynamicDesc(bot.description);
            return;
        }
        const desc = await generateDynamicDescription(bot.personality);
        setDynamicDesc(desc);
    };

    useEffect(() => {
        fetchDescription();
        // Refresh description every 15 seconds
        const interval = setInterval(fetchDescription, 15000);
        return () => clearInterval(interval);
    }, [bot.id, bot.personality]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="bg-white/5 dark:bg-black/10 rounded-2xl p-4 flex flex-col transition-all duration-300 hover:scale-105 hover:shadow-accent/20 shadow-lg relative">
            {modalVisible && <BotPreviewModal bot={bot} onSwiped={onChat} onClose={() => setModalVisible(false)} />}
            <div className="flex-grow">
                <div className="relative">
                    <img src={bot.photo} alt={bot.name} className="w-full h-40 object-cover rounded-lg mb-4 cursor-pointer" onClick={() => setModalVisible(true)} loading="lazy" />
                </div>
                <h3 className="font-bold text-lg">{bot.name}</h3>
                <p className="text-sm text-gray-400 dark:text-gray-300 flex-1 italic">
                    "{dynamicDesc || bot.description}"
                </p>
            </div>

            {(onEdit || onDelete || onClone) && (
                <div ref={menuRef} className="absolute top-5 right-5 z-10">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-32 bg-gray-800 rounded-lg shadow-xl animate-fadeIn z-20">
                            {onEdit && <a href="#" onClick={(e) => { e.preventDefault(); onEdit(); setMenuOpen(false); }} className="block px-4 py-2 text-sm text-white hover:bg-accent rounded-t-lg">Edit</a>}
                            {onClone && <a href="#" onClick={(e) => { e.preventDefault(); onClone?.(); setMenuOpen(false); }} className="block px-4 py-2 text-sm text-white hover:bg-accent">Clone</a>}
                            {onDelete && <a href="#" onClick={(e) => { e.preventDefault(); onDelete(); setMenuOpen(false); }} className="block px-4 py-2 text-sm text-white hover:bg-red-500 rounded-b-lg">Delete</a>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(BotCard);
