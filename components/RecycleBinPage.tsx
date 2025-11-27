import React, { useState } from 'react';
import type { BotProfile, Persona } from '../types';

interface RecycleBinPageProps {
  deletedBots: BotProfile[];
  deletedPersonas: Persona[];
  onRestoreBot: (bot: BotProfile) => void;
  onPermanentDeleteBot: (id: string) => void;
  onRestorePersona: (persona: Persona) => void;
  onPermanentDeletePersona: (id: string) => void;
}

const RecycleBinPage: React.FC<RecycleBinPageProps> = ({ 
  deletedBots, 
  deletedPersonas, 
  onRestoreBot, 
  onPermanentDeleteBot,
  onRestorePersona,
  onPermanentDeletePersona
}) => {
  const [activeTab, setActiveTab] = useState<'bots' | 'personas'>('bots');

  const renderBotsList = () => {
    if (deletedBots.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
          <p className="text-lg">No deleted humans.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4">
        {deletedBots.map(bot => (
          <div key={bot.id} className="bg-white/5 dark:bg-black/10 p-4 rounded-2xl flex items-center gap-4 animate-fadeIn">
            <img src={bot.photo} alt={bot.name} className="w-16 h-16 rounded-xl object-cover" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">{bot.name}</h3>
              <p className="text-sm text-gray-400 truncate">{bot.description}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => onRestoreBot(bot)} 
                className="px-4 py-2 bg-accent/20 text-accent text-sm font-bold rounded-lg hover:bg-accent/30 transition-colors"
              >
                Restore
              </button>
              <button 
                onClick={() => onPermanentDeleteBot(bot.id)} 
                className="px-4 py-2 bg-red-500/10 text-red-500 text-sm font-bold rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPersonasList = () => {
    if (deletedPersonas.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
          <p className="text-lg">No deleted personas.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4">
        {deletedPersonas.map(persona => (
          <div key={persona.id} className="bg-white/5 dark:bg-black/10 p-4 rounded-2xl flex items-center gap-4 animate-fadeIn">
            {persona.photo ? (
                <img src={persona.photo} alt={persona.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
                <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-xl font-bold">
                    {persona.name.charAt(0)}
                </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">{persona.name}</h3>
              <p className="text-sm text-gray-400 truncate">{persona.description || 'No description'}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => onRestorePersona(persona)} 
                className="px-4 py-2 bg-accent/20 text-accent text-sm font-bold rounded-lg hover:bg-accent/30 transition-colors"
              >
                Restore
              </button>
              <button 
                onClick={() => onPermanentDeletePersona(persona.id)} 
                className="px-4 py-2 bg-red-500/10 text-red-500 text-sm font-bold rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
       <header className="flex items-center mb-6 gap-2">
        <img src="https://i.postimg.cc/qRB2Gnw2/Gemini-Generated-Image-vfkohrvfkohrvfko-1.png" alt="Zia.ai Logo" className="h-8 w-8"/>
        <h1 className="text-3xl font-bold">Recycle Bin</h1>
      </header>

      <div className="flex space-x-1 bg-white/5 dark:bg-black/10 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('bots')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
            activeTab === 'bots' 
              ? 'bg-accent text-white shadow-md' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Deleted Humans
        </button>
        <button
          onClick={() => setActiveTab('personas')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
            activeTab === 'personas' 
              ? 'bg-accent text-white shadow-md' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Deleted Personas
        </button>
      </div>
      
      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'bots' ? renderBotsList() : renderPersonasList()}
      </main>
    </div>
  );
};

export default RecycleBinPage;