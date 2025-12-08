
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { BotProfile } from '../types';

interface PhotoGalleryPageProps {
    bot: BotProfile;
    onBack: () => void;
}

// Helper for preloading images
const preloadImage = (src: string) => {
    const img = new Image();
    img.src = src;
};

const PhotoGalleryPage: React.FC<PhotoGalleryPageProps> = ({ bot, onBack }) => {
    // --- 1. Data Preparation ---
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
        return Array.from(new Set(list));
    }, [bot]);

    // --- 2. State Management ---
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [uiVisible, setUiVisible] = useState(true);

    // Transform State
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false); // Visual cursor state

    // --- 3. Animation & Logic Refs ---
    const gesture = useRef({
        startX: 0,
        startY: 0,
        startDist: 0,
        startScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        pointers: new Map<number, { x: number, y: number }>(),
        isPinching: false,
        isPanning: false,
        startTime: 0,
    });

    const swipeAnimRef = useRef<number | null>(null);

    // --- 4. Lifecycle & Preloading ---
    useEffect(() => {
        // Trigger entrance animation
        requestAnimationFrame(() => setIsMounted(true));
        
        // Preload neighbors
        if (images[currentIndex + 1]) preloadImage(images[currentIndex + 1]);
        if (images[currentIndex - 1]) preloadImage(images[currentIndex - 1]);
        
        return () => {
            if (swipeAnimRef.current) cancelAnimationFrame(swipeAnimRef.current);
        };
    }, [currentIndex, images]);

    // --- 5. Navigation Handlers ---
    const handleExit = useCallback(() => {
        setIsExiting(true);
        // Wait for animation to finish before calling onBack
        setTimeout(() => {
            onBack();
        }, 300);
    }, [onBack]);

    const nextImage = useCallback(() => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
        resetTransform();
    }, [currentIndex, images.length]);

    const prevImage = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
        resetTransform();
    }, [currentIndex]);

    const resetTransform = () => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setSwipeOffset(0);
    };

    // --- 6. Gesture Logic (The Core) ---
    const getDistance = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    };

    const getCenter = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    };

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        try {
            // Prevent default browser zooming behavior logic if needed, 
            // but usually handled by CSS touch-action: none.
            
            // Normalize mouse vs touch
            const points: { id: number, x: number, y: number }[] = [];
            if ('touches' in e) {
                for (let i = 0; i < e.touches.length; i++) {
                    points.push({ id: e.touches[i].identifier, x: e.touches[i].clientX, y: e.touches[i].clientY });
                }
            } else {
                points.push({ id: 999, x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY });
            }

            // Update pointers map
            gesture.current.pointers.clear();
            points.forEach(p => gesture.current.pointers.set(p.id, p));
            
            gesture.current.startTime = Date.now();
            setIsDragging(true);

            if (gesture.current.pointers.size === 2) {
                // PINCH START
                const pArr = Array.from(gesture.current.pointers.values());
                gesture.current.isPinching = true;
                gesture.current.startDist = getDistance(pArr[0], pArr[1]);
                gesture.current.startScale = scale;
                // Could store center for zoom-to-point, simplified to center zoom for stability
            } else if (gesture.current.pointers.size === 1) {
                // PAN or SWIPE START
                const p = points[0];
                gesture.current.startX = p.x;
                gesture.current.startY = p.y;
                gesture.current.initialTranslateX = translate.x;
                gesture.current.initialTranslateY = translate.y;
                
                // If scaled > 1, we are panning. If scale == 1, we are swiping.
                gesture.current.isPanning = scale > 1;
            }
        } catch (err) {
            console.error("Gesture Start Error", err);
        }
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        try {
             const points: { id: number, x: number, y: number }[] = [];
            if ('touches' in e) {
                for (let i = 0; i < e.touches.length; i++) {
                    points.push({ id: e.touches[i].identifier, x: e.touches[i].clientX, y: e.touches[i].clientY });
                }
            } else {
                 // Only process mouse move if dragging
                if (!isDragging) return;
                points.push({ id: 999, x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY });
            }

            // Sync pointers
            points.forEach(p => gesture.current.pointers.set(p.id, p));
            const pArr = Array.from(gesture.current.pointers.values());

            if (gesture.current.isPinching && pArr.length === 2) {
                // ZOOMING
                const dist = getDistance(pArr[0], pArr[1]);
                if (gesture.current.startDist > 0) {
                    const newScale = Math.max(1, Math.min(gesture.current.startScale * (dist / gesture.current.startDist), 5));
                    setScale(newScale);
                }
            } else if (pArr.length === 1) {
                const dx = pArr[0].x - gesture.current.startX;
                const dy = pArr[0].y - gesture.current.startY;

                if (scale > 1) {
                    // PANNING
                    // Add smooth friction if out of bounds (simplified)
                    setTranslate({
                        x: gesture.current.initialTranslateX + dx,
                        y: gesture.current.initialTranslateY + dy
                    });
                } else {
                    // SWIPING
                    // Add elastic resistance at edges
                    let effectiveDx = dx;
                    if ((currentIndex === 0 && dx > 0) || (currentIndex === images.length - 1 && dx < 0)) {
                        effectiveDx = dx * 0.3; // Resistance
                    }
                    setSwipeOffset(effectiveDx);
                }
            }
        } catch (err) {
            console.error("Gesture Move Error", err);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
        try {
            setIsDragging(false);
            const pCount = 'touches' in e ? e.touches.length : 0;
            
            // If interaction ended (0 fingers)
            if (pCount === 0) {
                gesture.current.isPinching = false;
                
                if (scale > 1) {
                    // END ZOOM/PAN
                    // Simple boundary snap-back could go here. 
                    // For now, if scale < 1 (from pinch out), reset to 1.
                    if (scale < 1) setScale(1);
                } else {
                    // END SWIPE
                    const dt = Date.now() - gesture.current.startTime;
                    const dx = swipeOffset;
                    
                    // Threshold: Move if swipe is fast enough OR far enough
                    const isFling = dt < 300 && Math.abs(dx) > 30;
                    const isDragFar = Math.abs(dx) > window.innerWidth / 3;

                    if ((isFling || isDragFar) && Math.abs(dx) > 0) {
                        if (dx > 0 && currentIndex > 0) {
                            prevImage();
                        } else if (dx < 0 && currentIndex < images.length - 1) {
                            nextImage();
                        } else {
                            // Rebound (edge case or not enough swipe)
                            setSwipeOffset(0);
                        }
                    } else {
                        // Reset if no significant action
                        // Tap detection: if barely moved and short duration
                        if (Math.abs(dx) < 5 && dt < 200) {
                            setUiVisible(prev => !prev);
                        }
                        setSwipeOffset(0);
                    }
                }
            } else {
                // If fingers remain, reset start points for the remaining fingers to prevent jumping
                // Simplified: do nothing, let next move update naturally or reset on full lift
            }
        } catch (err) {
            console.error("Gesture End Error", err);
            setSwipeOffset(0);
        }
    };

    if (images.length === 0) return null;

    // Calculate carousel transform
    // We render 3 images: prev, current, next (virtualized logic visually)
    // Actually simpler to just translate the current one with offset, and use keys to switch
    
    return (
        <div 
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-300 ease-out overflow-hidden touch-none ${isMounted && !isExiting ? 'bg-opacity-100' : 'bg-opacity-0'}`}
        >
            {/* BACKDROP & GESTURE LAYER */}
            <div 
                className="absolute inset-0 w-full h-full"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                {/* IMAGE CONTAINER */}
                <div 
                    className={`w-full h-full flex items-center justify-center transition-transform duration-300 ease-out ${isMounted && !isExiting ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
                >
                    {/* 
                       We apply the SWIPE transform to a wrapper, 
                       and the ZOOM/PAN transform to the image itself.
                       This separates the physics.
                    */}
                    <div 
                        className="relative w-full h-full flex items-center justify-center will-change-transform"
                        style={{ 
                            transform: `translateX(${swipeOffset}px)`,
                            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
                        }}
                    >
                        {/* Current Image */}
                        <img 
                            src={images[currentIndex]} 
                            alt="Gallery View" 
                            className="max-w-full max-h-full object-contain select-none pointer-events-none will-change-transform"
                            draggable={false}
                            style={{
                                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                                transition: isDragging && scale > 1 ? 'none' : 'transform 0.2s ease-out'
                            }}
                        />
                        
                        {/* Preload / Ghost Images for visual continuity during swipe (Optional Optimization) */}
                        {/* 
                            For a true carousel feel, we'd position absolute images left/right. 
                            Given specific requirement for "infinite swipe" (which usually means looping), 
                            or standard swipe. The prompt asked for "infinite swipe" in previous prompts 
                            but "Elastic overscroll" in this one. We stick to Elastic Overscroll for ends 
                            as implemented in logic above, or infinite if we wrap indices.
                            Let's implement visual neighbors for smoothness.
                        */}
                        {currentIndex > 0 && (
                             <img 
                                src={images[currentIndex - 1]} 
                                className="absolute right-full mr-4 max-w-full max-h-full object-contain opacity-50"
                                style={{ transform: 'scale(0.8)' }}
                                alt="prev"
                            />
                        )}
                        {currentIndex < images.length - 1 && (
                             <img 
                                src={images[currentIndex + 1]} 
                                className="absolute left-full ml-4 max-w-full max-h-full object-contain opacity-50"
                                style={{ transform: 'scale(0.8)' }}
                                alt="next"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* UI OVERLAY */}
            <div 
                className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center transition-all duration-300 z-20 ${uiVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}
            >
                <button 
                    onClick={handleExit} 
                    className="p-2 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="text-white font-medium text-sm drop-shadow-md bg-black/30 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                    {currentIndex + 1} / {images.length}
                </div>
                {/* Placeholder for symmetry or extra actions */}
                <div className="w-10"></div>
            </div>

            {/* Bottom UI (Optional thumb strip could go here, simply hidden for cleaner look) */}
            <div 
                 className={`absolute bottom-0 left-0 right-0 p-6 flex justify-center transition-all duration-300 z-20 ${uiVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                 style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
            >
                <p className="text-white/70 text-xs">Swipe to browse • Pinch to zoom</p>
            </div>
        </div>
    );
};

export default PhotoGalleryPage;
