import React, { useState, useEffect } from 'react';
import _ReactPlayer from 'react-player';
import { RotateCcw, FileWarning, Keyboard, MousePointerClick, PlayCircle, FileVideo } from 'lucide-react';

// Robust extraction of the ReactPlayer component from the imported module
const ReactPlayer = (_ReactPlayer as any).default || _ReactPlayer;

interface VideoPlayerProps {
  url: string;
  playing: boolean;
  onProgress: (state: { playedSeconds: number }) => void;
  onDuration: (duration: number) => void;
  onEnded: () => void;
  onReady: () => void;
  playerRef: React.RefObject<any>;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  className?: string;
  onLoadDefault?: () => void; // Kept for interface compatibility, but won't be used
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  playing,
  onProgress,
  onDuration,
  onEnded,
  onReady,
  playerRef,
  className
}) => {
  const [errorType, setErrorType] = useState<'youtube_restricted' | 'generic' | null>(null);

  // If the component failed to load correctly, show a fallback
  if (!ReactPlayer) {
    return <div className="text-red-500 p-4">Error loading video player component.</div>;
  }

  // Reset error when URL changes
  useEffect(() => {
    setErrorType(null);
  }, [url]);

  // State: No Video Loaded (Intro Screen)
  if (!url) {
    return (
      <div className={`relative bg-slate-900 w-full h-full flex items-center justify-center p-8 ${className}`}>
        <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-100 mb-2">Welcome to GeminiPlayer</h2>
            <p className="text-slate-400">Import a local video file to get started.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Shortcuts Column */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <Keyboard size={20} />
                <h3 className="font-semibold uppercase tracking-wider text-sm">Keyboard Shortcuts</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex justify-between">
                  <span>Play / Pause</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">Space</span>
                </li>
                <li className="flex justify-between">
                  <span>Previous Sentence</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">← / A</span>
                </li>
                <li className="flex justify-between">
                  <span>Next Sentence</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">→ / D</span>
                </li>
                <li className="flex justify-between">
                  <span>Replay Current</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">S</span>
                </li>
                <li className="flex justify-between">
                  <span>Cycle Blur Mode</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-xs text-white">B</span>
                </li>
              </ul>
            </div>

            {/* Actions Column */}
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-green-400">
                  <MousePointerClick size={20} />
                  <h3 className="font-semibold uppercase tracking-wider text-sm">Features</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-400 list-disc list-inside flex-1">
                  <li>Click any word for <strong>AI Definition</strong></li>
                  <li><strong>Auto-Pause</strong> at end of sentences</li>
                  <li><strong>Merge</strong> subtitles easily</li>
                  <li>Save words to your <strong>Notebook</strong></li>
                </ul>
                
                <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 text-center">
                   <FileVideo className="mx-auto text-slate-500 mb-2" size={24} />
                   <p className="text-xs text-slate-400">Please use the <strong>Import</strong> button at the <strong className="text-blue-400">top right</strong> to upload a video file.</p>
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
         <div className="mb-3 text-red-500">
            <FileWarning size={48} className="mx-auto opacity-80" />
         </div>
         <p className="mb-2 text-slate-200 font-bold text-lg">
           Playback Error
         </p>
         <p className="text-sm mb-6 max-w-md text-slate-400">
           {isYouTubeError 
             ? "The owner of this video does not allow it to be played on other websites." 
             : "The video format is not supported or the file is corrupted."}
         </p>
         
         <div className="flex flex-col gap-3">
           <p className="text-xs text-slate-500">
             Try importing a different local file.
           </p>
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