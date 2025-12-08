
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { BotProfile } from '../types';

interface PhotoGalleryPageProps {
    bot: BotProfile;
    onBack: () => void;
}

// Helper for preloading images to prevent flickering
const preloadImage = (src: string) => {
    try {
        const img = new Image();
        img.src = src;
    } catch (e) {
        // Ignore preload errors
    }
};

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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMounted, setIsMounted] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // Transform State
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // --- 3. Refs for Gesture Logic ---
    const gesture = useRef({
        startX: 0,
        startY: 0,
        startDist: 0,
        startScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        pointers: new Map<number, { x: number, y: number }>(),
        isPinching: false,
        startTime: 0,
    });

    // --- 4. Lifecycle ---
    useEffect(() => {
        requestAnimationFrame(() => setIsMounted(true));
        // Preload adjacent images
        if (images[currentIndex + 1]) preloadImage(images[currentIndex + 1]);
        if (images[currentIndex - 1]) preloadImage(images[currentIndex - 1]);
    }, [currentIndex, images]);

    // --- 5. Navigation & Reset ---
    const handleClose = useCallback(() => {
        setIsExiting(true);
        setTimeout(onBack, 300);
    }, [onBack]);

    const resetTransform = () => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setSwipeOffset(0);
    };

    const nextImage = useCallback(() => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(prev => prev + 1);
            resetTransform();
        } else {
            setSwipeOffset(0); // Snap back if at end
        }
    }, [currentIndex, images.length]);

    const prevImage = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            resetTransform();
        } else {
            setSwipeOffset(0); // Snap back if at start
        }
    }, [currentIndex]);

    // --- 6. Gesture Handlers ---
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

            gesture.current.pointers.clear();
            points.forEach(p => gesture.current.pointers.set(p.id, p));
            gesture.current.startTime = Date.now();
            setIsDragging(true);

            if (gesture.current.pointers.size === 2) {
                // Pinch Start
                const pArr = Array.from(gesture.current.pointers.values());
                gesture.current.isPinching = true;
                gesture.current.startDist = getDistance(pArr[0], pArr[1]);
                gesture.current.startScale = scale;
            } else if (gesture.current.pointers.size === 1) {
                // Pan/Swipe Start
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

            if (gesture.current.isPinching && pArr.length === 2) {
                // Zooming
                const dist = getDistance(pArr[0], pArr[1]);
                if (gesture.current.startDist > 0) {
                    const newScale = Math.max(1, Math.min(gesture.current.startScale * (dist / gesture.current.startDist), 5));
                    setScale(newScale);
                }
            } else if (pArr.length === 1) {
                const dx = pArr[0].x - gesture.current.startX;
                const dy = pArr[0].y - gesture.current.startY;

                if (scale > 1) {
                    // Panning (only when zoomed in)
                    setTranslate({
                        x: gesture.current.initialTranslateX + dx,
                        y: gesture.current.initialTranslateY + dy
                    });
                } else {
                    // Swiping (only when scale is 1)
                    // Add resistance at edges
                    let effectiveDx = dx;
                    if ((currentIndex === 0 && dx > 0) || (currentIndex === images.length - 1 && dx < 0)) {
                        effectiveDx = dx * 0.4;
                    }
                    setSwipeOffset(effectiveDx);
                }
            }
        } catch (err) { console.error(err); }
    };

    const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
        try {
            setIsDragging(false);
            const pCount = 'touches' in e ? e.touches.length : 0;
            
            if (pCount === 0) {
                gesture.current.isPinching = false;
                
                if (scale > 1) {
                    // Check bounds for panning could go here, but for now just prevent scale < 1
                    if (scale < 1) setScale(1);
                } else {
                    // Handle Swipe completion
                    const dt = Date.now() - gesture.current.startTime;
                    const dx = swipeOffset;
                    const isFling = dt < 300 && Math.abs(dx) > 40;
                    const isDragFar = Math.abs(dx) > window.innerWidth / 3;

                    if ((isFling || isDragFar) && Math.abs(dx) > 0) {
                        if (dx > 0) prevImage();
                        else nextImage();
                    } else {
                        setSwipeOffset(0); // Snap back
                    }
                }
            }
        } catch (err) { 
            console.error(err);
            setSwipeOffset(0);
        }
    };

    if (!images || images.length === 0) return null;

    return (
        <div className={`fixed inset-0 z-[60] bg-black flex items-center justify-center overflow-hidden touch-none transition-opacity duration-300 ${isMounted && !isExiting ? 'opacity-100' : 'opacity-0'}`}>
            
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

            {/* GESTURE AREA */}
            <div 
                className="absolute inset-0 w-full h-full flex items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                {/* IMAGE WRAPPER (Handles Swipe Translate) */}
                <div 
                    className="w-full h-full flex items-center justify-center will-change-transform"
                    style={{
                        transform: `translateX(${swipeOffset}px)`,
                        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
                    }}
                >
                    {/* IMAGE (Handles Scale & Pan Translate) */}
                    <img 
                        src={images[currentIndex]} 
                        alt="Gallery"
                        className="max-w-full max-h-full object-contain select-none pointer-events-none will-change-transform"
                        draggable={false}
                        style={{
                            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                            transition: isDragging && scale > 1 ? 'none' : 'transform 0.2s ease-out'
                        }}
                    />
                </div>
            </div>
            
            {/* Minimal Instructions (Optional, keeps UI clean) */}
            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none opacity-50">
                 {/* No counters, no arrows. Just clean view. */}
            </div>
        </div>
    );
};

export default PhotoGalleryPage;
