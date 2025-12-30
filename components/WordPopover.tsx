import React, { useEffect, useRef } from 'react';
import { Loader2, Star, X } from 'lucide-react';
import { AIResponse, SavedWord } from '../types';

interface WordPopoverProps {
  word: string;
  context: string;
  loading: boolean;
  data: AIResponse | null;
  position: { x: number, y: number } | null;
  onClose: () => void;
  onSave: (word: SavedWord) => void;
  isSaved: boolean;
  error?: string | null;
}

export const WordPopover: React.FC<WordPopoverProps> = ({ 
  word, 
  context,
  loading, 
  data, 
  position, 
  onClose,
  onSave,
  isSaved,
  error
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!position) return null;

  // Calculate position to keep it on screen (simplified)
  const style: React.CSSProperties = {
    top: Math.min(position.y + 10, window.innerHeight - 300),
    left: Math.min(position.x, window.innerWidth - 320),
  };

  const handleSave = () => {
    if (data) {
      const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
        
      onSave({
        id,
        word,
        definition: data.definition,
        translation: data.translation,
        context,
        timestamp: Date.now()
      });
    }
  };

  return (
    <div 
      ref={popoverRef}
      style={style} 
      className="fixed z-50 w-80 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-lg capitalize truncate pr-4 text-blue-400">{word}</h3>
        <div className="flex gap-2">
          {data && !loading && (
            <button 
              onClick={handleSave} 
              disabled={isSaved}
              className={`p-1 rounded hover:bg-slate-700 transition ${isSaved ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-400'}`}
              title="Save to Vocabulary"
            >
              <Star size={18} fill={isSaved ? "currentColor" : "none"} />
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
      </div>
      
      <div className="p-4 min-h-[100px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-4">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-sm">Analyzing context...</span>
          </div>
        ) : error ? (
           <div className="text-red-400 text-sm text-center py-2">{error}</div>
        ) : data ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Definition</p>
              <p className="text-slate-200 leading-relaxed">{data.definition}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Translation</p>
              <p className="text-slate-200">{data.translation}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Usage</p>
              <p className="text-slate-300 italic border-l-2 border-blue-500 pl-2 bg-slate-800/50 py-1 rounded-r">"{data.usage_example}"</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};