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
import type { BotProfile, Persona, ChatMessage, AIModelOption, VoicePreference } from './types';

export type Page = 'home' | 'bots' | 'create' | 'images' | 'personas' | 'chat' | 'scenario';

const App: React.FC = () => {
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

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      const savedBots = localStorage.getItem('bots');
      if (savedBots) setBots(JSON.parse(savedBots));
      
      const savedPersonas = localStorage.getItem('personas');
      if (savedPersonas) setPersonas(JSON.parse(savedPersonas));
      
      const savedHistories = localStorage.getItem('chatHistories');
      if (savedHistories) setChatHistories(JSON.parse(savedHistories));

      const savedUsage = localStorage.getItem('botUsage');
      if (savedUsage) setBotUsage(JSON.parse(savedUsage));

      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
      } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDark ? 'dark' : 'light');
      }

      const savedAI = localStorage.getItem('selectedAI');
      const availableModels: AIModelOption[] = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
      if (savedAI && availableModels.includes(savedAI as AIModelOption)) {
          setSelectedAI(savedAI as AIModelOption);
      }
      
      const savedVoice = localStorage.getItem('voicePreference');
      if (savedVoice) {
          setVoicePreference(savedVoice as VoicePreference);
      }

      const savedConsent = localStorage.getItem('hasConsented');
      if (savedConsent) {
          setHasConsented(JSON.parse(savedConsent));
      }

    } catch (error) {
        console.error("Failed to load data from localStorage", error);
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
        localStorage.setItem('bots', JSON.stringify(bots));
        localStorage.setItem('personas', JSON.stringify(personas));
        localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
        localStorage.setItem('botUsage', JSON.stringify(botUsage));
        localStorage.setItem('theme', theme);
        localStorage.setItem('selectedAI', selectedAI);
        if(voicePreference) {
            localStorage.setItem('voicePreference', voicePreference);
        } else {
            localStorage.removeItem('voicePreference');
        }
        localStorage.setItem('hasConsented', JSON.stringify(hasConsented));


        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    } catch (error) {
        console.error("Failed to save data to localStorage", error);
    }
  }, [bots, personas, chatHistories, botUsage, theme, selectedAI, voicePreference, hasConsented]);

  const handleNavigate = (page: Page) => {
    if ((page === 'create') && !hasConsented) {
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
        setChatHistories(prev => ({
          ...prev,
          [id]: [initialMessage],
        }));
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
    if (window.confirm("Are you sure you want to delete this bot?")) {
        setBots(prev => prev.filter(b => b.id !== id));
        setChatHistories(prev => {
            const newHistories = { ...prev };
            delete newHistories[id];
            return newHistories;
        });
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
    if (window.confirm("Are you sure you want to delete this persona? This will not affect bots currently using it, but they will no longer be linked.")) {
        setPersonas(prev => prev.filter(p => p.id !== id));
        setBots(prev => prev.map(b => b.personaId === id ? { ...b, personaId: null } : b));
    }
  };
  
  const handleAssignPersona = (personaId: string, botIds: string[]) => {
      const persona = personas.find(p => p.id === personaId);
      if (!persona) return;
      
      setBots(prevBots => prevBots.map(bot => {
          if (botIds.includes(bot.id)) {
              return { ...bot, personaId: persona.id, personality: persona.personality };
          }
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

  const handleClearData = () => {
      if (window.confirm("Are you sure you want to delete all your bots, personas, and chat history? This cannot be undone.")) {
        setBots([]);
        setPersonas([]);
        setChatHistories({});
        setBotUsage({});
        localStorage.removeItem('bots');
        localStorage.removeItem('personas');
        localStorage.removeItem('chatHistories');
        localStorage.removeItem('botUsage');
      }
  };

  const handleConsentChange = (agreed: boolean) => {
    setHasConsented(agreed);
  };

  const selectedBot = bots.find(b => b.id === selectedBotId);
  const personaForBot = personas.find(p => p.id === selectedBot?.personaId);
  
  const effectiveBot = selectedBot ? {
      ...selectedBot,
      personality: personaForBot?.personality || selectedBot.personality,
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
                    theme={theme}
                    toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                />;
      case 'bots':
        return <BotsPage bots={bots} onSelectBot={handleSelectBot} onEditBot={handleEditBot} onDeleteBot={handleDeleteBot} />;
      case 'create':
        return <CreationForm onSaveBot={handleSaveBot} onNavigate={handleNavigate} botToEdit={botToEdit} />;
      case 'images':
        return <ImageGeneratorPage />;
      case 'scenario':
        return <ScenarioGeneratorPage personas={personas} selectedAI={selectedAI} />;
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
                    selectedAI={selectedAI}
                    voicePreference={voicePreference}
                    onEdit={handleEditBot}
                    onStartNewChat={handleStartNewChat}
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