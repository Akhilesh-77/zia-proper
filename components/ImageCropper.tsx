import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedImage: string) => void;
    onClose: () => void;
    aspect?: number;
}

const getCroppedImg = (image: HTMLImageElement, crop: {x: number, y: number, width: number, height: number}, aspect: number) => {
    const canvas = document.createElement('canvas');
    const outputWidth = aspect === 1 ? 512 : 1080;
    const outputHeight = aspect === 1 ? 512 : 1920;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        outputWidth,
        outputHeight
    );

    return canvas.toDataURL('image/jpeg', 0.92);
};

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onClose, aspect = 9 / 16 }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
    const [dragState, setDragState] = useState<{ type: 'move' | 'resize'; handle: string; startX: number; startY: number; startCrop: typeof crop } | null>(null);

    const onImageLoad = useCallback(() => {
        if (!imgRef.current) return;
        const { clientWidth: imgWidth, clientHeight: imgHeight } = imgRef.current;
        
        const imgAspect = imgWidth / imgHeight;
        let newWidth, newHeight;

        if (imgAspect > aspect) {
            newHeight = imgHeight * 0.9;
            newWidth = newHeight * aspect;
        } else {
            newWidth = imgWidth * 0.9;
            newHeight = newWidth / aspect;
        }
        
        const newX = (imgWidth - newWidth) / 2;
        const newY = (imgHeight - newHeight) / 2;

        setCrop({ x: newX, y: newY, width: newWidth, height: newHeight });
    }, [aspect]);

    useEffect(() => {
        const image = imgRef.current;
        if (image) {
            const handleLoad = () => onImageLoad();
            if (image.complete) {
                handleLoad();
            } else {
                image.addEventListener('load', handleLoad);
                return () => image.removeEventListener('load', handleLoad);
            }
        }
    }, [imageSrc, onImageLoad]);

    const handleDragStart = (clientX: number, clientY: number, handle: string) => {
        setDragState({
            type: handle === 'move' ? 'move' : 'resize',
            handle,
            startX: clientX,
            startY: clientY,
            startCrop: crop,
        });
    };
    
    const handleMouseDown = (e: React.MouseEvent, handle: string) => {
        e.preventDefault();
        e.stopPropagation();
        handleDragStart(e.clientX, e.clientY, handle);
    };

    const handleTouchStart = (e: React.TouchEvent, handle: string) => {
        e.stopPropagation();
        if (e.touches.length === 1) {
            handleDragStart(e.touches[0].clientX, e.touches[0].clientY, handle);
        }
    };

    const handleDragEnd = useCallback(() => {
        setDragState(null);
    }, []);

    const handleDragMove = useCallback((clientX: number, clientY: number) => {
        if (!dragState || !imgRef.current) return;

        const { clientWidth: imgWidth, clientHeight: imgHeight } = imgRef.current;
        const dx = clientX - dragState.startX;
        const dy = clientY - dragState.startY;
        let { x, y, width, height } = { ...dragState.startCrop };

        if (dragState.type === 'move') {
            x += dx;
            y += dy;
        } else { // resize
            let newWidth = width;
            let newHeight = height;

            if (dragState.handle.includes('e')) newWidth += dx;
            if (dragState.handle.includes('w')) { x += dx; newWidth -= dx; }
            if (dragState.handle.includes('s')) newHeight += dy;
            if (dragState.handle.includes('n')) { y += dy; newHeight -= dy; }
            
            // Maintain aspect ratio
            const minWidth = 20;
            const minHeight = minWidth / aspect;
            if (newWidth < minWidth) newWidth = minWidth;
            if (newHeight < minHeight) newHeight = minHeight;

            if (dragState.handle.match(/[ns]/) && !dragState.handle.match(/[we]/)) {
                width = newHeight * aspect;
                height = newHeight;
                if(dragState.handle.includes('w')) x -= (width - dragState.startCrop.width);

            } else {
                height = newWidth / aspect;
                width = newWidth;
                if(dragState.handle.includes('n')) y -= (height - dragState.startCrop.height);
            }
        }
        
        // boundary checks
        if (width > imgWidth) {
           width = imgWidth;
           height = width / aspect;
        }
        if (height > imgHeight) {
            height = imgHeight;
            width = height * aspect;
        }
        
        x = Math.max(0, Math.min(x, imgWidth - width));
        y = Math.max(0, Math.min(y, imgHeight - height));

        setCrop({ x, y, width, height });
    }, [dragState, aspect]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                // Prevent page scrolling on mobile while cropping
                e.preventDefault();
                handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        if (dragState) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchend', handleDragEnd);
        }

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [dragState, handleDragMove, handleDragEnd]);


    const handleCropConfirm = () => {
        if (imgRef.current && crop.width > 0) {
            const croppedImageUrl = getCroppedImg(imgRef.current, crop, aspect);
            onCropComplete(croppedImageUrl);
        }
    };
    
    const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

    return (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn p-4" 
          onClick={onClose}
        >
            <div className="bg-dark-bg rounded-2xl shadow-2xl max-w-md w-full mx-auto p-6 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Crop Image ({aspect === 1 ? '1:1' : '9:16'})</h2>
                <div 
                    ref={containerRef} 
                    className="relative w-full max-w-xs touch-none" 
                >
                    <img
                        ref={imgRef}
                        src={imageSrc}
                        alt="Image to crop"
                        className="w-full h-auto object-contain select-none pointer-events-none"
                    />
                    <div
                        className="absolute border-2 border-dashed border-white/80 cursor-move"
                        style={{
                            top: crop.y,
                            left: crop.x,
                            width: crop.width,
                            height: crop.height,
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                        }}
                        onMouseDown={(e) => handleMouseDown(e, 'move')}
                        onTouchStart={(e) => handleTouchStart(e, 'move')}
                    >
                        {handles.map(handle => (
                            <div
                                key={handle}
                                onMouseDown={(e) => handleMouseDown(e, handle)}
                                onTouchStart={(e) => handleTouchStart(e, handle)}
                                className={`absolute bg-white/80 w-3.5 h-3.5 rounded-full -m-1.5 cursor-${handle}-resize`}
                                style={{
                                    top: `${handle.includes('n') ? 0 : handle.includes('s') ? 100 : 50}%`,
                                    left: `${handle.includes('w') ? 0 : handle.includes('e') ? 100 : 50}%`,
                                    transform: `translate(${handle.includes('w') ? '-50%' : handle.includes('e') ? '50%' : '0'}, ${handle.includes('n') ? '-50%' : handle.includes('s') ? '50%' : '0'})`,
                                }}
                            />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">Drag and resize the box to select your crop.</p>
                <div className="flex gap-2 mt-6 w-full">
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-2xl transition-colors">Cancel</button>
                    <button type="button" onClick={handleCropConfirm} className="flex-1 bg-accent text-white font-bold py-3 px-4 rounded-2xl transition-colors">Save Crop</button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
