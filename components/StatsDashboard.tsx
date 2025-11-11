import React from 'react';
import type { BotProfile, Persona, ChatMessage, ChatSession } from '../types';

interface StatsDashboardProps {
  bots: BotProfile[];
  personas: Persona[];
  chatHistories: Record<string, ChatMessage[]>;
  sessions: ChatSession[];
  onBack: () => void;
}

const StatCard: React.FC<{ label: string; value: string | number; }> = ({ label, value }) => (
    <div className="bg-white/5 dark:bg-black/10 p-4 rounded-xl text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-gray-400 truncate">{label}</p>
    </div>
);

const BarChart: React.FC<{ data: { label: string, value: number }[], title: string }> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="bg-white/5 dark:bg-black/10 p-4 rounded-xl">
            <h3 className="font-semibold mb-3">{title}</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {data.length > 0 ? data.map(item => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                        <span className="w-24 truncate" title={item.label}>{item.label}</span>
                        <div className="flex-1 bg-black/20 h-5 rounded-md">
                            <div
                                className="bg-accent h-5 rounded-md transition-all duration-500"
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            />
                        </div>
                        <span className="w-8 text-right font-mono">{item.value}</span>
                    </div>
                )) : <p className="text-sm text-gray-500 text-center">No data to display.</p>}
            </div>
        </div>
    );
};


const StatsDashboard: React.FC<StatsDashboardProps> = ({ bots, personas, chatHistories, sessions, onBack }) => {
    // --- Calculations ---
    const totalBots = bots.length;
    const totalPersonas = personas.length;

    const allMessages = Object.values(chatHistories).flat();
    const userMessages = allMessages.filter(m => m.sender === 'user');
    const botMessages = allMessages.filter(m => m.sender === 'bot');

    const totalUserMessages = userMessages.length;
    const totalBotMessages = botMessages.length;

    const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;
    const totalUserWords = userMessages.reduce((sum, msg) => sum + countWords(msg.text), 0);
    const totalBotWords = botMessages.reduce((sum, msg) => sum + countWords(msg.text), 0);

    const totalTimeMs = sessions.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
    const totalTimeMinutes = Math.round(totalTimeMs / 60000);
    const totalSessions = sessions.length;

    const messageCountByBot = bots.map(bot => {
        const messages = chatHistories[bot.id] || [];
        return { name: bot.name, messages: messages.length, userMessages: messages.filter(m => m.sender === 'user').length };
    });

    const mostActiveBot = [...messageCountByBot].sort((a, b) => b.messages - a.messages)[0]?.name || 'N/A';
    const leastActiveBot = [...messageCountByBot].sort((a, b) => a.messages - b.messages)[0]?.name || 'N/A';
    
    const sortedSessions = [...sessions].sort((a, b) => b.endTime - a.endTime);
    const lastActiveBot = sortedSessions.length > 0
        ? bots.find(b => b.id === sortedSessions[0].botId)?.name || 'N/A'
        : 'N/A';
        
    const barChartData = messageCountByBot.map(b => ({ label: b.name, value: b.userMessages })).sort((a,b) => b.value - a.value);
    
    // --- Daily Usage Graph Data ---
    const dailyUsageData = Array(7).fill(0).map((_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        return { date: d.getTime(), duration: 0 };
    }).reverse();

    sessions.forEach(session => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        const dayData = dailyUsageData.find(d => d.date === sessionDate.getTime());
        if (dayData) {
            dayData.duration += (session.endTime - session.startTime);
        }
    });

    const formattedDailyUsage = dailyUsageData.map(d => ({
        label: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }),
        value: Math.round(d.duration / 60000) // in minutes
    }));

    // --- Render ---
    return (
        <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text animate-fadeIn">
            <header className="flex items-center mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold flex-1 text-center pr-8">Usage Statistics</h1>
            </header>
            <main className="flex-1 overflow-y-auto pb-24 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Total Humans" value={totalBots} />
                    <StatCard label="Total Personas" value={totalPersonas} />
                    <StatCard label="User Messages" value={totalUserMessages} />
                    <StatCard label="Bot Messages" value={totalBotMessages} />
                    <StatCard label="User Words" value={totalUserWords} />
                    <StatCard label="Bot Words" value={totalBotWords} />
                    <StatCard label="Time in Chat (min)" value={totalTimeMinutes} />
                    <StatCard label="Chat Sessions" value={totalSessions} />
                </div>

                <div className="bg-white/5 dark:bg-black/10 p-4 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between"><span>Most Active Bot:</span> <span className="font-semibold">{mostActiveBot}</span></div>
                    <div className="flex justify-between"><span>Least Active Bot:</span> <span className="font-semibold">{leastActiveBot}</span></div>
                    <div className="flex justify-between"><span>Last Used Bot:</span> <span className="font-semibold">{lastActiveBot}</span></div>
                </div>

                <BarChart data={formattedDailyUsage} title="Time in App (Last 7 Days, in minutes)" />
                <BarChart data={barChartData} title="Messages Sent by Bot" />
            </main>
        </div>
    );
};

export default StatsDashboard;
