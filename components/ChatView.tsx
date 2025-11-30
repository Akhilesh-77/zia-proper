
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { User, BotProfile, ChatMessage, Persona, AIModelOption, VoicePreference } from '../types';
import { generateBotResponse } from '../services/geminiService';

const PhotoViewer: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
    <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn"
        onClick={onClose}
    >
        <img src={src} alt="Full view" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        <button onClick={onClose} className="absolute top-5 right-5 bg-black/50 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold text-2xl">&times;</button>
    </div>
);

const ImageCarousel: React.FC<{ images: string[]; onClose: () => void; onSetBackground: (img: string) => void }> = ({ images, onClose, onSetBackground }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
        touchEndX.current = null;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (touchStartX.current === null || touchEndX.current === null) return;
        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            nextSlide();
        } else if (isRightSwipe) {
            prevSlide();
        }
        // Reset
        touchStartX.current = null;
        touchEndX.current = null;
    };

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };
    
    // Safety check for empty images or missing data
    if (!images || images.length === 0) return null;

    const currentImage = images[currentIndex];
    
    // Check if current image is missing/undefined and skip safely
    if (!currentImage) {
        // If the current image index somehow points to undefined, reset to 0
        if (currentIndex !== 0) setCurrentIndex(0);
        return null;
    }

    return (
        <div 
            className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fadeIn"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div key={currentIndex} className="absolute inset-0 w-full h-full animate-fadeIn flex items-center justify-center">
                <img 
                    src={currentImage} 
                    alt={`Preview ${currentIndex}`} 
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                        console.warn("Image failed to load in carousel");
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            </div>
            
            {/* Set Background Button - Top Left */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (currentImage) onSetBackground(currentImage);
                }} 
                className="absolute top-6 left-6 z-50 bg-black/40 text-white rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-md hover:bg-green-600/80 transition-all shadow-lg border border-white/10"
                aria-label="Set as Background"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            </button>

            {/* Navigation Hints */}
            {images.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white z-10">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white z-10">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                     <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
                        {images.map((_, idx) => (
                            <div key={idx} className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/30'}`} />
                        ))}
                    </div>
                </>
            )}

            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 z-50 bg-black/40 text-white rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-md hover:bg-black/60 transition-all shadow-lg"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

const ChatSettingsModal: React.FC<{
    bot: BotProfile;
    onClose: () => void;
    onSave: (newBrightness: number) => void;
    onBrightnessChange: (newBrightness: number) => void;
    tempBrightness: number;
}> = ({ bot, onClose, onSave, onBrightnessChange, tempBrightness }) => {
    
    const handleSave = () => {
        onSave(tempBrightness);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn p-4" onClick={onClose}>
            <div className="bg-dark-bg rounded-2xl shadow-2xl relative max-w-md w-full mx-auto p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Chat Settings</h2>
                {bot.chatBackground && (
                    <div>
                        <label htmlFor="brightness-slider" className="block text-sm font-medium mb-2">Background Brightness</label>
                        <input
                            id="brightness-slider"
                            type="range"
                            min="0"
                            max="200"
                            value={tempBrightness}
                            onChange={(e) => onBrightnessChange(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                        <div className="text-center text-xs text-gray-400 mt-1">{tempBrightness}%</div>
                    </div>
                )}
                 <div className="flex gap-2 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-2xl transition-colors">Cancel</button>
                    <button type="button" onClick={handleSave} className="flex-1 bg-accent text-white font-bold py-3 px-4 rounded-2xl transition-colors">Save</button>
                </div>
            </div>
        </div>
    )
}

const parseMessage = (text: string) => {
    if (typeof text !== 'string') {
      console.warn('parseMessage received non-string input:', text);
      return '';
    }
    const parts = text.split(/(\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <span key={index} className="text-accent italic">{part.slice(1, -1)}</span>;
      }
      return part;
    });
};

const MessageItem = React.memo(({ 
    msg, 
    botAvatar, 
    userAvatar, 
    userAvatarAlt, 
    deletingMessageId, 
    copiedMessageId, 
    onCopy, 
    onDelete, 
    onPlay, 
    onRegenerate, 
    setPhotoToView 
}: any) => {
    return (
        <div 
            className={`flex items-end gap-2 group ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} transition-opacity duration-300 ${deletingMessageId === msg.id ? 'opacity-0' : 'opacity-100'}`}
        >
            {msg.sender === 'bot' && <img src={botAvatar} alt="Bot" className="h-10 w-10 rounded-lg object-cover self-start cursor-pointer" onClick={() => setPhotoToView(botAvatar)} onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />}
            
            <div className={`flex items-center gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-white/10 dark:bg-black/20 rounded-bl-none'}`}>
                    <p className="whitespace-pre-wrap">{parseMessage(msg.text)}</p>
                </div>
                 {msg.sender === 'user' && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onCopy(msg.text, msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-accent" aria-label="Copy message">
                            {copiedMessageId === msg.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                        </button>
                        <button onClick={() => onDelete(msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-red-500" aria-label="Delete message">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                )}
                {msg.sender === 'bot' && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onPlay(msg.text)} className="p-1 rounded-full bg-black/30 hover:bg-accent" aria-label="Play voice"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.108 12 5v14c0 .892-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
                        <button onClick={() => onRegenerate(msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-accent" aria-label="Regenerate response"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></button>
                        <button onClick={() => onDelete(msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-red-500" aria-label="Delete message">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                )}
            </div>

            {msg.sender === 'user' && <img src={userAvatar} alt={userAvatarAlt} className="h-10 w-10 rounded-lg object-cover self-start cursor-pointer" onClick={() => setPhotoToView(userAvatar)} onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />}
        </div>
    );
});

interface ChatViewProps {
  bot: BotProfile & { persona?: Persona | null };
  onBack: () => void;
  chatHistory: ChatMessage[];
  onNewMessage: (message: ChatMessage) => void;
  onUpdateHistory: (newHistory: ChatMessage[]) => void;
  onUpdateBot: (bot: BotProfile) => void;
  selectedAI: AIModelOption;
  voicePreference: VoicePreference | null;
  onEdit: (id: string) => void;
  onStartNewChat: (id: string) => void;
  currentUser: User;
  logSession: (startTime: number, botId: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ bot, onBack, chatHistory, onNewMessage, onUpdateHistory, onUpdateBot, selectedAI, voicePreference, onEdit, onStartNewChat, currentUser, logSession }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [photoToView, setPhotoToView] = useState<string | null>(null);
  const [showCarousel, setShowCarousel] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempBrightness, setTempBrightness] = useState(bot.chatBackgroundBrightness ?? 100);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  
  const botAvatar = bot.photo; 
  const userAvatar = bot.persona?.photo || currentUser.photoUrl; 
  const userAvatarAlt = bot.persona?.name || currentUser.name || 'User';

  // Prepare images for carousel
  // Combines: Background (if any) + Profile (original or cropped) + Gallery Images
  const carouselImages = useMemo(() => {
      const images: string[] = [];
      try {
        if (bot.chatBackground) images.push(bot.chatBackground);
        
        // Use original uncropped photo if available, otherwise fallback to the cropped photo
        if (bot.originalPhoto) {
            images.push(bot.originalPhoto);
        } else if (bot.photo) {
            images.push(bot.photo);
        }
        
        // Add additional gallery images
        if (bot.galleryImages && Array.isArray(bot.galleryImages)) {
            images.push(...bot.galleryImages);
        }
      } catch (e) {
          console.error("Error constructing carousel images", e);
      }
      return images;
  }, [bot.chatBackground, bot.originalPhoto, bot.photo, bot.galleryImages]);

  const hasGalleryImages = carouselImages.length > 0;

  // Preload images for smoother experience
  useEffect(() => {
    try {
        if (bot.chatBackground) {
            const bgImg = new Image();
            bgImg.src = bot.chatBackground;
        }
        if (bot.originalPhoto) {
            const origImg = new Image();
            origImg.src = bot.originalPhoto;
        }
        const avatarImg = new Image();
        avatarImg.src = botAvatar;
    } catch(e) {
        // Ignore preload errors
    }
  }, [bot.chatBackground, bot.originalPhoto, botAvatar]);

  useEffect(() => {
    // Log session start time on mount and log end time on unmount
    const startTime = Date.now();
    return () => {
      logSession(startTime, bot.id);
    };
  }, [bot.id, logSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);
  
  useEffect(() => {
    const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if(availableVoices.length > 0) {
            setVoices(availableVoices);
        }
    };
    loadVoices();
    // Voices might load asynchronously.
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
        window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const handlePlayVoice = useCallback((text: string) => {
    window.speechSynthesis.cancel(); // Stop any currently playing speech
    const utterance = new SpeechSynthesisUtterance(text);
    if (voicePreference && voices.length > 0) {
        const desiredVoice = voices.find(v => v.name === voicePreference) || 
                             voices.find(v => voicePreference && v.name.toLowerCase().includes(voicePreference)) || 
                             voices[0];
        utterance.voice = desiredVoice || voices[0];
    }
    window.speechSynthesis.speak(utterance);
  }, [voicePreference, voices]);


  const handleSend = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: Date.now(),
    };
    
    const newHistory = [...chatHistory, userMessage];
    onUpdateHistory(newHistory); // Update history immediately with user message
    setInput('');
    setIsTyping(true);

    try {
      const botResponseText = await generateBotResponse(newHistory, { personality: bot.personality, isSpicy: bot.isSpicy }, selectedAI);

      const finalBotMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: botResponseText,
        sender: 'bot',
        timestamp: Date.now(),
      };
      onNewMessage(finalBotMessage);

    } catch (error) {
      console.error("Error sending message:", error);
      onNewMessage({
        id: `error-${Date.now()}`,
        text: "Sorry, I encountered an error. Please try again.",
        sender: 'bot',
        timestamp: Date.now()
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyMessage = useCallback((text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
    }).catch(err => {
        console.error("Failed to copy message:", err);
    });
  }, []);

  const handleDeleteMessage = useCallback((messageId: string) => {
      setDeletingMessageId(messageId);
      setTimeout(() => {
        const newHistory = chatHistory.filter(m => m.id !== messageId);
        onUpdateHistory(newHistory);
        setDeletingMessageId(null);
      }, 300); // Animation duration
  }, [chatHistory, onUpdateHistory]);
  
  const handleRegenerateMessage = useCallback(async (messageId: string) => {
      const messageIndex = chatHistory.findIndex(m => m.id === messageId);
      if (messageIndex === -1 || chatHistory[messageIndex].sender !== 'bot') return;

      const historyForRegen = chatHistory.slice(0, messageIndex);
      setIsTyping(true);
      try {
          const botResponseText = await generateBotResponse(historyForRegen, { personality: bot.personality, isSpicy: bot.isSpicy }, selectedAI);
          
          const newHistory = [...chatHistory];
          newHistory[messageIndex] = { ...newHistory[messageIndex], text: botResponseText, timestamp: Date.now() };
          onUpdateHistory(newHistory);
      } catch (error) {
          console.error("Error regenerating message:", error);
      } finally {
          setIsTyping(false);
      }
  }, [chatHistory, bot.personality, bot.isSpicy, selectedAI, onUpdateHistory]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onEdit(bot.id);
    setIsMenuOpen(false);
  };

  const handlePersonaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.hash = '#persona';
    setIsMenuOpen(false);
  };

  const handleNewChatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onStartNewChat(bot.id);
    setIsMenuOpen(false);
  };

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    const promptToCopy = "Reply in short, simple messages, just like a human would in a chat.";
    navigator.clipboard.writeText(promptToCopy).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    }, (err) => {
        console.error('Failed to copy prompt: ', err);
    });
    setIsMenuOpen(false);
  };

  const handleOpenSettings = () => {
    setTempBrightness(bot.chatBackgroundBrightness ?? 100);
    setIsSettingsOpen(true);
    setIsMenuOpen(false);
  };
  
  const handleSaveSettings = (newBrightness: number) => {
    onUpdateBot({ ...bot, chatBackgroundBrightness: newBrightness });
  };
  
  const handleSetBackground = useCallback((image: string) => {
    try {
        const updatedBot = { ...bot, chatBackground: image, originalChatBackground: image };
        onUpdateBot(updatedBot);
    } catch(e) {
        console.error("Set background failed", e);
    }
  }, [bot, onUpdateBot]);


  return (
    <div className="h-full w-full flex flex-col bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text relative">
        {photoToView && <PhotoViewer src={photoToView} onClose={() => setPhotoToView(null)} />}
        {showCarousel && (
            <ImageCarousel 
                images={carouselImages} 
                onClose={() => setShowCarousel(false)} 
                onSetBackground={handleSetBackground}
            />
        )}
        {isSettingsOpen && (
            <ChatSettingsModal 
                bot={bot}
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveSettings}
                onBrightnessChange={setTempBrightness}
                tempBrightness={tempBrightness}
            />
        )}
        {bot.chatBackground && (
            <div 
              style={{
                  backgroundImage: `url(${bot.chatBackground})`,
                  filter: `brightness(${isSettingsOpen ? tempBrightness : (bot.chatBackgroundBrightness ?? 100)}%)`
              }} 
              className="fixed inset-0 w-full h-full bg-cover bg-center z-0 opacity-85 max-w-md mx-auto transition-all duration-300" >
                <div className="absolute inset-0 w-full h-full bg-black/50"></div>
            </div>
        )}
      <header className="sticky top-0 flex items-center p-4 border-b border-white/10 dark:border-black/20 z-20 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-sm">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <img src={botAvatar} alt={bot.name} className="h-10 w-10 rounded-lg object-cover ml-4 cursor-pointer" onClick={() => setPhotoToView(botAvatar)} onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40'} />
        <div className="ml-3 flex-1">
          <h2 className="font-bold">{bot.name}</h2>
        </div>
        <div className="text-sm text-gray-400 mr-2">ziaakia</div>
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>
            {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl animate-fadeIn z-30">
                    <a href="#" onClick={handleEditClick} className="block px-4 py-2 text-sm text-white hover:bg-accent rounded-t-lg">Edit Human</a>
                    <a href="#" onClick={handlePersonaClick} className="block px-4 py-2 text-sm text-white hover:bg-accent">Persona</a>
                    <a href="#" onClick={handleOpenSettings} className="block px-4 py-2 text-sm text-white hover:bg-accent">Chat Settings</a>
                    <a href="#" onClick={handleCopyPrompt} className="block px-4 py-2 text-sm text-white hover:bg-accent">{copySuccess ? 'Copied!' : 'Copy Prompt'}</a>
                    <a href="#" onClick={handleNewChatClick} className="block px-4 py-2 text-sm text-white hover:bg-accent rounded-b-lg">Start New Chat</a>
                </div>
            )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-1 z-10">
        {chatHistory.map((msg) => (
            <MessageItem 
                key={msg.id}
                msg={msg}
                botAvatar={botAvatar}
                userAvatar={userAvatar}
                userAvatarAlt={userAvatarAlt}
                deletingMessageId={deletingMessageId}
                copiedMessageId={copiedMessageId}
                onCopy={handleCopyMessage}
                onDelete={handleDeleteMessage}
                onPlay={handlePlayVoice}
                onRegenerate={handleRegenerateMessage}
                setPhotoToView={setPhotoToView}
            />
        ))}

        {isTyping && (
          <div className="flex items-end gap-2 justify-start">
            <img src={botAvatar} alt={bot.name} className="h-10 w-10 rounded-lg object-cover" onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40'} />
            <div className="max-w-xs p-3 rounded-2xl bg-white/10 dark:bg-black/20 rounded-bl-none">
                <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="sticky bottom-0 p-4 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-sm z-20">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative flex items-center gap-2">
          
          <div className="relative flex-1">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(input);
                }
                }}
                placeholder="Type your message..."
                className={`w-full bg-white/10 dark:bg-black/20 p-4 pr-12 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner resize-none ${hasGalleryImages ? 'pl-14' : 'pl-4'}`}
                rows={1}
            />
            
            {/* Gallery Button - LEFT Side */}
            {hasGalleryImages && (
                <button
                    type="button"
                    onClick={() => setShowCarousel(true)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-accent transition-colors z-10"
                    aria-label="Open Gallery"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                </button>
            )}

             {/* Send Button */}
             <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent rounded-full text-white transition-transform hover:scale-110 disabled:opacity-50 z-10"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default ChatView;
