import React, { useState } from 'react';
import type { Persona, AIModelOption } from '../types';
import { generateScenario } from '../services/geminiService';

interface ScenarioGeneratorPageProps {
  personas: Persona[];
  selectedAI: AIModelOption;
}

const ScenarioGeneratorPage: React.FC<ScenarioGeneratorPageProps> = ({ personas, selectedAI }) => {
    const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
    const [userPrompt, setUserPrompt] = useState('');
    const [generatedScenario, setGeneratedScenario] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');

    const handleGenerate = async () => {
        const selectedPersona = personas.find(p => p.id === selectedPersonaId);
        if (!selectedPersona) {
            alert('Please select a persona first.');
            return;
        }
        setIsLoading(true);
        setGeneratedScenario('');
        setCopySuccess('');
        try {
            const scenario = await generateScenario(selectedPersona.personality, userPrompt, selectedAI);
            setGeneratedScenario(scenario);
        } catch (error) {
            console.error(error);
            setGeneratedScenario('Failed to generate a scenario. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!generatedScenario) return;
        navigator.clipboard.writeText(generatedScenario).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            setCopySuccess('Failed to copy');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const inputClass = "w-full bg-white/10 dark:bg-black/10 p-3 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner";
    const labelClass = "block text-sm font-medium mb-2";

    return (
        <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
            <header className="flex items-center mb-6 gap-2">
                <img src="https://i.postimg.cc/qRB2Gnw2/Gemini-Generated-Image-vfkohrvfkohrvfko-1.png" alt="Zia.ai Logo" className="h-8 w-8"/>
                <h1 className="text-3xl font-bold">Scenario Generator</h1>
            </header>
            <main className="flex-1 overflow-y-auto pb-24 space-y-6">
                <div>
                    <label htmlFor="persona-select" className={labelClass}>1. Select a Persona</label>
                    <select
                        id="persona-select"
                        value={selectedPersonaId}
                        onChange={(e) => setSelectedPersonaId(e.target.value)}
                        className={inputClass}
                    >
                        <option value="">-- Choose a Persona --</option>
                        {personas.map(persona => (
                            <option key={persona.id} value={persona.id}>{persona.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="user-prompt" className={labelClass}>2. Add a Theme/Idea (Optional)</label>
                    <textarea
                        id="user-prompt"
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        className={inputClass}
                        rows={3}
                        placeholder="e.g., a chance meeting in a rainy city, a tense negotiation, a magical forest discovery..."
                    />
                </div>
                <button onClick={handleGenerate} disabled={isLoading || !selectedPersonaId} className="w-full bg-accent text-white font-bold py-4 px-4 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50 shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? 'Generating...' : 'Generate Scenario'}
                </button>
                
                {isLoading && (
                    <div className="text-center p-4 animate-fadeIn">
                        <div className="flex justify-center items-center space-x-2">
                             <div className="w-3 h-3 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-3 h-3 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-3 h-3 bg-accent rounded-full animate-bounce"></div>
                        </div>
                        <p className="mt-3 text-gray-400">The AI is crafting your scene...</p>
                    </div>
                )}

                {generatedScenario && (
                    <div className="animate-fadeIn space-y-4">
                        <h2 className="text-xl font-semibold">Generated Scenario</h2>
                        <div className="relative bg-white/5 dark:bg-black/10 p-4 rounded-2xl whitespace-pre-wrap">
                            <p>{generatedScenario}</p>
                            <button onClick={handleCopy} className="absolute top-2 right-2 bg-accent text-white text-xs font-bold py-1 px-3 rounded-full hover:bg-accent/80 transition-colors">
                                {copySuccess || 'Copy'}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ScenarioGeneratorPage;
