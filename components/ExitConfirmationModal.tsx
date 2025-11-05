import React from 'react';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-dark-bg rounded-2xl shadow-2xl relative max-w-sm w-full mx-auto p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-2">Exit App?</h2>
        <p className="text-gray-400 mb-6">Are you sure you want to quit?</p>
        <div className="flex gap-4">
          <button 
            onClick={onCancel} 
            className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-2xl transition-colors hover:bg-gray-400"
          >
            No
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 bg-accent text-white font-bold py-3 px-4 rounded-2xl transition-colors hover:bg-accent/80"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitConfirmationModal;
