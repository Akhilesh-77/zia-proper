import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './components/HomePage';
import BotsPage from './components/BotsPage';
import CreationForm from './components/CreationForm';
import ChatView from './components/ChatView';
import PersonasPage from './components/PersonasPage';
import ImageGeneratorPage from './components/ImageGeneratorPage';
import ScenarioGeneratorPage from './components/ScenarioGeneratorPage';
import FooterNav from './components/FooterNav';
import SettingsPanel from './components/SettingsPanel';
import ExitConfirmationModal from './components/ExitConfirmationModal'; // Import the new component
import type { User, BotProfile, Persona, ChatMessage, AIModelOption, VoicePreference } from './types';
import { loadUserData, saveUserData, clearUserData } from './services/storageService';

export type Page = 'home' | 'humans' | 'create' | 'images' | 'personas' | 'chat' | 'story';

interface AppState {
  page: Page;
  selectedBotId?: string;
  botToEditId?: string;
}

// A default user object for the login-free experience
const defaultUser: User = {
  id: 'local-user',
  name: 'User',
  email: 'local@user.com',
  photoUrl: `https://i.pravatar.cc/150?u=localuser`,
};


const App: React.FC = () => {
  // App State
  const [appState, setAppState] = useState<AppState>({ page: 'home' });
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [botUsage, setBotUsage] = useState<Record<string, number>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedAI, setSelectedAI] = useState<AIModelOption>('gemini-2.5-flash');
  const [voicePreference, setVoicePreference] = useState<VoicePreference | null>(null);
  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // --- Navigation Logic ---
  const navigate = useCallback((newState: Partial<AppState>, replace = false) => {
    const finalState = { ...appState, ...newState };
    
    // Construct a URL hash for the new state
    let hash = `#/${finalState.page}`;
    if (finalState.page === 'chat' && finalState.selectedBotId) {
        hash += `/${finalState.selectedBotId}`;
    } else if (finalState.page === 'create' && finalState.botToEditId) {
        hash += `/${finalState.botToEditId}`;
    }

    // Use pushState to add to history, or replaceState for non-history changes
    if (replace) {
        window.history.replaceState(finalState, '', hash);
    } else if (window.location.hash !== hash) {
        window.history.pushState(finalState, '', hash);
    }

    setAppState(finalState);
  }, [appState]);

  // Effect to handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        setAppState(event.state);
      } else {
        // This means we've gone back to before the app's first history entry.
        // On mobile, this would close the app. We intercept it to show a confirmation.
        setShowExitModal(true);
        // CRITICAL: We push the current state back onto the history stack.
        // This "cancels" the back navigation and prevents the app from closing
        // until the user confirms in the modal.
        window.history.pushState(appState, '', window.location.hash);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [appState]);

  // Effect for initial app load and routing from URL
  useEffect(() => {
    const hash = window.location.hash;
    const parts = hash.replace('#/', '').split('/');
    const page = (parts[0] || 'home') as Page;
    const param = parts[1];
    
    let initialState: AppState = { page: 'home' };
    
    if (page === 'chat' && param) {
      initialState = { page: 'chat', selectedBotId: param };
    } else if (page === 'create' && param) {
      initialState = { page: 'create', botToEditId: param };
    } else if (page) {
      initialState = { page: page };
    }
    
    setAppState(initialState);
    // Use replaceState to set the initial history entry correctly.
    window.history.replaceState(initialState, '');

  }, []);


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
    const newState: Partial<AppState> = { page };
    if (page === 'create') {
        newState.botToEditId = undefined; // Clear any editing state
    }
    navigate(newState);
  };
  
  const handleSelectBot = (id: string) => {
    if (!hasConsented) {
        alert("Please agree to the disclaimer in the settings to continue.");
        setIsSettingsOpen(true);
        return;
    }
    
    if (!chatHistories[id] || chatHistories[id].length === 0) {
      const bot = bots.find(b => b.id === id);
      if (bot && bot.scenario) {
        const initialMessage: ChatMessage = {
          id: `bot-initial-${Date.now()}`,
          text: bot.scenario,
          sender: 'bot',
          timestamp: Date.now(),
        };
        setChatHistories(prev => ({ ...prev, [id]: [initialMessage] }));
      }
    }
    setBotUsage(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    navigate({ page: 'chat', selectedBotId: id });
  };

  const handleEditBot = (id: string) => {
    navigate({ page: 'create', botToEditId: id });
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
            navigate({ page: 'create', botToEditId: newBot.id });
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
    navigate({ page: 'humans' });
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
          if (botIds.includes(bot.id)) return { ...bot, personaId };
          if (bot.personaId === personaId && !botIds.includes(bot.id)) return { ...bot, personaId: null };
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
        setBots([]);
        setPersonas([]);
        setChatHistories({});
        setBotUsage({});
      }
  };

  const handleConsentChange = (agreed: boolean) => {
    setHasConsented(agreed);
  };

  const selectedBot = bots.find(b => b.id === appState.selectedBotId);
  const botToEdit = bots.find(b => b.id === appState.botToEditId);
  const personaForBot = personas.find(p => p.id === selectedBot?.personaId);
  
  const effectiveBot = selectedBot ? {
      ...selectedBot,
      personality: personaForBot
        ? `${selectedBot.personality}\n\n# PERSONA OVERLAY\n${personaForBot.personality}`
        : selectedBot.personality,
      persona: personaForBot
  } : null;

  const renderPage = () => {
    switch(appState.page) {
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
        return <CreationForm onSaveBot={handleSaveBot} onNavigate={page => navigate({ page })} botToEdit={botToEdit || null} />;
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
                    onBack={() => window.history.back()}
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
        navigate({ page: 'home' });
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
      <ExitConfirmationModal
        isOpen={showExitModal}
        onConfirm={() => window.close()}
        onCancel={() => setShowExitModal(false)}
      />
      <div className="flex-1 overflow-hidden">
        {renderPage()}
      </div>
      {appState.page !== 'chat' && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md">
            <FooterNav currentPage={appState.page} onNavigate={handleNavigate} />
        </div>
      )}
    </div>
  );
};

export default App;
