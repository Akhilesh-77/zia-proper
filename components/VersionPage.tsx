
import React from 'react';

const VersionPage: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text animate-fadeIn">
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
              <p className="font-mono text-sm opacity-70">Version: v21</p>
           </div>
       </div>
    </div>
  );
};

export default VersionPage;
