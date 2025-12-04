
import React, { useState, useEffect } from 'react';
import type { BotProfile, AIModelOption, CustomBlock } from '../types';
import { generateStory, generateScenarioIdea } from '../services/geminiService';
import FullScreenEditor from './FullScreenEditor';

interface StoryModePageProps {
  bots: BotProfile[];
  selectedAI: AIModelOption;
  customBlocks: CustomBlock[];
  onSaveBlock: (block: CustomBlock) => void;
  onDeleteBlock: (id: string) => void;
}

const StoryModePage: React.FC<StoryModePageProps> = ({ bots, selectedAI, customBlocks, onSaveBlock, onDeleteBlock }) => {
    const [selectedBotIds, setSelectedBotIds] = useState<Set<string>>(new Set());
    const [otherCharacters, setOtherCharacters] = useState('');
    const [scenario, setScenario] = useState('');
    const [generatedStory, setGeneratedStory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Custom Blocks State
    const [newBlockName, setNewBlockName] = useState('');
    const [newBlockDesc, setNewBlockDesc] = useState('');
    const [isAddingBlock, setIsAddingBlock] = useState(false);
    const [blockCopyId, setBlockCopyId] = useState<string | null>(null);

    const handleToggleBot = (botId: string) => {
        const newSelection = new Set(selectedBotIds);
        if (newSelection.has(botId)) {
            newSelection.delete(botId);
        } else {
            newSelection.add(botId);
        }
        setSelectedBotIds(newSelection);
    };

    const handleSuggestIdea = async () => {
        setIsSuggesting(true);
        try {
            // Extract personalities for better suggestions
            const selectedBots = bots.filter(b => selectedBotIds.has(b.id));
            const personalities = selectedBots.map(b => b.personality);
            
            const idea = await generateScenarioIdea(personalities);
            setScenario(idea);
        } catch (error) {
            console.error(error);
            setScenario('Failed to get an idea. Please try again.');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleGenerate = async () => {
        if (selectedBotIds.size === 0 && !otherCharacters.trim()) {
            alert('Please select or add at least one character.');
            return;
        }
        if (!scenario.trim()) {
            alert('Please provide a scenario.');
            return;
        }

        const selectedBots = bots.filter(b => selectedBotIds.has(b.id));
        const characterData = selectedBots.map(b => ({ name: b.name, personality: b.personality }));
        const otherNames = otherCharacters.split(',').map(name => name.trim()).filter(Boolean);

        setIsLoading(true);
        setGeneratedStory('');
        setCopySuccess(false);

        try {
            const story = await generateStory(characterData, otherNames, scenario, selectedAI);
            setGeneratedStory(story);
        } catch (error) {
            console.error(error);
            setGeneratedStory('Failed to generate a story. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = () => {
        if (!generatedStory) return;
        navigator.clipboard.writeText(generatedStory).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    const handleSaveNewBlock = () => {
        if(!newBlockName.trim() || !newBlockDesc.trim()) {
            alert("Name and description required.");
            return;
        }
        onSaveBlock({
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: newBlockName,
            description: newBlockDesc
        });
        setNewBlockName('');
        setNewBlockDesc('');
        setIsAddingBlock(false);
    }

    const handleCopyBlock = (text: string, id: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setBlockCopyId(id);
            setTimeout(() => setBlockCopyId(null), 1500);
        });
    }

    const inputClass = "w-full bg-white/10 dark:bg-black/10 p-3 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner";
    const labelClass = "block text-sm font-medium mb-2";

    return (
        <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
            <header className="flex items-center mb-6 gap-2">
                <img src="https://i.postimg.cc/qRB2Gnw2/Gemini-Generated-Image-vfkohrvfkohrvfko-1.png" alt="Zia.ai Logo" className="h-8 w-8"/>
                <h1 className="text-3xl font-bold">Story Mode ✨</h1>
            </header>
            <main className="flex-1 overflow-y-auto pb-24 space-y-6">
                <div>
                    <label className={labelClass}>1. Choose Characters</label>
                    <div className="max-h-32 overflow-y-auto space-y-2 p-2 bg-black/10 rounded-lg border border-white/20">
                        {bots.map(bot => (
                            <label key={bot.id} className="flex items-center bg-white/5 p-2 rounded-lg cursor-pointer hover:bg-white/10">
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-accent focus:ring-accent"
                                    checked={selectedBotIds.has(bot.id)}
                                    onChange={() => handleToggleBot(bot.id)}
                                />
                                <img src={bot.photo} alt={bot.name} className="h-8 w-8 rounded-md object-cover ml-3" />
                                <span className="ml-3 font-medium">{bot.name}</span>
                            </label>
                        ))}
                    </div>
                     <input
                        type="text"
                        value={otherCharacters}
                        onChange={(e) => setOtherCharacters(e.target.value)}
                        className={`${inputClass} mt-2`}
                        placeholder="Add other character names, separated by commas..."
                    />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="scenario-input" className={labelClass}>2. Describe the Scenario</label>
                        <button 
                            onClick={handleSuggestIdea} 
                            disabled={isSuggesting || isLoading}
                            className="text-sm bg-accent/20 text-accent font-semibold py-1 px-3 rounded-full hover:bg-accent/40 transition-colors disabled:opacity-50"
                        >
                            {isSuggesting ? 'Thinking...' : 'Suggest Idea ✨'}
                        </button>
                    </div>
                    <textarea
                        id="scenario-input"
                        value={scenario}
                        onChange={(e) => setScenario(e.target.value)}
                        className={inputClass}
                        rows={4}
                        placeholder="e.g., A tense negotiation, a discovery in a magical forest..."
                    />
                </div>
                <button onClick={handleGenerate} disabled={isLoading || isSuggesting} className="w-full bg-accent text-white font-bold py-4 px-4 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50 shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? 'Generating...' : 'Generate Story'}
                </button>
                
                {isLoading && (
                    <div className="text-center p-4 animate-fadeIn">
                        <div className="flex justify-center items-center space-x-2">
                             <div className="w-3 h-3 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-3 h-3 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-3 h-3 bg-accent rounded-full animate-bounce"></div>
                        </div>
                        <p className="mt-3 text-gray-400">The AI is crafting your story...</p>
                    </div>
                )}

                {generatedStory && (
                    <div className="animate-fadeIn space-y-4">
                        <h2 className="text-xl font-semibold">Generated Story</h2>
                        <div className="bg-white/5 dark:bg-black/10 p-4 rounded-2xl whitespace-pre-wrap">
                            <p>{generatedStory}</p>
                        </div>
                        <button onClick={handleCopy} className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-2xl text-lg transition-colors hover:bg-gray-500">
                           {copySuccess ? 'Copied to Clipboard!' : 'Copy Story'}
                        </button>
                    </div>
                )}
                
                {/* CUSTOM COPY BLOCKS */}
                <div className="pt-8 mt-4 border-t border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Custom Copy Blocks</h2>
                        <button onClick={() => setIsAddingBlock(!isAddingBlock)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-accent">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>
                    
                    {isAddingBlock && (
                        <div className="bg-white/5 p-4 rounded-xl mb-4 animate-fadeIn">
                            <input 
                                type="text" 
                                placeholder="Block Name (e.g. My Intro)" 
                                value={newBlockName} 
                                onChange={e => setNewBlockName(e.target.value)} 
                                className={`${inputClass} mb-2`}
                            />
                            <textarea 
                                placeholder="Text to copy..." 
                                value={newBlockDesc} 
                                onChange={e => setNewBlockDesc(e.target.value)} 
                                className={`${inputClass} mb-2`}
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setIsAddingBlock(false)} className="flex-1 py-2 bg-gray-600 rounded-lg text-white">Cancel</button>
                                <button onClick={handleSaveNewBlock} className="flex-1 py-2 bg-accent rounded-lg text-white font-bold">Save Block</button>
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        {customBlocks && customBlocks.length > 0 ? (
                            customBlocks.map(block => (
                                <div key={block.id} className="bg-white/5 p-3 rounded-xl flex flex-col gap-2 group">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-base">{block.name}</h3>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleCopyBlock(block.description, block.id)} 
                                                className="p-2 bg-accent/20 rounded-lg hover:bg-accent/40 text-accent transition-colors"
                                                title="Copy Text"
                                            >
                                                {blockCopyId === block.id ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                )}
                                            </button>
                                            <button 
                                                onClick={() => onDeleteBlock(block.id)}
                                                className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 text-red-500 transition-colors"
                                                title="Delete Block"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 p-2 rounded-lg text-sm text-gray-400 max-h-24 overflow-y-auto whitespace-pre-wrap border border-white/5">
                                        {block.description}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center italic text-sm">No custom blocks yet. Tap + to add one.</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StoryModePage;
