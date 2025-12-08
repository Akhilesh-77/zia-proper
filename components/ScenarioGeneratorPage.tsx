
import React, { useState, useEffect, useCallback } from 'react';
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

// Internal Collapsible Section Component
const CollapsibleSection: React.FC<{
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}> = ({ title, subtitle, children, defaultExpanded = false }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="bg-white/5 dark:bg-black/10 rounded-2xl overflow-hidden mb-4 transition-all duration-300 border border-white/5 shadow-sm">
            <button 
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex justify-between items-center bg-white/5 hover:bg-white/10 transition-colors text-left"
                aria-expanded={isExpanded}
            >
                <div>
                    <span className="font-bold text-base block">{title}</span>
                    {subtitle && <span className="text-xs text-gray-400 block mt-0.5">{subtitle}</span>}
                </div>
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isExpanded && (
                <div className="p-4 border-t border-white/10 animate-fadeIn">
                    {children}
                </div>
            )}
        </div>
    );
};

interface LocalBlock {
    id: string;
    name: string;
    content: string;
}

const STORAGE_KEY_BLOCKS = 'zia_custom_copy_blocks_v1';

const StoryModePage: React.FC<StoryModePageProps> = ({ bots, selectedAI, customBlocks: propBlocks, onSaveBlock, onDeleteBlock }) => {
    const [selectedBotIds, setSelectedBotIds] = useState<Set<string>>(new Set());
    const [otherCharacters, setOtherCharacters] = useState('');
    const [scenario, setScenario] = useState('');
    const [generatedStory, setGeneratedStory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // --- Custom Copy Blocks Local State ---
    const [localBlocks, setLocalBlocks] = useState<LocalBlock[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [blockName, setBlockName] = useState('');
    const [blockContent, setBlockContent] = useState('');
    const [blockCopyId, setBlockCopyId] = useState<string | null>(null);

    // Load blocks from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_BLOCKS);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setLocalBlocks(parsed);
                }
            }
        } catch (e) {
            console.error("Failed to load local blocks", e);
        }
    }, []);

    const saveBlocksToStorage = (blocks: LocalBlock[]) => {
        try {
            localStorage.setItem(STORAGE_KEY_BLOCKS, JSON.stringify(blocks));
        } catch (e) {
            console.error("Failed to save local blocks", e);
        }
    };

    const handleOpenModal = (block?: LocalBlock) => {
        if (block) {
            setEditingBlockId(block.id);
            setBlockName(block.name);
            setBlockContent(block.content);
        } else {
            setEditingBlockId(null);
            setBlockName('');
            setBlockContent('');
        }
        setIsModalOpen(true);
    };

    const handleSaveLocalBlock = () => {
        if (!blockName.trim() || !blockContent.trim()) {
            alert("Please fill in both name and content.");
            return;
        }

        let updatedBlocks: LocalBlock[];
        
        if (editingBlockId) {
            // Update existing
            updatedBlocks = localBlocks.map(b => 
                b.id === editingBlockId 
                ? { ...b, name: blockName, content: blockContent }
                : b
            );
        } else {
            // Create new
            const newBlock: LocalBlock = {
                id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: blockName,
                content: blockContent
            };
            updatedBlocks = [...localBlocks, newBlock];
        }

        setLocalBlocks(updatedBlocks);
        saveBlocksToStorage(updatedBlocks);
        setIsModalOpen(false);
        setBlockName('');
        setBlockContent('');
        setEditingBlockId(null);
    };

    const handleDeleteLocalBlock = (id: string) => {
        if (window.confirm("Delete this block?")) {
            const updatedBlocks = localBlocks.filter(b => b.id !== id);
            setLocalBlocks(updatedBlocks);
            saveBlocksToStorage(updatedBlocks);
        }
    };

    const handleCopyLocalBlock = (text: string, id: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setBlockCopyId(id);
            setTimeout(() => setBlockCopyId(null), 1500);
        }).catch(err => console.error("Copy failed", err));
    };

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

    const inputClass = "w-full bg-white/10 dark:bg-black/10 p-3 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner";
    const labelClass = "block text-sm font-medium mb-2";

    return (
        <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text relative">
            <header className="flex items-center mb-6 gap-2">
                <img src="https://i.postimg.cc/qRB2Gnw2/Gemini-Generated-Image-vfkohrvfkohrvfko-1.png" alt="Zia.ai Logo" className="h-8 w-8"/>
                <h1 className="text-3xl font-bold">Story Mode ✨</h1>
            </header>
            <main className="flex-1 overflow-y-auto pb-24 space-y-2">
                
                {/* 1. Choose Characters Section */}
                <CollapsibleSection title="1. Choose Characters" defaultExpanded={false}>
                    <div className="space-y-4">
                        <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-black/10 rounded-lg border border-white/20 custom-scrollbar">
                            {bots.length > 0 ? bots.map(bot => (
                                <label key={bot.id} className="flex items-center bg-white/5 p-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-accent focus:ring-accent"
                                        checked={selectedBotIds.has(bot.id)}
                                        onChange={() => handleToggleBot(bot.id)}
                                    />
                                    <img src={bot.photo} alt={bot.name} className="h-8 w-8 rounded-md object-cover ml-3" onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32'} />
                                    <span className="ml-3 font-medium">{bot.name}</span>
                                </label>
                            )) : (
                                <p className="text-gray-500 text-sm text-center py-2">No humans available. Create one first!</p>
                            )}
                        </div>
                         <div>
                            <label className="text-xs text-gray-400 mb-1 block">Add other characters (comma separated)</label>
                            <input
                                type="text"
                                value={otherCharacters}
                                onChange={(e) => setOtherCharacters(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. The King, A mysterious stranger..."
                            />
                        </div>
                    </div>
                </CollapsibleSection>

                {/* 2. Describe Scenario Section */}
                <CollapsibleSection title="2. Describe the Scenario" defaultExpanded={false}>
                     <textarea
                        id="scenario-input"
                        value={scenario}
                        onChange={(e) => setScenario(e.target.value)}
                        className={inputClass}
                        rows={5}
                        placeholder="e.g., A tense negotiation, a discovery in a magical forest..."
                    />
                </CollapsibleSection>

                 {/* Suggest Idea Section */}
                <CollapsibleSection title="Suggest Idea ✨" defaultExpanded={false}>
                     <p className="text-sm text-gray-400 mb-3">AI will generate a scenario idea based on selected character personalities.</p>
                     <button 
                        onClick={handleSuggestIdea} 
                        disabled={isSuggesting || isLoading}
                        className="w-full bg-accent/20 text-accent font-bold py-3 px-4 rounded-xl hover:bg-accent/30 transition-colors disabled:opacity-50"
                    >
                        {isSuggesting ? 'Thinking...' : 'Get Suggestion'}
                    </button>
                </CollapsibleSection>

                {/* Generate Story Section */}
                <CollapsibleSection title="Generate Story" defaultExpanded={false}>
                     <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || isSuggesting} 
                        className="w-full bg-accent text-white font-bold py-4 px-4 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50 shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
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
                </CollapsibleSection>

                {/* Generated Result */}
                {generatedStory && (
                    <div className="animate-fadeIn space-y-4 mt-6 border-t border-white/10 pt-6">
                        <h2 className="text-xl font-semibold">Generated Story</h2>
                        <div className="bg-white/5 dark:bg-black/10 p-4 rounded-2xl whitespace-pre-wrap border border-white/5 shadow-inner">
                            <p>{generatedStory}</p>
                        </div>
                        <button onClick={handleCopy} className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-2xl text-lg transition-colors hover:bg-gray-500">
                           {copySuccess ? 'Copied to Clipboard!' : 'Copy Story'}
                        </button>
                    </div>
                )}
                
                {/* ----------------------------- */}
                {/* NEW: CUSTOM COPY BLOCKS (v1)  */}
                {/* ----------------------------- */}
                <div className="pt-4">
                    <CollapsibleSection 
                        title="Custom Copy Blocks" 
                        subtitle="Reusable text blocks you can edit & copy anytime."
                        defaultExpanded={false}
                    >
                         <button 
                            onClick={() => handleOpenModal()} 
                            className="w-full mb-4 py-3 bg-white/5 border border-dashed border-white/30 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Block
                        </button>

                        <div className="space-y-3">
                            {localBlocks.length > 0 ? (
                                localBlocks.map(block => (
                                    <div key={block.id} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/20 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-base text-white">{block.name}</h3>
                                            <div className="flex gap-1">
                                                {/* Edit */}
                                                <button 
                                                    onClick={() => handleOpenModal(block)}
                                                    className="p-2 text-gray-400 hover:text-accent hover:bg-white/10 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                                </button>
                                                {/* Copy */}
                                                <button 
                                                    onClick={() => handleCopyLocalBlock(block.content, block.id)}
                                                    className={`p-2 rounded-lg transition-colors ${blockCopyId === block.id ? 'text-green-400 bg-green-400/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                    title="Copy"
                                                >
                                                    {blockCopyId === block.id ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                    )}
                                                </button>
                                                {/* Delete */}
                                                <button 
                                                    onClick={() => handleDeleteLocalBlock(block.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-lg text-sm text-gray-300 font-mono whitespace-pre-wrap max-h-32 overflow-hidden relative">
                                            {block.content}
                                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-500 italic">
                                    No custom blocks yet. Tap + to add one.
                                </div>
                            )}
                        </div>
                    </CollapsibleSection>
                </div>

            </main>

            {/* ADD/EDIT MODAL OVERLAY */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsModalOpen(false)}>
                    <div 
                        className="bg-dark-bg w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold mb-4">{editingBlockId ? 'Edit Block' : 'Add New Block'}</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-400">Block Name</label>
                                <input 
                                    type="text" 
                                    value={blockName} 
                                    onChange={e => setBlockName(e.target.value)}
                                    placeholder="e.g. Intro, Disclaimer..."
                                    className="w-full bg-white/10 rounded-xl p-3 border border-white/10 focus:ring-2 focus:ring-accent focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-400">Block Content</label>
                                <textarea 
                                    value={blockContent} 
                                    onChange={e => setBlockContent(e.target.value)}
                                    placeholder="Type or paste text here..."
                                    rows={5}
                                    className="w-full bg-white/10 rounded-xl p-3 border border-white/10 focus:ring-2 focus:ring-accent focus:outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 bg-gray-700 rounded-xl font-bold text-gray-300 hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveLocalBlock}
                                className="flex-1 py-3 bg-accent rounded-xl font-bold text-white hover:bg-accent/80 transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoryModePage;
