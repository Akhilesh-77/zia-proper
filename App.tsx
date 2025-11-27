
import React, { useState, useEffect, useCallback, useRef } from 'react';
import HomePage from './components/HomePage';
import BotsPage from './components/BotsPage';
import CreationForm from './components/CreationForm';
import ChatView from './components/ChatView';
import PersonasPage from './components/PersonasPage';
import ImageGeneratorPage from './components/ImageGeneratorPage';
import ScenarioGeneratorPage from './components/ScenarioGeneratorPage';
import CodePromptGeneratorPage from './components/CodePromptGeneratorPage';
import StatsDashboard from './components/StatsDashboard';
import RecycleBinPage from './components/RecycleBinPage';
import FooterNav from './components/FooterNav';
import SettingsPanel from './components/SettingsPanel';
import ExitConfirmationModal from './components/ExitConfirmationModal';
import type { User, BotProfile, Persona, ChatMessage, AIModelOption, VoicePreference, ChatSession } from './types';
import { migrateData, loadUserData, saveUserData, clearUserData } from './services/storageService';

export type Page = 'home' | 'humans' | 'create' | 'images' | 'personas' | 'chat' | 'story' | 'code' | 'stats' | 'bin';

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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedAI, setSelectedAI] = useState<AIModelOption>('gemini-2.5-flash');
  const [voicePreference, setVoicePreference] = useState<VoicePreference | null>(null);
  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  
  // Recycle Bin State
  const [deletedBots, setDeletedBots] = useState<BotProfile[]>([]);
  const [deletedPersonas, setDeletedPersonas] = useState<Persona[]>([]);

  // Exit Confirmation
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const backPressTime = useRef<number>(0);

  // Track the previous valid hash to return to after closing settings
  const lastHash = useRef<string>('');

  // Load all data from storage on initial app load and migrate if necessary
  useEffect(() => {
    const loadAndMigrate = async () => {
      await migrateData();
      const data = await loadUserData();
      if (data) {
        setBots(data.bots || []);
        setPersonas(data.personas || []);
        setChatHistories(data.chatHistories || {});
        setBotUsage(data.botUsage || {});
        setSessions(data.sessions || []);
        setTheme(data.theme || 'dark');
        setSelectedAI(data.selectedAI || 'gemini-2.5-flash');
        setVoicePreference(data.voicePreference || null);
        setHasConsented(data.hasConsented || false);
        setDeletedBots(data.deletedBots || []);
        setDeletedPersonas(data.deletedPersonas || []);
      }
      setIsDataLoaded(true);
    };
    loadAndMigrate();
  }, []);

  // Save individual pieces of data to storage when they change
  useEffect(() => { if (isDataLoaded) saveUserData({ bots }); }, [bots, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveUserData({ personas }); }, [personas, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveUserData({ chatHistories }); }, [chatHistories, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveUserData({ botUsage }); }, [botUsage, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveUserData({ sessions }); }, [sessions, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveUserData({ theme }); }, [theme, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveUserData({ selectedAI }); }, [selectedAI, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveUserData({ voicePreference }); }, [voicePreference, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveUserData({ hasConsented }); }, [hasConsented, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveUserData({ deletedBots }); }, [deletedBots, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveUserData({ deletedPersonas }); }, [deletedPersonas, isDataLoaded]);

  // Persist ephemeral navigation state to sessionStorage for deep linking
  useEffect(() => {
    if (selectedBotId) sessionStorage.setItem('selectedBotId', selectedBotId);
  }, [selectedBotId]);

  useEffect(() => {
    if (botToEdit) sessionStorage.setItem('editingBotId', botToEdit.id);
  }, [botToEdit]);

  // Update document theme
  useEffect(() => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // --- HASH ROUTING LOGIC ---
  useEffect(() => {
    if (!isDataLoaded) return;

    const handleHashChange = () => {
      const hash = window.location.hash;

      // Manage Settings Overlay
      if (hash === '#settings') {
        setIsSettingsOpen(true);
        // Do not update currentPage, keep the background view
        return; 
      } else {
        setIsSettingsOpen(false);
        if (hash) lastHash.current = hash; // Update last known valid page hash
      }

      switch (hash) {
        case '#home':
          setCurrentPage('home');
          break;
        case '#chatview':
          // Attempt to restore session if state is lost on reload
          if (!selectedBotId) {
             const storedId = sessionStorage.getItem('selectedBotId');
             // Validate ID exists in current bots
             if (storedId && bots.some(b => b.id === storedId)) {
                 setSelectedBotId(storedId);
                 setCurrentPage('chat');
             } else {
                 // Invalid or missing ID, fallback to home
                 window.location.hash = '#home';
             }
          } else {
             setCurrentPage('chat');
          }
          break;
        case '#create':
          // Explicitly clear edit state only if navigating to 'new' create page is intended
          // However, we handle the clearing in the handleNavigate function to allow
          // history navigation (back button) to preserve form state if desired.
          setCurrentPage('create');
          break;
        case '#edit':
          if (!botToEdit) {
             const storedId = sessionStorage.getItem('editingBotId');
             const bot = bots.find(b => b.id === storedId);
             if (bot) {
                 setBotToEdit(bot);
                 setCurrentPage('create'); // Uses CreationForm
             } else {
                 // Clone or Edit state lost
                 window.location.hash = '#home';
             }
          } else {
             setCurrentPage('create');
          }
          break;
        case '#humans':
          setCurrentPage('humans');
          break;
        case '#images':
          setCurrentPage('images');
          break;
        case '#story':
          setCurrentPage('story');
          break;
        case '#code':
          setCurrentPage('code');
          break;
        case '#stats':
          setCurrentPage('stats');
          break;
        case '#persona':
          setCurrentPage('personas');
          break;
        case '#bin':
          setCurrentPage('bin');
          break;
        default:
          // Default route
          if (!hash) {
             window.location.hash = '#home';
          }
          break;
      }
    };

    // Listen for changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Check initial hash on load
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isDataLoaded, bots, selectedBotId, botToEdit]);

  // --- EXIT CONFIRMATION LOGIC ---
  useEffect(() => {
      // 1. Intercept Back Button on Home Page
      const onPopState = (event: PopStateEvent) => {
          if (currentPage === 'home' && !isSettingsOpen) {
               // Prevent navigation
               event.preventDefault(); 
               
               // Show confirmation modal
               setShowExitConfirm(true);
               
               // Push state again so we stay on "home" URL-wise effectively
               window.history.pushState(null, '', '#home');
          }
      };

      // Push initial state to allow interception
      if (currentPage === 'home' && !isSettingsOpen) {
          window.history.pushState(null, '', '#home');
      }

      window.addEventListener('popstate', onPopState);

      // 2. Intercept Tab/Window Close
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
          // Standard way to trigger browser confirmation
          e.preventDefault();
          e.returnValue = ''; 
          return '';
      };
      window.addEventListener('beforeunload', onBeforeUnload);

      return () => {
          window.removeEventListener('popstate', onPopState);
          window.removeEventListener('beforeunload', onBeforeUnload);
      };
  }, [currentPage, isSettingsOpen]);

  const handleConfirmExit = () => {
      // Logic to actually "exit" or close
      // On mobile web/PWA, window.close() scripts may be blocked,
      // but we can try history.back() multiple times or standard close.
      window.close(); 
      // Fallback
      window.history.go(-2);
  };
  
  const handleNavigate = useCallback((page: Page) => {
    if ((page === 'create' || page === 'humans') && !hasConsented) {
        alert("Please agree to the disclaimer in the settings to continue.");
        window.location.hash = '#settings';
        return;
    }
    
    if (page === 'create') {
        setBotToEdit(null); // Clear edit state for a fresh form
        sessionStorage.removeItem('editingBotId');
        window.location.hash = '#create';
    } else {
        const hash = {
            'home': '#home',
            'humans': '#humans',
            'images': '#images',
            'personas': '#persona',
            'chat': '#chatview',
            'story': '#story',
            'code': '#code',
            'stats': '#stats',
            'bin': '#bin'
        }[page];
        if (hash) window.location.hash = hash;
    }
  }, [hasConsented]);
  
  const handleSelectBot = useCallback((id: string) => {
    if (!hasConsented) {
        alert("Please agree to the disclaimer in the settings to continue.");
        window.location.hash = '#settings';
        return;
    }
    
    setChatHistories(prev => {
        if (!prev[id] || prev[id].length === 0) {
            const bot = bots.find(b => b.id === id);
            if (bot) {
                const openingMessage = bot.scenario || `Hello! I'm ${bot.name}. Let's chat.`;
                const initialMessage: ChatMessage = {
                    id: `bot-initial-${Date.now()}`,
                    text: openingMessage,
                    sender: 'bot',
                    timestamp: Date.now(),
                };
                return { ...prev, [id]: [initialMessage] };
            }
        }
        return prev;
    });
    
    setSelectedBotId(id);
    setBotUsage(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    // Update hash to trigger routing
    window.location.hash = '#chatview';
  }, [hasConsented, bots]);

  const handleEditBot = useCallback((id: string) => {
    const bot = bots.find(b => b.id === id);
    if (bot) {
        setBotToEdit(bot);
        window.location.hash = '#edit';
    }
  }, [bots]);

  const handleDeleteBot = useCallback((id: string) => {
    const botToDelete = bots.find(b => b.id === id);
    if (botToDelete) {
        if (window.confirm("Are you sure you want to delete this Human? It will be moved to the Bin.")) {
            // Move to deleted bots
            setDeletedBots(prev => [...prev, botToDelete]);
            // Remove from active bots
            setBots(prev => prev.filter(b => b.id !== id));
            // Keep chat history in case of restore
        }
    }
  }, [bots]);

  const handleCloneBot = useCallback((id: string) => {
    const botToClone = bots.find(b => b.id === id);
    if (botToClone) {
        if (window.confirm(`Are you sure you want to clone "${botToClone.name}"?`)) {
            const newBot: BotProfile = {
                ...botToClone,
                id: `bot-${Date.now()}`, // Generate new ID immediately
                name: `${botToClone.name} (Clone)`,
            };
            // Note: We don't add to 'bots' state yet, user must save in form.
            setBotToEdit(newBot);
            // Use #edit hash to indicate we are editing a specific profile (even if transient)
            window.location.hash = '#edit';
        }
    }
  }, [bots]);

  const handleSaveBot = useCallback((botData: Omit<BotProfile, 'id'> | BotProfile) => {
    if ('id' in botData) {
      setBots(prev => prev.map(b => b.id === botData.id ? { ...b, ...botData } : b));
    } else {
      const newBot = { ...botData, id: `bot-${Date.now()}` };
      setBots(prev => [...prev, newBot]);
    }
    setBotToEdit(null);
  }, []);
  
  const handleSavePersona = useCallback((personaData: Omit<Persona, 'id'> | Persona) => {
    if ('id' in personaData) {
        setPersonas(prev => prev.map(p => p.id === personaData.id ? { ...p, ...personaData } : p));
    } else {
        const newPersona = { ...personaData, id: `persona-${Date.now()}`};
        setPersonas(prev => [...prev, newPersona]);
    }
  }, []);

  const handleDeletePersona = useCallback((id: string) => {
      const personaToDelete = personas.find(p => p.id === id);
      if (personaToDelete) {
          if (window.confirm("Are you sure you want to delete this persona? It will be moved to the Bin.")) {
              // Move to deleted personas
              setDeletedPersonas(prev => [...prev, personaToDelete]);
              // Remove from active personas
              setPersonas(prev => prev.filter(p => p.id !== id));
              // Unlink from active bots
              setBots(prev => prev.map(b => b.personaId === id ? { ...b, personaId: null } : b));
          }
      }
  }, [personas]);
  
  const handleAssignPersona = useCallback((personaId: string, botIds: string[]) => {
      setBots(prevBots => prevBots.map(bot => {
          if (botIds.includes(bot.id)) {
              return { ...bot, personaId };
          }
          if (bot.personaId === personaId && !botIds.includes(bot.id)) {
              return { ...bot, personaId: null };
          }
          return bot;
      }));
  }, []);

  const handleNewMessage = useCallback((botId: string, message: ChatMessage) => {
    setChatHistories(prev => ({
        ...prev,
        [botId]: [...(prev[botId] || []), message]
    }));
  }, []);
  
  const handleUpdateHistory = useCallback((botId: string, newHistory: ChatMessage[]) => {
    setChatHistories(prev => ({
      ...prev,
      [botId]: newHistory,
    }));
  }, []);

  const handleStartNewChat = useCallback((botId: string) => {
    if (window.confirm("Are you sure you want to start a new chat? The current history will be deleted.")) {
      setChatHistories(prev => {
        const bot = bots.find(b => b.id === botId);
        const newHistory = bot?.scenario 
          ? [{ id: `bot-reset-${Date.now()}`, text: bot.scenario, sender: 'bot' as const, timestamp: Date.now() }] 
          : [];
        return { ...prev, [botId]: newHistory };
      });
    }
  }, [bots]);

  const handleClearData = useCallback(async () => {
      if (window.confirm("Are you sure you want to delete all your Humans, personas, and chat history? This cannot be undone.")) {
        await clearUserData();
        setBots([]);
        setPersonas([]);
        setChatHistories({});
        setBotUsage({});
        setSessions([]);
        setDeletedBots([]);
        setDeletedPersonas([]);
      }
  }, []);

  const handleConsentChange = useCallback((agreed: boolean) => {
    setHasConsented(agreed);
  }, []);

  const logSession = useCallback((startTime: number, botId: string) => {
    const newSession: ChatSession = { startTime, endTime: Date.now(), botId };
    setSessions(prev => [...prev, newSession]);
  }, []);

  // Recycle Bin Functions
  const handleRestoreBot = useCallback((bot: BotProfile) => {
      setDeletedBots(prev => prev.filter(b => b.id !== bot.id));
      setBots(prev => [...prev, bot]);
  }, []);

  const handlePermanentDeleteBot = useCallback((id: string) => {
      if (window.confirm("Delete this Human forever? This action cannot be undone and chat history will be lost.")) {
          setDeletedBots(prev => prev.filter(b => b.id !== id));
          setChatHistories(prev => {
              const newHistories = { ...prev };
              delete newHistories[id];
              return newHistories;
          });
          setBotUsage(prev => {
              const newUsage = { ...prev };
              delete newUsage[id];
              return newUsage;
          });
      }
  }, []);

  const handleRestorePersona = useCallback((persona: Persona) => {
      setDeletedPersonas(prev => prev.filter(p => p.id !== persona.id));
      setPersonas(prev => [...prev, persona]);
  }, []);

  const handlePermanentDeletePersona = useCallback((id: string) => {
      if (window.confirm("Delete this Persona forever? This action cannot be undone.")) {
          setDeletedPersonas(prev => prev.filter(p => p.id !== id));
      }
  }, []);


  const selectedBot = bots.find(b => b.id === selectedBotId);
  const personaForBot = personas.find(p => p.id === selectedBot?.personaId);
  
  const effectiveBot = selectedBot ? {
      ...selectedBot,
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
                    onOpenSettings={() => window.location.hash = '#settings'}
                />;
      case 'humans':
        return <BotsPage bots={bots} onSelectBot={handleSelectBot} onEditBot={handleEditBot} onDeleteBot={handleDeleteBot} onCloneBot={handleCloneBot} />;
      case 'create':
        return <CreationForm onSaveBot={handleSaveBot} onNavigate={handleNavigate} botToEdit={botToEdit} />;
      case 'images':
        return <ImageGeneratorPage />;
      case 'story':
        return <ScenarioGeneratorPage bots={bots} selectedAI={selectedAI} />;
      case 'code':
        return <CodePromptGeneratorPage />;
      case 'personas':
        return <PersonasPage personas={personas} bots={bots} onSave={handleSavePersona} onDelete={handleDeletePersona} onAssign={handleAssignPersona} />;
      case 'stats':
        return <StatsDashboard bots={bots} personas={personas} chatHistories={chatHistories} sessions={sessions} onBack={() => window.location.hash = '#home'} />;
      case 'bin':
        return <RecycleBinPage 
                  deletedBots={deletedBots}
                  deletedPersonas={deletedPersonas}
                  onRestoreBot={handleRestoreBot}
                  onPermanentDeleteBot={handlePermanentDeleteBot}
                  onRestorePersona={handleRestorePersona}
                  onPermanentDeletePersona={handlePermanentDeletePersona}
               />;
      case 'chat':
        if (effectiveBot) {
          return <ChatView 
                    bot={effectiveBot} 
                    onBack={() => window.location.hash = '#home'}
                    chatHistory={chatHistories[effectiveBot.id] || []}
                    onNewMessage={(message) => handleNewMessage(effectiveBot.id, message)}
                    onUpdateHistory={(newHistory) => handleUpdateHistory(effectiveBot.id, newHistory)}
                    onUpdateBot={handleSaveBot}
                    selectedAI={selectedAI}
                    voicePreference={voicePreference}
                    onEdit={handleEditBot}
                    onStartNewChat={handleStartNewChat}
                    currentUser={defaultUser}
                    logSession={logSession}
                 />;
        }
        // If state is invalid for chat, return null, effect will redirect
        return null;
      default:
        return null;
    }
  };

  return (
    <div className={`w-full h-full max-w-md mx-auto flex flex-col font-sans shadow-2xl overflow-hidden relative ${theme}`}>
      {showExitConfirm && (
          <ExitConfirmationModal 
            onConfirm={handleConfirmExit} 
            onCancel={() => setShowExitConfirm(false)} 
          />
      )}
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => window.location.hash = lastHash.current || '#home'} 
        theme={theme}
        toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        onClearData={handleClearData}
        selectedAI={selectedAI}
        onSelectAI={setSelectedAI}
        voicePreference={voicePreference}
        onSetVoicePreference={setVoicePreference}
        hasConsented={hasConsented}
        onConsentChange={handleConsentChange}
        onNavigate={handleNavigate}
      />
      <div className="flex-1 overflow-hidden">
        {renderPage()}
      </div>
      {currentPage !== 'chat' && currentPage !== 'stats' && currentPage !== 'bin' && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md">
            <FooterNav currentPage={currentPage} onNavigate={handleNavigate} />
        </div>
      )}
    </div>
  );
};

export default App;
