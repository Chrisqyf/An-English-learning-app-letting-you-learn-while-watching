import React from 'react';
import { Subtitle } from '../types';
import { Link, Sparkles, Bookmark } from 'lucide-react';
import clsx from 'clsx';

interface SubtitleCardProps {
  subtitle: Subtitle;
  status: 'past' | 'current' | 'future';
  showEn: boolean;
  showCn: boolean;
  isBookmarked: boolean;
  onSeek: (time: number) => void;
  onMerge: (id: string) => void;
  onWordClick: (word: string, rect: DOMRect, context: string) => void;
  onAnalyze: (subtitle: Subtitle) => void;
  onBookmark: (subtitle: Subtitle) => void;
}

// Using React.memo to prevent unnecessary re-renders of the list items
export const SubtitleCard = React.memo<SubtitleCardProps>(({
  subtitle,
  status,
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

  // Helper to render text as clickable words
  // Memoize this to avoid re-calculating word splits on every render
  const interactiveText = React.useMemo(() => {
    if (!subtitle.text_en) return null;
    return subtitle.text_en.split(' ').map((word, i) => (
      <span
        key={i}
        className="inline-block mr-1 rounded px-0.5 transition-colors duration-200 cursor-pointer hover:bg-blue-500/30 hover:text-blue-200"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          // Remove punctuation for lookup
          const cleanWord = word.replace(/[.,!?;:()"]/g, '');
          onWordClick(cleanWord, rect, subtitle.text_en);
        }}
      >
        {word}
      </span>
    ));
  }, [subtitle.text_en, onWordClick]);

  return (
    <div className="relative group mb-3">
      {/* Card Container 
          - glp-card: enables content-visibility auto (native performance boost)
          - data-status: used by CSS to target specific cards for blurring in 'focus' mode
      */}
      <div 
        className={clsx(
          "glp-card relative p-4 rounded-lg border-l-4 transition-all duration-200 bg-slate-800 hover:bg-slate-750",
          isActive ? "border-blue-500 bg-slate-750 shadow-lg shadow-blue-900/10" : "border-transparent opacity-80 hover:opacity-100"
        )}
        data-status={status}
        onClick={() => onSeek(subtitle.start)}
      >
        <div className="flex justify-between items-start mb-2">
           <span className="text-xs font-mono text-slate-500">
             {new Date(subtitle.start * 1000).toISOString().substr(14, 5)}
           </span>
           
           {/* Actions Toolbar (Visible on Hover or Active) */}
           <div className={clsx("flex gap-2 transition-opacity duration-200", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
              <button 
                onClick={(e) => { e.stopPropagation(); onAnalyze(subtitle); }}
                className="p-1 hover:bg-slate-600 rounded text-purple-400 hover:text-purple-300"
                title="AI Analysis"
              >
                <Sparkles size={14} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onBookmark(subtitle); }}
                className={clsx(
                  "p-1 hover:bg-slate-600 rounded transition-colors duration-200",
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
          // glp-text: targeted by CSS filters
          <p className="glp-text text-lg leading-relaxed text-slate-200 mb-2">
            {interactiveText}
          </p>
        )}
        
        {showCn && (
          // glp-text: targeted by CSS filters
          <p className="glp-text text-sm text-slate-400">
            {subtitle.text_cn}
          </p>
        )}
      </div>
      
      {/* Visual connector for merge suggestion */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10" />
    </div>
  );
});

SubtitleCard.displayName = 'SubtitleCard';