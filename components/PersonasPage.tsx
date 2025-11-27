import React, { useState, useEffect, useRef } from 'react';
import type { Persona, BotProfile } from '../types';
import ImageCropper from './ImageCropper';

interface AssignPersonaModalProps {
    persona: Persona;
    bots: BotProfile[];
    onAssign: (personaId: string, botIds: string[]) => void;
    onClose: () => void;
}

const AssignPersonaModal: React.FC<AssignPersonaModalProps> = ({ persona, bots, onAssign, onClose }) => {
    const [selectedBotIds, setSelectedBotIds] = useState<Set<string>>(() => 
        new Set(bots.filter(b => b.personaId === persona.id).map(b => b.id))
    );

    const handleToggleBot = (botId: string) => {
        const newSelection = new Set(selectedBotIds);
        if (newSelection.has(botId)) {
            newSelection.delete(botId);
        } else {
            newSelection.add(botId);
        }
        setSelectedBotIds(newSelection);
    };

    const handleSave = () => {
        onAssign(persona.id, Array.from(selectedBotIds));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn p-4" onClick={onClose}>
            <div className="bg-dark-bg rounded-2xl shadow-2xl relative max-w-md w-full mx-auto p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Assign '{persona.name}'</h2>
                <p className="text-sm text-gray-400 mb-4">Select which Humans should use this persona. This will override their current personality prompt.</p>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {bots.map(bot => (
                        <label key={bot.id} className="flex items-center bg-white/5 p-3 rounded-lg cursor-pointer hover:bg-white/10">
                            <input
                                type="checkbox"
                                className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-accent focus:ring-accent"
                                checked={selectedBotIds.has(bot.id)}
                                onChange={() => handleToggleBot(bot.id)}
                            />
                            <span className="ml-3 font-medium">{bot.name}</span>
                        </label>
                    ))}
                </div>
                 <div className="flex gap-2 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-2xl transition-colors">Cancel</button>
                    <button type="button" onClick={handleSave} className="flex-1 bg-accent text-white font-bold py-3 px-4 rounded-2xl transition-colors">Save Assignments</button>
                </div>
            </div>
        </div>
    );
};


interface PersonasPageProps {
  personas: Persona[];
  bots: BotProfile[];
  onSave: (persona: Omit<Persona, 'id'> | Persona) => void;
  onDelete: (id: string) => void;
  onAssign: (personaId: string, botIds: string[]) => void;
}

const PersonasPage: React.FC<PersonasPageProps> = ({ personas, bots, onSave, onDelete, onAssign }) => {
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [assigningPersona, setAssigningPersona] = useState<Persona | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  const inputClass = "w-full bg-white/10 dark:bg-black/10 p-3 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300 shadow-inner";
  const labelClass = "block text-sm font-medium mb-2";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setActiveMenuId(null);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImageToCrop(result);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleEdit = (persona: Persona) => {
    setEditingPersona(persona);
    setName(persona.name);
    setDescription(persona.description || '');
    setPersonality(persona.personality);
    setPhoto(persona.photo || null);
    window.scrollTo(0, 0);
    setActiveMenuId(null);
  };

  const handleClone = (persona: Persona) => {
    const newId = `persona-${Date.now()}`;
    const clonedPersona = { 
        ...persona, 
        id: newId, 
        name: `${persona.name} (Clone)` 
    };
    
    // Save to global state immediately
    onSave(clonedPersona);
    
    // Open in editor
    handleEdit(clonedPersona);
    setActiveMenuId(null);
  };

  const handleCancel = () => {
    setEditingPersona(null);
    setName('');
    setDescription('');
    setPersonality('');
    setPhoto(null);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !personality) {
          alert("Please fill in name and personality prompt.");
          return;
      }
      const personaData = { name, description, personality, photo: photo || undefined };

      if (editingPersona) {
          onSave({ id: editingPersona.id, ...personaData });
      } else {
          onSave(personaData);
      }
      handleCancel();
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
        {assigningPersona && (
            <AssignPersonaModal 
                persona={assigningPersona} 
                bots={bots} 
                onAssign={onAssign} 
                onClose={() => setAssigningPersona(null)} 
            />
        )}
        {imageToCrop && (
            <ImageCropper
                imageSrc={imageToCrop}
                aspect={1}
                onClose={() => setImageToCrop(null)}
                onCropComplete={(croppedImage) => {
                    setPhoto(croppedImage);
                    setImageToCrop(null);
                }}
            />
        )}
        <header className="flex items-center mb-6 gap-2">
            <img src="https://i.postimg.cc/qRB2Gnw2/Gemini-Generated-Image-vfkohrvfkohrvfko-1.png" alt="Zia.ai Logo" className="h-8 w-8"/>
            <h1 className="text-3xl font-bold flex-1">Manage Personas</h1>
        </header>

        <div className="flex-1 overflow-y-auto pb-24 space-y-8">
            <form onSubmit={handleSubmit} className="p-4 bg-white/5 dark:bg-black/10 rounded-2xl space-y-4">
                <h2 className="text-lg font-semibold">{editingPersona ? 'Edit Persona' : 'Create New Persona'}</h2>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <label htmlFor="persona-photo-upload" className={labelClass}>Photo</label>
                        <input id="persona-photo-upload" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        <label htmlFor="persona-photo-upload" className="cursor-pointer block w-24 h-24 bg-white/5 dark:bg-black/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-black/20 flex items-center justify-center">
                            {photo ? (
                            <img src={photo} alt="Persona preview" className="h-full w-full object-cover rounded-2xl" />
                            ) : (
                            <span className="text-gray-400 text-center text-xs p-1">Tap to upload</span>
                            )}
                        </label>
                    </div>
                    <div className="flex-grow space-y-4">
                        <div>
                            <label htmlFor="persona-name" className={labelClass}>Persona Name *</label>
                            <input id="persona-name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
                        </div>
                        <div>
                            <label htmlFor="persona-desc" className={labelClass}>Description (Optional)</label>
                            <input id="persona-desc" type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
                        </div>
                    </div>
                </div>
                <div>
                    <label htmlFor="persona-personality" className={labelClass}>Personality Prompt *</label>
                    <textarea id="persona-personality" value={personality} onChange={e => setPersonality(e.target.value)} className={inputClass} rows={5} required />
                </div>
                <div className="flex gap-2">
                    {editingPersona && <button type="button" onClick={handleCancel} className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-2xl transition-colors">Cancel</button>}
                    <button type="submit" className="flex-1 bg-accent text-white font-bold py-3 px-4 rounded-2xl transition-colors">{editingPersona ? 'Update' : 'Save'}</button>
                </div>
            </form>

            <div className="space-y-3" ref={menuRef}>
                <h2 className="text-lg font-semibold">Existing Personas</h2>
                {personas.length > 0 ? (
                    personas.map(persona => (
                        <div key={persona.id} className="bg-white/5 dark:bg-black/10 rounded-2xl p-3 flex justify-between items-center gap-3 relative">
                            {persona.photo && <img src={persona.photo} alt={persona.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                            <div className="flex-grow min-w-0">
                                <p className="font-medium truncate">{persona.name}</p>
                                {persona.description && <p className="text-xs text-gray-400 truncate">{persona.description}</p>}
                            </div>
                            
                            <div className="relative flex-shrink-0">
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setActiveMenuId(activeMenuId === persona.id ? null : persona.id); 
                                    }} 
                                    className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 text-gray-300 transition-colors"
                                    aria-label="Options"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                    </svg>
                                </button>
                                
                                {activeMenuId === persona.id && (
                                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl animate-fadeIn z-30 overflow-hidden border border-white/10">
                                        <button 
                                            onClick={() => { setAssigningPersona(persona); setActiveMenuId(null); }} 
                                            className="w-full text-left px-4 py-3 text-sm text-white hover:bg-accent border-b border-gray-700/50 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            Assign to Human
                                        </button>
                                        <button 
                                            onClick={() => handleEdit(persona)} 
                                            className="w-full text-left px-4 py-3 text-sm text-white hover:bg-accent border-b border-gray-700/50 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                            Edit Persona
                                        </button>
                                        <button 
                                            onClick={() => handleClone(persona)} 
                                            className="w-full text-left px-4 py-3 text-sm text-white hover:bg-accent border-b border-gray-700/50 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                            Clone Persona
                                        </button>
                                        <button 
                                            onClick={() => { onDelete(persona.id); setActiveMenuId(null); }} 
                                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Delete Persona
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 pt-4">No personas created yet.</p>
                )}
            </div>
        </div>
    </div>
  );
};

export default PersonasPage;