import React, { useState, useEffect, useCallback } from 'react';
import type { BotProfile, ConversationMode, BotGender } from '../types';
import ImageCropper from './ImageCropper';
import FullScreenEditor from './FullScreenEditor';

// Declare localforage for TypeScript since it's loaded via script tag
declare const localforage: any;

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
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null);
  const [gif, setGif] = useState<string | null>(null);
  const [scenario, setScenario] = useState('');
  const [chatBackground, setChatBackground] = useState<string | null>(null);
  const [originalChatBackground, setOriginalChatBackground] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [originalGalleryImages, setOriginalGalleryImages] = useState<string[]>([]);
  
  // Crop state
  const [imageToCrop, setImageToCrop] = useState<{ src: string, type: 'photo' | 'background' | 'gallery', index?: number } | null>(null);
  
  // New States for Modes
  const [conversationMode, setConversationMode] = useState<ConversationMode>('normal');
  const [gender, setGender] = useState<BotGender>('female');

  // UI States
  const [editingField, setEditingField] = useState<'scenario' | 'personality' | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isModeSectionExpanded, setIsModeSectionExpanded] = useState(false);

  const isEditing = !!botToEdit;

  // --- AUTO-SAVE LOGIC ---
  const getDraftKey = useCallback(() => {
    return isEditing && botToEdit ? `draft_personality_${botToEdit.id}` : 'draft_personality_new';
  }, [isEditing, botToEdit]);

  // Load Draft on Mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const key = getDraftKey();
        const savedDraft = await localforage.getItem(key);
        if (savedDraft && typeof savedDraft === 'string' && savedDraft.trim() !== '') {
          setPersonality((prev) => {
             if (isEditing && botToEdit && prev === botToEdit.personality && savedDraft !== prev) {
                 return savedDraft;
             }
             if (!isEditing && !prev) {
                 return savedDraft;
             }
             return prev;
          });
        }
      } catch (e) {
        console.error("Failed to load draft personality", e);
      }
    };
    loadDraft();
  }, [getDraftKey, isEditing, botToEdit]);

  // Save Draft on Change (Debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const key = getDraftKey();
        if (personality) {
           await localforage.setItem(key, personality);
        }
      } catch (e) {
        console.error("Failed to save draft personality", e);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [personality, getDraftKey]);


  useEffect(() => {
    if (isEditing) {
      setName(botToEdit.name);
      setDescription(botToEdit.description);
      setPersonality(prev => prev || botToEdit.personality);
      
      setPhoto(botToEdit.photo);
      setOriginalPhoto(botToEdit.originalPhoto || null);
      setGif(botToEdit.gif || null);
      setScenario(botToEdit.scenario);
      setChatBackground(botToEdit.chatBackground || null);
      setOriginalChatBackground(botToEdit.originalChatBackground || null);
      setGalleryImages(botToEdit.galleryImages || []);
      setOriginalGalleryImages(botToEdit.originalGalleryImages || botToEdit.galleryImages || []);
      
      if (botToEdit.conversationMode) {
          setConversationMode(botToEdit.conversationMode);
      } else {
          setConversationMode(botToEdit.isSpicy ? 'spicy' : 'normal');
      }
      
      if (botToEdit.gender) {
          setGender(botToEdit.gender);
      } else {
          setGender('female');
      }
    }
  }, [botToEdit, isEditing]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'photo' | 'gif' | 'background' | 'gallery') => {
    if (e.target.files) {
      if (fileType === 'gallery') {
         const files: File[] = Array.from(e.target.files);
         files.forEach(file => {
             const reader = new FileReader();
             reader.onload = (event) => {
                 try {
                     const result = event.target?.result as string;
                     // Only append for NEW uploads
                     setGalleryImages(prev => [...prev, result]);
                     setOriginalGalleryImages(prev => [...prev, result]);
                 } catch (err) {
                     console.error("Error reading file", err);
                 }
             };
             reader.readAsDataURL(file);
         });
      } else if (e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
              const result = event.target?.result as string;
               if (fileType === 'background' || fileType === 'photo') {
                  setImageToCrop({ src: result, type: fileType }); 
               } else {
                  setGif(result);
               }
          } catch (err) {
              console.error("Error reading file", err);
          }
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    }
  };

  const removeGalleryImage = (index: number) => {
      setGalleryImages(prev => prev.filter((_, i) => i !== index));
      setOriginalGalleryImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const openGalleryCropper = (index: number) => {
      try {
          // Prefer the original image for cropping to maintain max quality
          // Fallback to current gallery image if original is missing
          const img = originalGalleryImages[index] || galleryImages[index];
          if (img) {
              // Pass the INDEX so we know exactly which one to replace
              setImageToCrop({ src: img, type: 'gallery', index });
          }
      } catch (err) {
          console.error("Error opening cropper", err);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        originalPhoto,
        gif, 
        scenario, 
        chatBackground, 
        originalChatBackground, 
        personaId: botToEdit?.personaId, 
        isSpicy: conversationMode === 'spicy' || conversationMode === 'extreme',
        conversationMode,
        gender,
        chatBackgroundBrightness: botToEdit?.chatBackgroundBrightness,
        galleryImages,
        originalGalleryImages
    };
    
    if (isEditing) {
        onSaveBot({ ...botToEdit, ...botData });
    } else {
        onSaveBot(botData);
    }

    try {
        const key = getDraftKey();
        await localforage.removeItem(key);
    } catch(err) {
        console.warn("Failed to clear draft", err);
    }

    onNavigate('humans');
  };

  const handleCopyConfiguration = () => {
    const configText = `Human Name: ${name}
Short Description: ${description}
Scenario (Opening Message): ${scenario}

Human Personality Prompt:
${personality}`;

    navigator.clipboard.writeText(configText).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    }).catch(err => {
        console.error('Failed to copy configuration:', err);
        alert('Failed to copy configuration.');
    });
  };

  const inputClass = "w-full bg-white/10 dark:bg-black/10 p-3 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner";
  const labelClass = "block text-sm font-medium";

  return (
    <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
       {imageToCrop && (
            <ImageCropper 
                imageSrc={imageToCrop.src}
                aspect={imageToCrop.type === 'background' ? 9 / 16 : undefined}
                outputShape={'rectangle'}
                onClose={() => setImageToCrop(null)}
                onCropComplete={(croppedImage) => {
                    // Safety check
                    if (!imageToCrop) return;

                    if (imageToCrop.type === 'photo') {
                        setPhoto(croppedImage);
                        setOriginalPhoto(imageToCrop.src); 
                    } else if (imageToCrop.type === 'background') {
                        setChatBackground(croppedImage);
                        setOriginalChatBackground(imageToCrop.src);
                    } else if (imageToCrop.type === 'gallery' && typeof imageToCrop.index === 'number') {
                        // CRITICAL FIX: Strictly replace the image at the specific index.
                        // Do NOT use push/append.
                        setGalleryImages(prev => {
                            if (imageToCrop.index! < 0 || imageToCrop.index! >= prev.length) return prev;
                            const newImages = [...prev];
                            newImages[imageToCrop.index!] = croppedImage;
                            return newImages;
                        });
                        // Note: We do NOT update originalGalleryImages here. 
                        // We keep the original raw file in originalGalleryImages[index] 
                        // so the user can re-crop from the source later if they want.
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
      <header className="flex items-center justify-center mb-6 relative">
        <h1 className="text-xl font-bold">{isEditing ? 'Edit Human' : 'Create New Human'}</h1>
        <button 
            type="button"
            onClick={handleCopyConfiguration}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 w-10 h-10 flex items-center justify-center transition-colors"
            aria-label="Copy configuration"
        >
            {copySuccess ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )}
        </button>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto pb-24">
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="photo-upload" className={`${labelClass} mb-2`}>Human Photo *</label>
              <input id="photo-upload" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} className="hidden" />
              <label htmlFor="photo-upload" className="cursor-pointer block w-full h-32 bg-white/5 dark:bg-black/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-black/20 flex items-center justify-center relative overflow-hidden">
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
              <label htmlFor="gif-upload" className="cursor-pointer block w-full h-32 bg-white/5 dark:bg-black/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-black/20 flex items-center justify-center relative overflow-hidden">
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
            <label htmlFor="background-upload" className="cursor-pointer block w-full h-48 bg-white/5 dark:bg-black/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-black/20 flex items-center justify-center relative overflow-hidden">
                {chatBackground ? (
                    <img src={chatBackground} alt="Background preview" className="h-full w-full object-cover rounded-2xl" />
                ) : (
                    <span className="text-gray-400 text-center text-sm p-2">Tap to upload background</span>
                )}
            </label>
        </div>

        <div>
            <label htmlFor="gallery-upload" className={`${labelClass} mb-2`}>Additional Images (Gallery)</label>
            <input id="gallery-upload" type="file" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'gallery')} className="hidden" />
            
            <div className="flex flex-wrap gap-2">
                <label htmlFor="gallery-upload" className="cursor-pointer w-24 h-24 bg-white/5 dark:bg-black/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-black/20 flex items-center justify-center flex-shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </label>
                {galleryImages.map((img, idx) => (
                    <div key={idx} className="w-24 h-24 relative group flex-shrink-0">
                        <img 
                            src={img} 
                            alt={`Gallery ${idx}`} 
                            className="w-full h-full object-cover rounded-2xl border border-white/10 cursor-pointer" 
                            onClick={() => openGalleryCropper(idx)}
                        />
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeGalleryImage(idx); }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl pointer-events-none">
                            Tap to Crop
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Upload 3-10 images. Tap an image to crop/edit.</p>
        </div>
        
        {/* COLLAPSIBLE MODE SECTION */}
        <div className="bg-white/5 dark:bg-black/10 rounded-2xl overflow-hidden transition-all duration-300">
             <button 
                type="button" 
                onClick={() => setIsModeSectionExpanded(!isModeSectionExpanded)} 
                className="w-full p-4 flex justify-between items-center bg-white/5 dark:bg-black/5 hover:bg-white/10 transition-colors"
            >
                 <span className={`${labelClass} mb-0`}>Conversation Mode & Identity</span>
                 <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isModeSectionExpanded ? 'rotate-180' : ''}`} 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
             </button>
             
             {isModeSectionExpanded && (
                <div className="p-4 space-y-4 border-t border-white/10 dark:border-black/20 animate-fadeIn">
                     {/* GENDER */}
                    <div>
                        <label className={`${labelClass} mb-2`}>Bot Gender / Identity</label>
                        <div className="flex flex-wrap gap-2">
                             <button
                                type="button"
                                onClick={() => setGender('female')}
                                className={`flex-1 py-3 px-2 rounded-xl text-sm font-medium transition-all ${gender === 'female' ? 'bg-accent text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                             >
                                Female 👩
                             </button>
                             <button
                                type="button"
                                onClick={() => setGender('male')}
                                className={`flex-1 py-3 px-2 rounded-xl text-sm font-medium transition-all ${gender === 'male' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                             >
                                Men Mode 👨
                             </button>
                             <button
                                type="button"
                                onClick={() => setGender('fluid')}
                                className={`flex-1 py-3 px-2 rounded-xl text-sm font-medium transition-all ${gender === 'fluid' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                             >
                                Fluid/Other ✨
                             </button>
                        </div>
                         <p className="text-xs text-gray-500 mt-2 pl-1">Men Mode enforces strict Male POV rules.</p>
                    </div>

                    {/* CONVERSATION MODE */}
                    <div>
                        <label className={`${labelClass} mb-2`}>Conversation Mode</label>
                        <div className="space-y-2">
                             <button
                                type="button"
                                onClick={() => setConversationMode('normal')}
                                className={`w-full py-3 px-4 rounded-xl text-left flex items-center justify-between transition-all ${conversationMode === 'normal' ? 'bg-green-600/20 border border-green-500 text-green-400' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                             >
                                <div>
                                    <span className="font-bold block text-sm">Normal Mode</span>
                                    <span className="text-xs opacity-70">Strict personality, no added intimacy.</span>
                                </div>
                                {conversationMode === 'normal' && <span className="text-green-500 text-xl">✓</span>}
                             </button>

                             <button
                                type="button"
                                onClick={() => setConversationMode('spicy')}
                                className={`w-full py-3 px-4 rounded-xl text-left flex items-center justify-between transition-all ${conversationMode === 'spicy' ? 'bg-accent/20 border border-accent text-accent' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                             >
                                <div>
                                    <span className="font-bold block text-sm">Spicy Mode 🌶️</span>
                                    <span className="text-xs opacity-70">Light desire, playful teasing, soft tension.</span>
                                </div>
                                 {conversationMode === 'spicy' && <span className="text-accent text-xl">✓</span>}
                             </button>

                             <button
                                type="button"
                                onClick={() => setConversationMode('extreme')}
                                className={`w-full py-3 px-4 rounded-xl text-left flex items-center justify-between transition-all ${conversationMode === 'extreme' ? 'bg-red-600/20 border border-red-500 text-red-400' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                             >
                                <div>
                                    <span className="font-bold block text-sm">Extreme Mode 🔥</span>
                                    <span className="text-xs opacity-70">Unrestricted desire, raw output, stronger vocabulary.</span>
                                </div>
                                {conversationMode === 'extreme' && <span className="text-red-500 text-xl">✓</span>}
                             </button>
                        </div>
                    </div>
                </div>
             )}
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
        
        <button type="submit" className="w-full bg-accent text-white font-bold py-4 px-4 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50 shadow-lg hover:shadow-accent/20">
          {isEditing ? 'Update Human' : 'Save Human'}
        </button>
      </form>
    </div>
  );
};

export default CreationPage;