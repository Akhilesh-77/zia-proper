import React from 'react';
import type { BotProfile } from '../types';
import BotCard from './BotCard';

interface HomePageProps {
  bots: BotProfile[];
  botUsage: Record<string, number>;
  onSelectBot: (id: string) => void;
  onEditBot: (id: string) => void;
  onDeleteBot: (id: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onOpenSettings: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ bots, botUsage, onSelectBot, onEditBot, onDeleteBot, theme, toggleTheme, onOpenSettings }) => {

  const sortedBots = [...bots].sort((a, b) => (botUsage[b.id] || 0) - (botUsage[a.id] || 0));

  const trendingBots = sortedBots.slice(0, 4);

  const renderBotGrid = (botList: BotProfile[], title: string) => {
    if (botList.length === 0 && title === "Trending Humans") {
      return (
        <div className="flex flex-col items-center justify-center text-center text-gray-500 py-10">
            <p className="text-lg">No Humans to discover yet.</p>
            <p>Create a bot and chat with it to see it here!</p>
        </div>
      )
    }
    if (botList.length === 0) {
        return null;
    }

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">{title}</h2>
            <div className="grid grid-cols-2 gap-4">
                {botList.map(bot => (
                <BotCard 
                    key={bot.id} 
                    bot={bot} 
                    onChat={() => onSelectBot(bot.id)} 
                    onEdit={() => onEditBot(bot.id)}
                    onDelete={() => onDeleteBot(bot.id)}
                />
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
      <header className="flex justify-between items-center mb-6">
        <button onClick={onOpenSettings} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex items-center gap-2">
            <img src="https://i.postimg.cc/qRB2Gnw2/Gemini-Generated-Image-vfkohrvfkohrvfko-1.png" alt="Zia.ai Logo" className="h-8 w-8"/>
            <h1 className="text-3xl font-bold">Zia.ai</h1>
        </div>
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors">
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
      </header>
      
      <main className="flex-1 overflow-y-auto pb-24 space-y-8">
        {renderBotGrid(trendingBots, "Trending Bots")}
        {renderBotGrid(bots, "All Bots")}
      </main>
    </div>
  );
};

export default HomePage;
