
import React from 'react';

interface ExitConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] animate-fadeIn p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-light-bg dark:bg-dark-bg border border-white/10 dark:border-black/20 rounded-2xl shadow-2xl relative max-w-sm w-full mx-auto p-6 flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        </div>
        <h2 className="text-xl font-bold mb-2 text-light-text dark:text-dark-text">Are you sure you want to exit?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You are about to leave the application.
        </p>
        
        <div className="flex gap-3 w-full">
          <button 
            onClick={onCancel} 
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-3 px-4 rounded-xl transition-colors hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            No
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 bg-accent text-white font-bold py-3 px-4 rounded-xl transition-colors hover:bg-blue-600 shadow-lg hover:shadow-accent/20"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitConfirmationModal;
