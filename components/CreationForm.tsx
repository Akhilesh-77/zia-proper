import React, { useState, useEffect } from 'react';
import type { BotProfile } from '../types';
import ImageCropper from './ImageCropper';
import FullScreenEditor from './FullScreenEditor';

interface CreationPageProps {
  onSaveBot: (profile: Omit<BotProfile, 'id'> | BotProfile) => void;
  onNavigate: (page: 'humans' | 'personas') => void;
  botToEdit: BotProfile | null;
}

const CreationPage: React.FC<CreationPageProps> = ({ onSaveBot, onNavigate, botToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [gif, setGif] = useState<string | null>(null);
  const [scenario, setScenario] = useState('');
  const [chatBackground, setChatBackground] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<{ src: string, type: 'photo' | 'background' } | null>(null);
  const [isSpicy, setIsSpicy] = useState(false);
  const [editingField, setEditingField] = useState<'scenario' | 'personality' | null>(null);

  const isEditing = !!botToEdit;

  useEffect(() => {
    if (isEditing) {
      setName(botToEdit.name);
      setDescription(botToEdit.description);
      setPersonality(botToEdit.personality);
      setPhoto(botToEdit.photo);
      setGif(botToEdit.gif || null);
      setScenario(botToEdit.scenario);
      setChatBackground(botToEdit.chatBackground || null);
      setIsSpicy(botToEdit.isSpicy || false);
    }
  }, [botToEdit, isEditing]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'photo' | 'gif' | 'background') => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
         if (fileType === 'background' || fileType === 'photo') {
            setImageToCrop({ src: result, type: fileType }); // Open cropper modal
        } else {
            setGif(result);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !personality || !photo) {
      alert('Please fill all required fields and upload a photo.');
      return;
    }
    
    const botData = { 
        name, 
        description, 
        personality, 
        photo, 
        gif, 
        scenario, 
        chatBackground, 
        personaId: botToEdit?.personaId, 
        isSpicy,
        chatBackgroundBrightness: botToEdit?.chatBackgroundBrightness
    };
    
    if (isEditing) {
        onSaveBot({ ...botToEdit, ...botData });
    } else {
        onSaveBot(botData);
    }
    onNavigate('humans');
  };

  const inputClass = "w-full bg-white/10 dark:bg-black/10 p-3 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner";
  const labelClass = "block text-sm font-medium";

  return (
    <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
       {imageToCrop && (
            <ImageCropper 
                imageSrc={imageToCrop.src}
                aspect={imageToCrop.type === 'photo' ? undefined : 9 / 16}
                outputShape={'rectangle'}
                onClose={() => setImageToCrop(null)}
                onCropComplete={(croppedImage) => {
                    if (imageToCrop.type === 'photo') {
                        setPhoto(croppedImage);
                    } else {
                        setChatBackground(croppedImage);
                    }
                    setImageToCrop(null);
                }}
            />
        )}
        {editingField === 'scenario' && (
            <FullScreenEditor
                label="Scenario (Opening Message)"
                initialValue={scenario}
                onSave={(newValue) => setScenario(newValue)}
                onClose={() => setEditingField(null)}
            />
        )}
        {editingField === 'personality' && (
            <FullScreenEditor
                label="Human Personality Prompt"
                initialValue={personality}
                onSave={(newValue) => setPersonality(newValue)}
                onClose={() => setEditingField(null)}
            />
        )}
      <header className="flex items-center mb-6 text-center">
        <h1 className="text-xl font-bold flex-1">{isEditing ? 'Edit Human' : 'Create New Human'}</h1>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto pb-24">
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="photo-upload" className={`${labelClass} mb-2`}>Human Photo *</label>
              <input id="photo-upload" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} className="hidden" />
              <label htmlFor="photo-upload" className="cursor-pointer block w-full h-32 bg-white/5 dark:bg-black/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-black/20 flex items-center justify-center">
                {photo ? (
                  <img src={photo} alt="Human preview" className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  <span className="text-gray-400 text-center text-sm p-2">Tap to upload</span>
                )}
              </label>
            </div>
            <div>
              <label htmlFor="gif-upload" className={`${labelClass} mb-2`}>Human GIF</label>
              <input id="gif-upload" type="file" accept="image/gif" onChange={(e) => handleFileUpload(e, 'gif')} className="hidden" />
              <label htmlFor="gif-upload" className="cursor-pointer block w-full h-32 bg-white/5 dark:bg-black/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-black/20 flex items-center justify-center">
                {gif ? (
                  <img src={gif} alt="GIF preview" className="h-full w-full object-contain rounded-2xl" />
                ) : (
                  <span className="text-gray-400 text-center text-sm p-2">Tap to upload</span>
                )}
              </label>
            </div>
        </div>
        <div>
           <label htmlFor="background-upload" className={`${labelClass} mb-2`}>Chat Background (9:16)</label>
            <input id="background-upload" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'background')} className="hidden" />
            <label htmlFor="background-upload" className="cursor-pointer block w-full h-48 bg-white/5 dark:bg-black/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-black/20 flex items-center justify-center">
                {chatBackground ? (
                    <img src={chatBackground} alt="Background preview" className="h-full w-full object-cover rounded-2xl" />
                ) : (
                    <span className="text-gray-400 text-center text-sm p-2">Tap to upload background</span>
                )}
            </label>
        </div>
        <div>
          <label htmlFor="name" className={`${labelClass} mb-2`}>Human Name *</label>
          <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label htmlFor="description" className={`${labelClass} mb-2`}>Short Description *</label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className={inputClass} rows={2} required />
        </div>
         <div>
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="scenario" className={labelClass}>Scenario (Opening Message)</label>
                <button type="button" onClick={() => setEditingField('scenario')} className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-black/20" aria-label="Expand Scenario Editor">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
                    </svg>
                </button>
            </div>
          <textarea id="scenario" value={scenario} onChange={e => setScenario(e.target.value)} className={inputClass} rows={3} placeholder="The Human's first message to the user..." />
        </div>
        <div>
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="personality" className={labelClass}>Human Personality Prompt *</label>
                <button type="button" onClick={() => setEditingField('personality')} className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-black/20" aria-label="Expand Personality Editor">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
                    </svg>
                </button>
            </div>
          <textarea id="personality" value={personality} onChange={e => setPersonality(e.target.value)} className={inputClass} rows={8} required placeholder="Describe the Human's character, traits, and how it should speak..." />
          <p className="text-xs text-gray-500 mt-1">You can create reusable personalities on the 'Personas' page and assign them to Humans.</p>
        </div>
        
        <div>
          <label htmlFor="spicy-toggle" className="flex items-center justify-between cursor-pointer p-3 bg-white/5 dark:bg-black/10 rounded-2xl">
            <span className="font-medium text-light-text dark:text-dark-text">Spicy Mode 🌶️</span>
            <div className="relative">
                <input id="spicy-toggle" type="checkbox" className="sr-only" checked={isSpicy} onChange={() => setIsSpicy(!isSpicy)} />
                <div className="block bg-white/20 dark:bg-black/20 w-14 h-8 rounded-full"></div>
                <div className={`absolute left-1 top-1 bg-white dark:bg-gray-400 w-6 h-6 rounded-full transition-transform duration-300 ease-in-out ${isSpicy ? 'transform translate-x-6 bg-accent' : ''}`}></div>
            </div>
          </label>
           <p className="text-xs text-gray-500 mt-1 pl-1">When enabled, the bot gains a playful, flirty, or spicy tone.</p>
        </div>

        <button type="submit" className="w-full bg-accent text-white font-bold py-4 px-4 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50 shadow-lg hover:shadow-accent/20">
          {isEditing ? 'Update Human' : 'Save Human'}
        </button>
      </form>
    </div>
  );
};

export default CreationPage;