
import React, { useState, useRef, useEffect } from 'react';
import type { BotProfile } from '../types';

interface PhotoGalleryPageProps {
    bot: BotProfile;
    onBack: () => void;
}

const PhotoGalleryPage: React.FC<PhotoGalleryPageProps> = ({ bot, onBack }) => {
    // Combine all images: Original BG > BG > Original Photo > Photo > Gallery
    const images = React.useMemo(() => {
        const list: string[] = [];
        if (bot.originalChatBackground) list.push(bot.originalChatBackground);
        else if (bot.chatBackground) list.push(bot.chatBackground);
        
        if (bot.originalPhoto) list.push(bot.originalPhoto);
        else if (bot.photo) list.push(bot.photo);
        
        if (bot.originalGalleryImages && bot.originalGalleryImages.length > 0) {
            list.push(...bot.originalGalleryImages);
        } else if (bot.galleryImages && bot.galleryImages.length > 0) {
            list.push(...bot.galleryImages);
        }
        return Array.from(new Set(list)); // Deduplicate
    }, [bot]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    
    // Gesture Refs
    const gesture = useRef({
        startX: 0,
        startY: 0,
        startDist: 0,
        startScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        pointers: new Map<number, { x: number, y: number }>(),
        isPinching: false,
    });

    const getDistance = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            gesture.current.pointers.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
        
        const pointers = Array.from(gesture.current.pointers.values());
        
        if (pointers.length === 2) {
            gesture.current.isPinching = true;
            gesture.current.startDist = getDistance(pointers[0], pointers[1]);
            gesture.current.startScale = scale;
        } else if (pointers.length === 1 && !gesture.current.isPinching) {
             gesture.current.startX = pointers[0].x;
             gesture.current.startY = pointers[0].y;
             gesture.current.initialTranslateX = translate.x;
             gesture.current.initialTranslateY = translate.y;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            gesture.current.pointers.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
        
        const pointers = Array.from(gesture.current.pointers.values());

        if (gesture.current.isPinching && pointers.length === 2) {
             const dist = getDistance(pointers[0], pointers[1]);
             if (gesture.current.startDist > 0) {
                 const newScale = Math.max(1, Math.min(gesture.current.startScale * (dist / gesture.current.startDist), 5));
                 setScale(newScale);
             }
        } else if (pointers.length === 1 && scale > 1) {
            // Pan only if zoomed in
            const dx = pointers[0].x - gesture.current.startX;
            const dy = pointers[0].y - gesture.current.startY;
            setTranslate({
                x: gesture.current.initialTranslateX + dx,
                y: gesture.current.initialTranslateY + dy
            });
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            gesture.current.pointers.delete(e.changedTouches[i].identifier);
        }
        const pointers = Array.from(gesture.current.pointers.values());
        
        if (gesture.current.isPinching && pointers.length < 2) {
            gesture.current.isPinching = false;
        }
        
        if (pointers.length === 0) {
            // Snap back logic
            if (scale === 1) {
                // Check swipe for nav
                const dx = e.changedTouches[0].clientX - gesture.current.startX;
                if (Math.abs(dx) > 50) {
                    if (dx > 0) prevImage();
                    else nextImage();
                }
                setTranslate({ x: 0, y: 0 });
            } else {
                 // Boundary check could be added here
            }
        }
    };

    const nextImage = () => {
        setCurrentIndex(prev => (prev + 1) % images.length);
        resetZoom();
    };

    const prevImage = () => {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
        resetZoom();
    };

    const resetZoom = () => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
    };

    if (images.length === 0) {
        return (
            <div className="bg-black h-full w-full flex items-center justify-center text-white">
                <p>No images available.</p>
                <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-white/20 rounded-full">Back</button>
            </div>
        );
    }

    return (
        <div 
            className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div 
                className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
                style={{
                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`
                }}
            >
                <img 
                    src={images[currentIndex]} 
                    alt="Gallery View" 
                    className="max-w-full max-h-full object-contain pointer-events-none"
                    draggable={false}
                />
            </div>
            
            {/* Minimal UI Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                <button onClick={onBack} className="p-2 rounded-full bg-black/40 text-white backdrop-blur-md pointer-events-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="text-white font-medium text-sm drop-shadow-md">
                    {currentIndex + 1} / {images.length}
                </div>
            </div>

            {/* Tap areas for desktop/easy nav (invisible) */}
            <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={prevImage} />
            <div className="absolute inset-y-0 right-0 w-1/4 z-10" onClick={nextImage} />
        </div>
    );
};

export default PhotoGalleryPage;
