import React, { useState, useEffect } from 'react';
import { generateImage } from '../services/geminiService';
import { loadUserData, saveUserData } from '../services/storageService';

const ImageGeneratorPage: React.FC = () => {
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [savedImages, setSavedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadImages = async () => {
            try {
                const data = await loadUserData();
                if (data && data.savedImages) {
                    setSavedImages(data.savedImages);
                }
            } catch (e) {
                console.error("Failed to load saved images", e);
            }
        };
        loadImages();
    }, []);


    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setSourceImage(event.target?.result as string);
                setGeneratedImage(null);
                setError(null);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleGenerate = async () => {
        if (!prompt) {
            setError("Please enter a text prompt.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
          const base64Data = await generateImage(prompt, sourceImage);
          setGeneratedImage(`data:image/png;base64,${base64Data}`);
        } catch (err) {
          if (err instanceof Error) setError(err.message);
          else setError("An unknown error occurred.");
        } finally {
          setIsLoading(false);
        }
    };

    const handleSaveImage = async (imageData: string) => {
        const updatedSavedImages = [imageData, ...savedImages];
        setSavedImages(updatedSavedImages);
        await saveUserData({ savedImages: updatedSavedImages });
        setGeneratedImage(null); // Clear the generated image after saving
    };

    const handleDeleteSavedImage = async (index: number) => {
        const updatedSavedImages = savedImages.filter((_, i) => i !== index);
        setSavedImages(updatedSavedImages);
        await saveUserData({ savedImages: updatedSavedImages });
    };

    const inputClass = "w-full bg-white/10 dark:bg-black/10 p-3 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner";

    return (
        <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
            <header className="flex items-center mb-6 gap-2">
                <img src="https://i.postimg.cc/qRB2Gnw2/Gemini-Generated-Image-vfkohrvfkohrvfko-1.png" alt="Zia.ai Logo" className="h-8 w-8"/>
                <h1 className="text-3xl font-bold">Image Generator</h1>
            </header>
            
            <main className="flex-1 overflow-y-auto pb-24 space-y-6">
                <div>
                    <label htmlFor="image-upload" className="block text-sm font-medium mb-2">1. Upload a Reference Photo (Optional)</label>
                    <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <label htmlFor="image-upload" className="cursor-pointer block w-full h-48 bg-white/5 dark:bg-black/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-black/20 flex items-center justify-center">
                        {sourceImage ? (
                            <img src={sourceImage} alt="Uploaded preview" className="h-full w-full object-contain rounded-2xl p-1" />
                        ) : (
                            <span className="text-gray-400 text-center text-sm p-2">Tap to upload a photo</span>
                        )}
                    </label>
                </div>
                
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium mb-2">2. Describe the Image You Want</label>
                    <textarea 
                        id="prompt" 
                        value={prompt} 
                        onChange={e => setPrompt(e.target.value)} 
                        className={inputClass} 
                        rows={4} 
                        placeholder="e.g., A fantasy warrior in steel armor, cinematic lighting..." 
                    />
                </div>
                
                <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-accent text-white font-bold py-4 px-4 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50 shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? 'Generating...' : 'Generate Image'}
                </button>
                
                {isLoading && (
                    <div className="text-center p-4 animate-fadeIn">
                        <div className="flex justify-center items-center space-x-2">
                             <div className="w-3 h-3 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-3 h-3 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-3 h-3 bg-accent rounded-full animate-bounce"></div>
                        </div>
                        <p className="mt-3 text-gray-400">Generating your image... This can take a moment.</p>
                    </div>
                )}

                {error && <p className="text-red-500 text-center animate-fadeIn">{error}</p>}
                
                {generatedImage && (
                    <div className="animate-fadeIn space-y-4">
                        <h2 className="text-xl font-semibold">Result</h2>
                        <img src={generatedImage} alt="Generated" className="w-full object-contain rounded-2xl shadow-lg" />
                        <div className="flex gap-2">
                             <a href={generatedImage} download="generated-image.png" className="flex-1 block text-center bg-gray-600 text-white font-bold py-3 px-4 rounded-2xl text-lg transition-colors hover:bg-gray-500">
                                Download
                            </a>
                            <button onClick={() => handleSaveImage(generatedImage)} className="flex-1 block text-center bg-green-600 text-white font-bold py-3 px-4 rounded-2xl text-lg transition-colors hover:bg-green-500">
                                Save to Library
                            </button>
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-white/10">
                    <h2 className="text-xl font-semibold mb-4">Image Library</h2>
                    {savedImages.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4">
                            {savedImages.map((img, index) => (
                                <div key={index} className="flex flex-col">
                                    <img src={img} alt={`Saved image ${index + 1}`} className="w-full aspect-square object-cover rounded-lg shadow-md" />
                                    <div className="flex justify-center items-center gap-3 mt-2">
                                        <a href={img} download={`saved-image-${index}.png`} className="p-2 bg-accent text-white rounded-full hover:bg-accent/80 transition-colors" aria-label="Download">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </a>
                                        <button onClick={() => handleDeleteSavedImage(index)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors" aria-label="Delete">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">Your saved images will appear here.</p>
                    )}
                </div>

            </main>
        </div>
    );
};

export default ImageGeneratorPage;
