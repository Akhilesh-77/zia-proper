import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import BotsPage from './components/BotsPage';
import CreationForm from './components/CreationForm';
import ChatView from './components/ChatView';
import PersonasPage from './components/PersonasPage';
import ImageGeneratorPage from './components/ImageGeneratorPage';
import ScenarioGeneratorPage from './components/ScenarioGeneratorPage';
import FooterNav from './components/FooterNav';
import SettingsPanel from './components/SettingsPanel';
import type { User, BotProfile, Persona, ChatMessage, AIModelOption, VoicePreference } from './types';
import { loadUserData, saveUserData, clearUserData } from './services/storageService';

export type Page = 'home' | 'humans' | 'create' | 'images' | 'personas' | 'chat' | 'story';

// A default user object for the login-free experience
const defaultUser: User = {
  id: 'local-user',
  name: 'User',
  email: 'local@user.com',
  photoUrl: `https://i.pravatar.cc/150?u=localuser`,
};


const App: React.FC = () => {
  // App State
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [botToEdit, setBotToEdit] = useState<BotProfile | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [botUsage, setBotUsage] = useState<Record<string, number>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedAI, setSelectedAI] = useState<AIModelOption>('gemini-2.5-flash');
  const [voicePreference, setVoicePreference] = useState<VoicePreference | null>(null);
  const [hasConsented, setHasConsented] = useState<boolean>(false);

  // Load all data from storage on initial app load
  useEffect(() => {
    const loadData = async () => {
      const data = await loadUserData();
      if (data) {
        setBots(data.bots || []);
        setPersonas(data.personas || []);
        setChatHistories(data.chatHistories || {});
        setBotUsage(data.botUsage || {});
        setTheme(data.theme || 'dark');
        setSelectedAI(data.selectedAI || 'gemini-2.5-flash');
        setVoicePreference(data.voicePreference || null);
        setHasConsented(data.hasConsented || false);
      }
    };
    loadData();
  }, []);

  // Save data to storage whenever it changes
  useEffect(() => {
    const dataToSave = {
      bots,
      personas,
      chatHistories,
      botUsage,
      theme,
      selectedAI,
      voicePreference,
      hasConsented,
    };
    // The initial empty state should not overwrite saved data.
    // This check prevents clearing storage on the very first render.
    if (bots.length > 0 || personas.length > 0 || Object.keys(botUsage).length > 0) {
       saveUserData(dataToSave);
    }
  }, [bots, personas, chatHistories, botUsage, theme, selectedAI, voicePreference, hasConsented]);

  // Update document theme
  useEffect(() => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  const handleNavigate = (page: Page) => {
    if ((page === 'create' || page === 'humans') && !hasConsented) {
        alert("Please agree to the disclaimer in the settings to continue.");
        setIsSettingsOpen(true);
        return;
    }
    if (page === 'create') {
        setBotToEdit(null);
    }
    setCurrentPage(page);
  };
  
  const handleSelectBot = (id: string) => {
    if (!hasConsented) {
        alert("Please agree to the disclaimer in the settings to continue.");
        setIsSettingsOpen(true);
        return;
    }
    
    if (!chatHistories[id] || chatHistories[id].length === 0) {
      const bot = bots.find(b => b.id === id);
      if (bot) {
        const openingMessage = bot.scenario || `Hello! I'm ${bot.name}. Let's chat.`;
        const initialMessage: ChatMessage = {
          id: `bot-initial-${Date.now()}`,
          text: openingMessage,
          sender: 'bot',
          timestamp: Date.now(),
        };
        setChatHistories(prev => ({ ...prev, [id]: [initialMessage] }));
      }
    }
    setSelectedBotId(id);
    setBotUsage(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setCurrentPage('chat');
  };

  const handleEditBot = (id: string) => {
    const bot = bots.find(b => b.id === id);
    if (bot) {
        setBotToEdit(bot);
        setCurrentPage('create');
    }
  };

  const handleDeleteBot = (id: string) => {
    if (window.confirm("Are you sure you want to delete this Human?")) {
        setBots(prev => prev.filter(b => b.id !== id));
        setChatHistories(prev => {
            const newHistories = { ...prev };
            delete newHistories[id];
            return newHistories;
        });
    }
  };

  const handleCloneBot = (id: string) => {
    const botToClone = bots.find(b => b.id === id);
    if (botToClone) {
        if (window.confirm(`Are you sure you want to clone "${botToClone.name}"?`)) {
            const newBot: BotProfile = {
                ...botToClone,
                id: `bot-${Date.now()}`,
                name: `${botToClone.name} (Clone)`,
            };
            setBots(prev => [newBot, ...prev]);
            setBotToEdit(newBot);
            setCurrentPage('create');
        }
    }
  };

  const handleSaveBot = (botData: Omit<BotProfile, 'id'> | BotProfile) => {
    if ('id' in botData) {
      setBots(prev => prev.map(b => b.id === botData.id ? { ...b, ...botData } : b));
    } else {
      const newBot = { ...botData, id: `bot-${Date.now()}` };
      setBots(prev => [...prev, newBot]);
    }
    setBotToEdit(null);
  };
  
  const handleSavePersona = (personaData: Omit<Persona, 'id'> | Persona) => {
    if ('id' in personaData) {
        setPersonas(prev => prev.map(p => p.id === personaData.id ? { ...p, ...personaData } : p));
    } else {
        const newPersona = { ...personaData, id: `persona-${Date.now()}`};
        setPersonas(prev => [...prev, newPersona]);
    }
  };

  const handleDeletePersona = (id: string) => {
    if (window.confirm("Are you sure you want to delete this persona? This will not affect Humans currently using it, but they will no longer be linked.")) {
        setPersonas(prev => prev.filter(p => p.id !== id));
        setBots(prev => prev.map(b => b.personaId === id ? { ...b, personaId: null } : b));
    }
  };
  
  const handleAssignPersona = (personaId: string, botIds: string[]) => {
      setBots(prevBots => prevBots.map(bot => {
          // If this bot is in the list to be assigned, set its personaId.
          if (botIds.includes(bot.id)) {
              return { ...bot, personaId };
          }
          // If this bot PREVIOUSLY had this personaId but is now unselected, clear it.
          if (bot.personaId === personaId && !botIds.includes(bot.id)) {
              return { ...bot, personaId: null };
          }
          // Otherwise, leave the bot as is.
          return bot;
      }));
  };

  const handleNewMessage = (botId: string, message: ChatMessage) => {
    setChatHistories(prev => ({
        ...prev,
        [botId]: [...(prev[botId] || []), message]
    }));
  };
  
  const handleUpdateHistory = (botId: string, newHistory: ChatMessage[]) => {
    setChatHistories(prev => ({
      ...prev,
      [botId]: newHistory,
    }));
  };

  const handleStartNewChat = (botId: string) => {
    if (window.confirm("Are you sure you want to start a new chat? The current history will be deleted.")) {
      setChatHistories(prev => {
        const bot = bots.find(b => b.id === botId);
        const newHistory = bot?.scenario 
          ? [{ id: `bot-reset-${Date.now()}`, text: bot.scenario, sender: 'bot' as const, timestamp: Date.now() }] 
          : [];
        return { ...prev, [botId]: newHistory };
      });
    }
  };

  const handleClearData = async () => {
      if (window.confirm("Are you sure you want to delete all your Humans, personas, and chat history? This cannot be undone.")) {
        await clearUserData();
        // Reset state locally as well
        setBots([]);
        setPersonas([]);
        setChatHistories({});
        setBotUsage({});
      }
  };

  const handleConsentChange = (agreed: boolean) => {
    setHasConsented(agreed);
  };

  const selectedBot = bots.find(b => b.id === selectedBotId);
  const personaForBot = personas.find(p => p.id === selectedBot?.personaId);
  
  const effectiveBot = selectedBot ? {
      ...selectedBot,
      // If a persona is assigned, combine the bot's base personality with the persona's personality.
      // Otherwise, just use the bot's base personality.
      personality: personaForBot
        ? `${selectedBot.personality}\n\n# PERSONA OVERLAY\n${personaForBot.personality}`
        : selectedBot.personality,
      persona: personaForBot
  } : null;

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return <HomePage 
                    bots={bots} 
                    botUsage={botUsage}
                    onSelectBot={handleSelectBot} 
                    onEditBot={handleEditBot}
                    onDeleteBot={handleDeleteBot}
                    onCloneBot={handleCloneBot}
                    theme={theme}
                    toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                />;
      case 'humans':
        return <BotsPage bots={bots} onSelectBot={handleSelectBot} onEditBot={handleEditBot} onDeleteBot={handleDeleteBot} onCloneBot={handleCloneBot} />;
      case 'create':
        return <CreationForm onSaveBot={handleSaveBot} onNavigate={handleNavigate} botToEdit={botToEdit} />;
      case 'images':
        return <ImageGeneratorPage />;
      case 'story':
        return <ScenarioGeneratorPage bots={bots} selectedAI={selectedAI} />;
      case 'personas':
        return <PersonasPage personas={personas} bots={bots} onSave={handleSavePersona} onDelete={handleDeletePersona} onAssign={handleAssignPersona} />;
      case 'chat':
        if (effectiveBot) {
          return <ChatView 
                    bot={effectiveBot} 
                    onBack={() => setCurrentPage('home')}
                    chatHistory={chatHistories[effectiveBot.id] || []}
                    onNewMessage={(message) => handleNewMessage(effectiveBot.id, message)}
                    onUpdateHistory={(newHistory) => handleUpdateHistory(effectiveBot.id, newHistory)}
                    onUpdateBot={handleSaveBot}
                    selectedAI={selectedAI}
                    voicePreference={voicePreference}
                    onEdit={handleEditBot}
                    onStartNewChat={handleStartNewChat}
                    currentUser={defaultUser}
                 />;
        }
        setCurrentPage('home');
        return null;
      default:
        return null;
    }
  };

  return (
    <div className={`w-full h-full max-w-md mx-auto flex flex-col font-sans shadow-2xl overflow-hidden relative ${theme}`}>
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        theme={theme}
        toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        onClearData={handleClearData}
        selectedAI={selectedAI}
        onSelectAI={setSelectedAI}
        voicePreference={voicePreference}
        onSetVoicePreference={setVoicePreference}
        hasConsented={hasConsented}
        onConsentChange={handleConsentChange}
      />
      <div className="flex-1 overflow-hidden">
        {renderPage()}
      </div>
      {currentPage !== 'chat' && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md">
            <FooterNav currentPage={currentPage} onNavigate={handleNavigate} />
        </div>
      )}
    </div>
  );
};

export default App;