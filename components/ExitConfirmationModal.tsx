import React from 'react';

interface ExitConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn p-4" onClick={onCancel}>
        <div className="bg-dark-bg rounded-2xl shadow-2xl relative max-w-sm w-full mx-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-center">Are you sure you want to Quit?</h2>
            <div className="flex gap-4">
                <button type="button" onClick={onCancel} className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-2xl transition-colors hover:bg-gray-400">
                    No
                </button>
                <button type="button" onClick={onConfirm} className="flex-1 bg-red-600 text-white font-bold py-3 px-4 rounded-2xl transition-colors hover:bg-red-500">
                    Yes
                </button>
            </div>
        </div>
    </div>
  );
};

export default ExitConfirmationModal;
