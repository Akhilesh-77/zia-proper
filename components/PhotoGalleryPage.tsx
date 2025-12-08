
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { BotProfile } from '../types';

interface PhotoGalleryPageProps {
    bot: BotProfile;
    onBack: () => void;
}

// --- Internal Component for Individual Zoomable Image ---
const GalleryItem: React.FC<{ src: string }> = ({ src }) => {
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Refs for gesture calculations
    const gesture = useRef({
        startX: 0,
        startY: 0,
        startDist: 0,
        startScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        pointers: new Map<number, { x: number, y: number }>(),
    });

    const getDistance = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    };

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        try {
            const points: { id: number, x: number, y: number }[] = [];
            if ('touches' in e) {
                for (let i = 0; i < e.touches.length; i++) {
                    points.push({ id: e.touches[i].identifier, x: e.touches[i].clientX, y: e.touches[i].clientY });
                }
            } else {
                points.push({ id: 999, x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY });
            }

            points.forEach(p => gesture.current.pointers.set(p.id, p));
            setIsDragging(true);

            if (gesture.current.pointers.size === 2) {
                // Pinch Start
                const pArr = Array.from(gesture.current.pointers.values());
                gesture.current.startDist = getDistance(pArr[0], pArr[1]);
                gesture.current.startScale = scale;
            } else if (gesture.current.pointers.size === 1) {
                // Pan Start
                const p = points[0];
                gesture.current.startX = p.x;
                gesture.current.startY = p.y;
                gesture.current.initialTranslateX = translate.x;
                gesture.current.initialTranslateY = translate.y;
            }
        } catch (err) { console.error(err); }
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        try {
            const points: { id: number, x: number, y: number }[] = [];
            if ('touches' in e) {
                for (let i = 0; i < e.touches.length; i++) {
                    points.push({ id: e.touches[i].identifier, x: e.touches[i].clientX, y: e.touches[i].clientY });
                }
            } else {
                if (!isDragging) return;
                points.push({ id: 999, x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY });
            }

            points.forEach(p => gesture.current.pointers.set(p.id, p));
            const pArr = Array.from(gesture.current.pointers.values());

            if (pArr.length === 2) {
                // Zooming
                const dist = getDistance(pArr[0], pArr[1]);
                if (gesture.current.startDist > 0) {
                    const newScale = Math.max(1, Math.min(gesture.current.startScale * (dist / gesture.current.startDist), 5));
                    setScale(newScale);
                }
            } else if (pArr.length === 1 && scale > 1) {
                // Panning (only when zoomed in)
                const dx = pArr[0].x - gesture.current.startX;
                const dy = pArr[0].y - gesture.current.startY;
                setTranslate({
                    x: gesture.current.initialTranslateX + dx,
                    y: gesture.current.initialTranslateY + dy
                });
            }
        } catch (err) { console.error(err); }
    };

    const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
        setIsDragging(false);
        gesture.current.pointers.clear();
        if (scale < 1) {
            setScale(1);
            setTranslate({ x: 0, y: 0 });
        }
    };

    return (
        <div 
            className="flex-shrink-0 w-full h-full flex items-center justify-center overflow-hidden"
            style={{ 
                // Allow scrolling only if not zoomed
                touchAction: scale > 1 ? 'none' : 'pan-x'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
        >
             <img 
                src={src} 
                alt="Gallery"
                className="w-full h-full object-contain select-none pointer-events-none will-change-transform"
                draggable={false}
                style={{
                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
            />
        </div>
    )
}

const PhotoGalleryPage: React.FC<PhotoGalleryPageProps> = ({ bot, onBack }) => {
    // --- 1. Image List Preparation (Safe & Prioritizing Crops) ---
    const images = React.useMemo(() => {
        const list: string[] = [];
        try {
            // Priority 1: Cropped Background
            if (bot.chatBackground && typeof bot.chatBackground === 'string') {
                list.push(bot.chatBackground);
            } else if (bot.originalChatBackground && typeof bot.originalChatBackground === 'string') {
                list.push(bot.originalChatBackground);
            }

            // Priority 2: Cropped Profile Photo
            if (bot.photo && typeof bot.photo === 'string') {
                list.push(bot.photo);
            } else if (bot.originalPhoto && typeof bot.originalPhoto === 'string') {
                list.push(bot.originalPhoto);
            }

            // Priority 3: Cropped Gallery Images
            // CreationForm updates 'galleryImages' with crops. We use that list directly.
            if (bot.galleryImages && Array.isArray(bot.galleryImages) && bot.galleryImages.length > 0) {
                list.push(...bot.galleryImages);
            } else if (bot.originalGalleryImages && Array.isArray(bot.originalGalleryImages) && bot.originalGalleryImages.length > 0) {
                list.push(...bot.originalGalleryImages);
            }
        } catch (e) {
            console.warn("Error processing gallery images", e);
        }
        
        // Remove duplicates and empty strings
        return Array.from(new Set(list)).filter(src => typeof src === 'string' && src.length > 10);
    }, [bot]);

    // --- 2. State ---
    const [isMounted, setIsMounted] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // --- 3. Lifecycle ---
    useEffect(() => {
        requestAnimationFrame(() => setIsMounted(true));
    }, []);

    // --- 4. Navigation ---
    const handleClose = useCallback(() => {
        setIsExiting(true);
        setTimeout(onBack, 300);
    }, [onBack]);

    if (!images || images.length === 0) return null;

    return (
        <div className={`fixed inset-0 z-[60] bg-black flex items-center justify-center transition-opacity duration-300 ${isMounted && !isExiting ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* CLOSE BUTTON - Top Right */}
            <button 
                onClick={handleClose}
                className="absolute top-6 right-6 z-[70] p-3 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-all shadow-lg active:scale-95"
                aria-label="Close Viewer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* SCROLL CONTAINER (Native Horizontal Scroll) */}
            <div className="w-full h-full flex flex-row overflow-x-auto overflow-y-hidden snap-none no-scrollbar touch-pan-x">
                {images.map((src, index) => (
                    <GalleryItem key={index} src={src} />
                ))}
            </div>
        </div>
    );
};

export default PhotoGalleryPage;
