import React, { useState, useEffect } from 'react';
import _ReactPlayer from 'react-player';
import { RotateCcw, FileWarning, Keyboard, MousePointerClick, PlayCircle, FileVideo, Upload } from 'lucide-react';
import { AppLanguage, getT } from '../translations';

// Robust extraction of the ReactPlayer component from the imported module
const ReactPlayer = (_ReactPlayer as any).default || _ReactPlayer;

interface VideoPlayerProps {
  url: string;
  playing: boolean;
  playbackRate?: number; // Added playbackRate prop
  appLanguage?: AppLanguage;
  onProgress: (state: { playedSeconds: number }) => void;
  onDuration: (duration: number) => void;
  onEnded: () => void;
  onReady: () => void;
  playerRef: React.RefObject<any>;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  className?: string;
  onLoadDefault?: () => void; // Kept for interface compatibility, but won't be used
  onVideoSelect?: (url: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  playing,
  playbackRate = 1.0, // Default to 1.0
  appLanguage = 'zh',
  onProgress,
  onDuration,
  onEnded,
  onReady,
  playerRef,
  className,
  onVideoSelect
}) => {
  const [errorType, setErrorType] = useState<'youtube_restricted' | 'generic' | null>(null);
  const t = getT(appLanguage);

  // If the component failed to load correctly, show a fallback
  if (!ReactPlayer) {
    return <div className="text-red-500 p-4">Error loading video player component.</div>;
  }

  // Reset error when URL changes
  useEffect(() => {
    setErrorType(null);
  }, [url]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onVideoSelect) {
      const newUrl = URL.createObjectURL(file);
      onVideoSelect(newUrl);
    }
  };

  // State: No Video Loaded (Intro Screen)
  if (!url) {
    return (
      <div className={`relative bg-slate-900 w-full h-full flex items-center justify-center p-8 ${className}`}>
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-100 mb-2">{t.welcomeTitle}</h2>
            <p className="text-slate-400">{t.welcomeSub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Shortcuts Column */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <Keyboard size={20} />
                <h3 className="font-semibold uppercase tracking-wider text-sm">{t.shortcutsTitle}</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-300">
                <li className="flex justify-between">
                  <span>{t.spacePlayPause}</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">Space</span>
                </li>
                <li className="flex justify-between">
                  <span>{t.prevSentence}</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">← / A</span>
                </li>
                <li className="flex justify-between">
                  <span>{t.nextSentence}</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">→ / D</span>
                </li>
                <li className="flex justify-between">
                  <span>{t.replayCurrent}</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">S</span>
                </li>
                <li className="flex justify-between">
                  <span>{t.cycleBlur}</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">B</span>
                </li>
                <li className="flex justify-between">
                  <span>{t.mergeWithPrev}</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">Q</span>
                </li>
                <li className="flex justify-between">
                  <span>{t.mergeWithNext}</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">E</span>
                </li>
                <li className="flex justify-between">
                  <span>{t.undoKey}</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">Z / Ctrl+Z</span>
                </li>
              </ul>
            </div>

            {/* Actions Column */}
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-green-400">
                    <MousePointerClick size={20} />
                    <h3 className="font-semibold uppercase tracking-wider text-sm">{t.featuresTitle}</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-400 list-disc list-inside">
                    <li>{t.aiDefinitionFeature}</li>
                    <li>{t.autoPauseFeature}</li>
                    <li>{t.mergeSubsFeature}</li>
                    <li>{t.notebookFeature}</li>
                  </ul>
                </div>
                
                <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 text-center">
                   <FileVideo className="mx-auto text-slate-500 mb-2" size={24} />
                   <p className="text-xs text-slate-400 mb-3">{t.selectVideoNotice}</p>
                   {onVideoSelect && (
                     <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition">
                       <Upload size={15} />
                       <span>{t.selectVideoFileBtn}</span>
                       <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                     </label>
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State: Error
  if (errorType) {
    const isYouTubeError = errorType === 'youtube_restricted';
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400 p-8 text-center flex-col">
         <div className="mb-3 text-amber-500">
            <FileWarning size={48} className="mx-auto opacity-80" />
         </div>
         <p className="mb-2 text-slate-100 font-bold text-lg">
           {t.playbackErrorTitle}
         </p>
         <p className="text-sm mb-6 max-w-md text-slate-400 leading-relaxed">
           {isYouTubeError 
             ? "This YouTube video cannot be embedded for playback." 
             : t.playbackErrorMsg}
         </p>
         
         <div className="flex flex-col gap-3 items-center">
           {onVideoSelect && (
             <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition">
               <Upload size={16} />
               <span>{t.selectVideoFileBtn}</span>
               <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
             </label>
           )}
         </div>
      </div>
    );
  }

  // State: Playing
  return (
    <div className={`relative bg-black w-full h-full flex items-center justify-center ${className}`}>
      <div className="absolute inset-0">
        <ReactPlayer
          ref={playerRef}
          url={url}
          width="100%"
          height="100%"
          playing={playing}
          playbackRate={playbackRate}
          controls={true}
          progressInterval={50} // High frequency updates for precise Auto-Pause
          onProgress={onProgress}
          onDuration={onDuration}
          onEnded={onEnded}
          onReady={onReady}
          onError={(e: any) => {
            console.error("ReactPlayer Error:", e);
            if (e === 150 || e === 101 || e === 153) {
              setErrorType('youtube_restricted');
            } else {
              setErrorType('generic');
            }
          }}
          config={{
            youtube: {
              playerVars: { 
                showinfo: 0, 
                rel: 0,
                modestbranding: 1,
                origin: window.location.origin 
              }
            }
          }}
        />
      </div>
    </div>
  );
};