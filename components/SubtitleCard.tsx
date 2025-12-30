import React from 'react';
import { Subtitle } from '../types';
import { Link, Sparkles, Bookmark } from 'lucide-react';
import clsx from 'clsx';

interface SubtitleCardProps {
  subtitle: Subtitle;
  status: 'past' | 'current' | 'future';
  blurMode: 'none' | 'focus' | 'all';
  showEn: boolean;
  showCn: boolean;
  isBookmarked: boolean;
  onSeek: (time: number) => void;
  onMerge: (id: string) => void;
  onWordClick: (word: string, rect: DOMRect, context: string) => void;
  onAnalyze: (text: string) => void;
  onBookmark: (subtitle: Subtitle) => void;
}

export const SubtitleCard: React.FC<SubtitleCardProps> = ({
  subtitle,
  status,
  blurMode,
  showEn,
  showCn,
  isBookmarked,
  onSeek,
  onMerge,
  onWordClick,
  onAnalyze,
  onBookmark
}) => {
  const isActive = status === 'current';

  // Determine if this specific card should be blurred based on mode and status
  // Focus mode: Blur current and future. Past is clear.
  const isBlurred = 
    (blurMode === 'all') || 
    (blurMode === 'focus' && (status === 'future' || status === 'current'));

  // Helper to render text as clickable words
  const renderInteractiveText = (text: string) => {
    if (!text) return null;
    return text.split(' ').map((word, i) => (
      <span
        key={i}
        className="inline-block mr-1 rounded px-0.5 transition cursor-pointer hover:bg-blue-500/30 hover:text-blue-200"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          // Remove punctuation for lookup
          const cleanWord = word.replace(/[.,!?;:()"]/g, '');
          onWordClick(cleanWord, rect, text);
        }}
      >
        {word}
      </span>
    ));
  };

  return (
    <div className="relative group mb-3">
      {/* Card Container */}
      <div 
        className={clsx(
          "relative p-4 rounded-lg border-l-4 transition-all duration-300 bg-slate-800 hover:bg-slate-750",
          isActive ? "border-blue-500 bg-slate-750 shadow-lg shadow-blue-900/10" : "border-transparent opacity-80 hover:opacity-100"
        )}
        onClick={() => onSeek(subtitle.start)}
      >
        <div className="flex justify-between items-start mb-2">
           <span className="text-xs font-mono text-slate-500">
             {new Date(subtitle.start * 1000).toISOString().substr(14, 5)}
           </span>
           
           {/* Actions Toolbar (Visible on Hover or Active) */}
           <div className={clsx("flex gap-2 transition-opacity", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
              <button 
                onClick={(e) => { e.stopPropagation(); onAnalyze(subtitle.text_en); }}
                className="p-1 hover:bg-slate-600 rounded text-purple-400 hover:text-purple-300"
                title="AI Analysis"
              >
                <Sparkles size={14} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onBookmark(subtitle); }}
                className={clsx(
                  "p-1 hover:bg-slate-600 rounded transition",
                  isBookmarked ? "text-yellow-400" : "text-slate-400 hover:text-yellow-400"
                )}
                title="Bookmark Sentence"
              >
                <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onMerge(subtitle.id); }}
                className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white"
                title="Merge with next"
              >
                <Link size={14} />
              </button>
           </div>
        </div>

        {showEn && (
          // Use 'group-hover:blur-none' on the P tag to reveal the whole sentence when the user hovers the Card (the 'group' parent)
          <p className={clsx(
            "text-lg leading-relaxed text-slate-200 mb-2 transition-all duration-300",
            isBlurred ? "blur-md select-none group-hover:blur-none" : ""
          )}>
            {renderInteractiveText(subtitle.text_en)}
          </p>
        )}
        
        {showCn && (
          <p className={clsx(
            "text-sm text-slate-400 transition-all duration-300",
             isBlurred ? "blur-sm select-none group-hover:blur-none" : ""
          )}>
            {subtitle.text_cn}
          </p>
        )}
      </div>
      
      {/* Visual connector for merge suggestion */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
    </div>
  );
};