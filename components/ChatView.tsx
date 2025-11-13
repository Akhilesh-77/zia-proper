
import React, { useState, useEffect, useRef } from 'react';
import type { User, BotProfile, ChatMessage, Persona, AIModelOption, VoicePreference } from '../types';
import { generateBotResponse, generateUserResponseSuggestion } from '../services/geminiService';

const PhotoViewer: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
    <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn"
        onClick={onClose}
    >
        <img src={src} alt="Full view" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        <button onClick={onClose} className="absolute top-5 right-5 bg-black/50 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold text-2xl">&times;</button>
    </div>
);

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
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [photoToView, setPhotoToView] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempBrightness, setTempBrightness] = useState(bot.chatBackgroundBrightness ?? 100);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const botAvatar = bot.photo; // Bot avatar is always the bot's own photo.
  const userAvatar = bot.persona?.photo || currentUser.photoUrl; // User avatar uses persona photo if available, otherwise the default user photo.
  const userAvatarAlt = bot.persona?.name || currentUser.name || 'User';

  useEffect(() => {
    // Log session start time on mount and log end time on unmount
    const startTime = Date.now();
    return () => {
      logSession(startTime, bot.id);
    };
  }, [bot.id, logSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);
  
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


  const handlePlayVoice = (text: string) => {
    window.speechSynthesis.cancel(); // Stop any currently playing speech
    const utterance = new SpeechSynthesisUtterance(text);
    if (voicePreference && voices.length > 0) {
        const desiredVoice = voices.find(v => v.name === voicePreference) || 
                             voices.find(v => voicePreference && v.name.toLowerCase().includes(voicePreference)) || // Fallback for old 'male'/'female' setting
                             voices[0];
        utterance.voice = desiredVoice || voices[0];
    }
    window.speechSynthesis.speak(utterance);
  };


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

  const handleCopyMessage = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
    }).catch(err => {
        console.error("Failed to copy message:", err);
    });
  };

  const handleDeleteMessage = (messageId: string) => {
      const newHistory = chatHistory.filter(m => m.id !== messageId);
      onUpdateHistory(newHistory);
  };
  
  const handleRegenerateMessage = async (messageId: string) => {
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
  };

  const parseMessage = (text: string) => {
    if (typeof text !== 'string') {
      console.warn('parseMessage received non-string input:', text);
      return '';
    }
    // This regex splits the text by actions wrapped in single asterisks, keeping the delimiters.
    const parts = text.split(/(\*.*?\*)/g);
    return parts.map((part, index) => {
      // If a part is an action (e.g., "*smiles*"), render it as blue, italic text without the asterisks.
      if (part.startsWith('*') && part.endsWith('*')) {
        return <span key={index} className="text-accent italic">{part.slice(1, -1)}</span>;
      }
      // Otherwise, render the part as plain text (dialogue, spaces, etc.).
      return part;
    });
  };
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onEdit(bot.id);
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

  const handleScrollToTop = () => {
    messagesStartRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  return (
    <div className="h-full w-full flex flex-col bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text relative animate-fadeIn">
        {photoToView && <PhotoViewer src={photoToView} onClose={() => setPhotoToView(null)} />}
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
        <img src={botAvatar} alt={bot.name} className="h-10 w-10 rounded-lg object-cover ml-4 cursor-pointer" onClick={() => setPhotoToView(botAvatar)} />
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
                    <a href="#" onClick={handleOpenSettings} className="block px-4 py-2 text-sm text-white hover:bg-accent">Chat Settings</a>
                    <a href="#" onClick={handleCopyPrompt} className="block px-4 py-2 text-sm text-white hover:bg-accent">{copySuccess ? 'Copied!' : 'Copy Prompt'}</a>
                    <a href="#" onClick={handleNewChatClick} className="block px-4 py-2 text-sm text-white hover:bg-accent rounded-b-lg">Start New Chat</a>
                </div>
            )}
        </div>
      </header>
      
      <button
        onClick={handleScrollToTop}
        className="absolute top-20 right-4 z-20 bg-black/40 text-white rounded-full h-10 w-10 flex items-center justify-center shadow-lg backdrop-blur-sm hover:bg-black/60 transition-all opacity-50 hover:opacity-100"
        aria-label="Scroll to top"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
        </svg>
      </button>

      <main className="flex-1 overflow-y-auto p-4 space-y-1 z-10">
        <div ref={messagesStartRef} />
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 group ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'bot' && <img src={botAvatar} alt={bot.name} className="h-10 w-10 rounded-lg object-cover self-start cursor-pointer" onClick={() => setPhotoToView(botAvatar)} />}
            
            <div className={`flex items-center gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-white/10 dark:bg-black/20 rounded-bl-none'}`}>
                    <p className="whitespace-pre-wrap">{parseMessage(msg.text)}</p>
                </div>
                 {msg.sender === 'user' && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleCopyMessage(msg.text, msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-accent">
                            {copiedMessageId === msg.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                        </button>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                )}
                {msg.sender === 'bot' && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handlePlayVoice(msg.text)} className="p-1 rounded-full bg-black/30 hover:bg-accent"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.108 12 5v14c0 .892-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
                        <button onClick={() => handleRegenerateMessage(msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-accent"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></button>
                    </div>
                )}
            </div>

            {msg.sender === 'user' && <img src={userAvatar} alt={userAvatarAlt} className="h-10 w-10 rounded-lg object-cover self-start cursor-pointer" onClick={() => setPhotoToView(userAvatar)} />}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2 justify-start">
            <img src={botAvatar} alt={bot.name} className="h-10 w-10 rounded-lg object-cover" />
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
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative">
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
            className="w-full bg-white/10 dark:bg-black/20 p-4 pr-14 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner resize-none"
            rows={1}
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-accent rounded-full text-white transition-transform hover:scale-110 disabled:opacity-50"
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7 7 7-7 7" /></svg>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatView;
