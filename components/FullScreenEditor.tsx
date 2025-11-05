import React, { useState, useEffect, useCallback } from 'react';

interface FullScreenEditorProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  onClose: () => void;
  label: string;
}

const FullScreenEditor: React.FC<FullScreenEditorProps> = ({ initialValue, onSave, onClose, label }) => {
  const [value, setValue] = useState(initialValue);

  const handleSave = useCallback(() => {
    onSave(value);
    onClose();
  }, [onSave, onClose, value]);
  
  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave]);


  return (
    <div className="fixed inset-0 bg-dark-bg z-50 flex flex-col p-4 animate-fadeIn">
      <header className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold">{label}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 hidden sm:block">Press Esc to Save & Close</span>
          <button onClick={handleSave} className="bg-accent text-white font-bold py-2 px-6 rounded-2xl transition-colors hover:bg-accent/80">
            Save & Close
          </button>
        </div>
      </header>
      <main className="flex-1 flex min-h-0">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full h-full bg-black/20 p-4 rounded-2xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner text-base resize-none"
          placeholder="Enter details here..."
          autoFocus
        />
      </main>
    </div>
  );
};

export default FullScreenEditor;
