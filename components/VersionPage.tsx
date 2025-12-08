
import React from 'react';

interface VersionPageProps {
  onBack?: () => void;
}

const VersionPage: React.FC<VersionPageProps> = ({ onBack }) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = '#home';
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text animate-fadeIn relative">
       <button 
         onClick={handleBack} 
         className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors z-10 text-gray-600 dark:text-gray-300"
         aria-label="Back to Home"
       >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
         </svg>
       </button>

       <div className="flex flex-col items-center justify-center space-y-6">
           <img 
             src="https://i.postimg.cc/qRB2Gnw2/Gemini-Generated-Image-vfkohrvfkohrvfko-1.png" 
             alt="Zia.ai Logo" 
             className="h-32 w-32 rounded-2xl shadow-lg mb-4"
           />
           <h1 className="text-4xl font-bold tracking-tight">Zia.ai</h1>
           
           <div className="w-16 h-1 bg-accent rounded-full opacity-50"></div>
           
           <div className="text-center space-y-3 text-gray-500 dark:text-gray-400">
              <p className="font-medium">© 2025 Zia.ai — Powered by Gemini AI</p>
              <p className="font-mono text-sm opacity-70">Version: v1.0.0</p>
           </div>
       </div>
    </div>
  );
};

export default VersionPage;
