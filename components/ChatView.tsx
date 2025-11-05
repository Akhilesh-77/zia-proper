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
  currentUser: User | null;
}

const ChatView: React.FC<ChatViewProps> = ({ bot, onBack, chatHistory, onNewMessage, onUpdateHistory, onUpdateBot, selectedAI, voicePreference, onEdit, onStartNewChat, currentUser }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [photoToView, setPhotoToView] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempBrightness, setTempBrightness] = useState(bot.chatBackgroundBrightness ?? 100);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const botAvatar = bot.photo; // Bot avatar is always the bot's own photo.
  const userAvatar = bot.persona?.photo || currentUser?.photoUrl; // User avatar uses persona photo if available, otherwise the default user photo.
  const userAvatarAlt = bot.persona?.name || currentUser?.name || 'User';

  useEffect(() => {
    // This logic has been moved to App.tsx's handleStartNewChat and initial load to be more reliable.
    // The useEffect below handles scrolling to the bottom when history changes.
  }, []);

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
  
  const handleBuildMessage = async () => {
      setIsTyping(true);
      const suggestion = await generateUserResponseSuggestion(chatHistory, bot.personality, selectedAI);
      setInput(suggestion);
      setIsTyping(false);
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

  const handleOpenSettings = () => {
    setTempBrightness(bot.chatBackgroundBrightness ?? 100);
    setIsSettingsOpen(true);
    setIsMenuOpen(false);
  };
  
  const handleSaveSettings = (newBrightness: number) => {
    onUpdateBot({ ...bot, chatBackgroundBrightness: newBrightness });
  };

  return (
    <div className="h-full w-full flex flex-col bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text relative">
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
                    <a href="#" onClick={handleNewChatClick} className="block px-4 py-2 text-sm text-white hover:bg-accent rounded-b-lg">Start New Chat</a>
                </div>
            )}
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 space-y-1 z-10">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 group ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'bot' && <img src={botAvatar} alt={bot.name} className="h-10 w-10 rounded-lg object-cover self-start cursor-pointer" onClick={() => setPhotoToView(botAvatar)} />}
            
            <div className={`flex items-center gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-white/10 dark:bg-black/20 rounded-bl-none'}`}>
                    <p className="whitespace-pre-wrap">{parseMessage(msg.text)}</p>
                </div>
                 {msg.sender === 'user' && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                )}
                {msg.sender === 'bot' && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handlePlayVoice(msg.text)} className="p-1 rounded-full bg-black/30 hover:bg-accent"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
                        <button onClick={() => handleRegenerateMessage(msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-accent"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 15M20 20l-1.5-1.5A9 9 0 013.5 9" /></svg></button>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                )}
            </div>
            {msg.sender === 'user' && userAvatar && <img src={userAvatar} alt={userAvatarAlt} className="h-10 w-10 rounded-lg object-cover self-start cursor-pointer" onClick={() => setPhotoToView(userAvatar)} />}
          </div>
        ))}
        {isTyping && (
            <div className="flex items-end gap-2 justify-start">
                <img src={botAvatar} alt={bot.name} className="h-10 w-10 rounded-lg object-cover" />
                <div className="p-3 rounded-2xl bg-white/10 dark:bg-black/20 rounded-bl-none">
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 border-t border-white/10 dark:border-black/20 z-20 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-sm">
        <div className="flex items-center bg-white/10 dark:bg-black/20 rounded-2xl pl-2">
          <button onClick={handleBuildMessage} disabled={isTyping} className="p-2 text-gray-400 hover:text-accent disabled:opacity-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 bg-transparent p-3 focus:outline-none resize-none max-h-24"
          />
          <button onClick={() => handleSend(input)} disabled={isTyping || !input.trim()} className="bg-accent rounded-full h-10 w-10 flex items-center justify-center text-white disabled:opacity-50 transition-all transform hover:scale-110 mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatView;