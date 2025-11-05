import React, { useState } from 'react';
import { generateCodePrompt } from '../services/geminiService';

const CodePromptGeneratorPage: React.FC = () => {
    const [task, setTask] = useState('');
    const [language, setLanguage] = useState('React');
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!task.trim() || !language.trim()) {
            setError('Please provide both a task and a language.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedPrompt('');
        setCopySuccess(false);

        try {
            const prompt = await generateCodePrompt(task, language);
            setGeneratedPrompt(prompt);
        } catch (err) {
            console.error("Error generating code prompt:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!generatedPrompt) return;
        navigator.clipboard.writeText(generatedPrompt).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    const inputClass = "w-full bg-white/10 dark:bg-black/10 p-3 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner";
    const labelClass = "block text-sm font-medium mb-2";

    return (
        <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
            <header className="flex items-center mb-6 gap-2">
                <img src="https://i.postimg.cc/qRB2Gnw2/Gemini-Generated-Image-vfkohrvfkohrvfko-1.png" alt="Zia.ai Logo" className="h-8 w-8"/>
                <h1 className="text-3xl font-bold">Code Prompt Generator</h1>
            </header>
            <main className="flex-1 overflow-y-auto pb-24 space-y-6">
                <div>
                    <label htmlFor="task-input" className={labelClass}>1. Describe your coding task</label>
                    <textarea
                        id="task-input"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        className={inputClass}
                        rows={4}
                        placeholder="e.g., A simple todo list component with add and delete functionality."
                    />
                </div>
                <div>
                    <label htmlFor="language-input" className={labelClass}>2. Specify the language/framework</label>
                    <input
                        id="language-input"
                        type="text"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className={inputClass}
                        placeholder="e.g., React, Python, CSS"
                    />
                </div>
                <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-accent text-white font-bold py-4 px-4 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50 shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? 'Generating...' : 'Generate Detailed Prompt'}
                </button>

                 {isLoading && (
                    <div className="text-center p-4 animate-fadeIn">
                        <div className="flex justify-center items-center space-x-2">
                            <div className="w-3 h-3 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-3 h-3 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-3 h-3 bg-accent rounded-full animate-bounce"></div>
                        </div>
                        <p className="mt-3 text-gray-400">The AI is engineering your prompt...</p>
                    </div>
                )}

                {error && <p className="text-red-500 text-center animate-fadeIn">{error}</p>}

                {generatedPrompt && (
                    <div className="animate-fadeIn space-y-4">
                        <h2 className="text-xl font-semibold">Generated Prompt</h2>
                        <div className="bg-white/5 dark:bg-black/10 p-4 rounded-2xl whitespace-pre-wrap">
                            <p className="text-sm">{generatedPrompt}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleCopy} className="flex-1 bg-gray-600 text-white font-bold py-3 px-4 rounded-2xl text-lg transition-colors hover:bg-gray-500">
                                {copySuccess ? 'Copied!' : 'Copy Prompt'}
                            </button>
                             <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-green-600 text-white font-bold py-3 px-4 rounded-2xl text-lg transition-colors hover:bg-green-500">
                                Try in AI Studio
                            </a>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CodePromptGeneratorPage;
