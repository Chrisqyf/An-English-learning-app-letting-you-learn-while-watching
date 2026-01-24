import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VideoPlayer } from './components/VideoPlayer';
import { SubtitleCard } from './components/SubtitleCard';
import { SettingsModal, ImportModal, NotebookModal, SentenceAnalysisModal } from './components/Modals';
import { WordPopover } from './components/WordPopover';
import { Settings as SettingsIcon, FileUp, BookOpen, Undo2, Play, Pause, Eye, EyeOff, Focus, Gauge } from 'lucide-react';
import { Subtitle, AppSettings, SavedWord, SavedSentence, AIResponse, AISentenceAnalysis } from './types';
import { INITIAL_SETTINGS, MOCK_SUBTITLES, DEFAULT_VIDEO_URL } from './constants';
import { parseAndMergeSRT } from './services/srtParser';
import { fetchWordAnalysis, fetchSentenceAnalysis } from './services/aiService';

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

function MainPlayer() {
  // --- State ---
  const [videoUrl, setVideoUrl] = useState(DEFAULT_VIDEO_URL);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isReady, setIsReady] = useState(false);
  
  const [subtitles, setSubtitles] = useState<Subtitle[]>(MOCK_SUBTITLES);
  const [history, setHistory] = useState<Subtitle[][]>([]);
  
  const [activeIndex, setActiveIndex] = useState(-1);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('glp_settings');
      return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });
  
  const [savedWords, setSavedWords] = useState<SavedWord[]>(() => {
    try {
      const saved = localStorage.getItem('glp_vocab');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [savedSentences, setSavedSentences] = useState<SavedSentence[]>(() => {
    try {
      const saved = localStorage.getItem('glp_sentences');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals & Popovers
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  
  const [popoverState, setPopoverState] = useState<{
    word: string;
    context: string;
    position: { x: number, y: number } | null;
    loading: boolean;
    data: AIResponse | null;
    error: string | null;
  }>({ word: '', context: '', position: null, loading: false, data: null, error: null });

  const [analysisState, setAnalysisState] = useState<{
    isOpen: boolean;
    subtitle: Subtitle | null; // Changed from just 'sentence' string to full object to track ID
    loading: boolean;
    data: AISentenceAnalysis | null;
    error: string | null;
  }>({ isOpen: false, subtitle: null, loading: false, data: null, error: null });

  // Refs
  const playerRef = useRef<any>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  
  // Logic Refs (Crucial for eliminating race conditions)
  const lastAutoPausedId = useRef<string | null>(null);
  const isSeekPending = useRef<boolean>(false); // Lock updates during seek
  
  // --- Effects ---
  
  useEffect(() => {
    localStorage.setItem('glp_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('glp_vocab', JSON.stringify(savedWords));
  }, [savedWords]);

  useEffect(() => {
    localStorage.setItem('glp_sentences', JSON.stringify(savedSentences));
  }, [savedSentences]);

  // --- CORE LOGIC: Unified Playback Engine ---
  useEffect(() => {
    if (subtitles.length === 0) return;
    if (isSeekPending.current) return; // Completely block logic while seeking to prevent jitter

    const currentSub = activeIndex !== -1 ? subtitles[activeIndex] : null;

    // --- 1. AUTO-PAUSE LOGIC (Highest Priority) ---
    // If we are playing and Auto-Pause is enabled, we check if we reached the end.
    if (playing && settings.autoPause && currentSub) {
      // We use a small threshold (0.1s) past the end to ensure the audio finishes naturally.
      const END_THRESHOLD = 0.1;
      
      if (currentTime >= currentSub.end + END_THRESHOLD) {
        // Only pause if we haven't already paused for this specific sentence instance
        if (lastAutoPausedId.current !== currentSub.id) {
          console.log(`[AutoPause] Pausing at ${currentTime} for ID: ${currentSub.id}`);
          setPlaying(false);
          lastAutoPausedId.current = currentSub.id;
          // CRITICAL: Return immediately. Do NOT update the index.
          // This keeps the UI locked on the finished sentence, allowing the user to read/replay it.
          return; 
        }
      }
    }

    // --- 2. INDEX CALCULATION ---
    // Calculate where we are. We look ahead slightly (0.05s) to snap to the start of sentences cleanly.
    const searchTime = currentTime + 0.05;
    let matchIndex = subtitles.findIndex(s => searchTime >= s.start && searchTime < s.end);

    // --- 2.5 STICKY PAUSE FIX ---
    // Problem: The 0.1s extension often pushes the time into the NEXT sentence.
    // Fix: If we are PAUSED and it was triggered by Auto-Pause, we FORCE the index to remain 
    // on the paused sentence, even if the time has drifted into the next one.
    if (!playing && settings.autoPause && lastAutoPausedId.current) {
        const pausedIndex = subtitles.findIndex(s => s.id === lastAutoPausedId.current);
        if (pausedIndex !== -1) {
            const pausedSub = subtitles[pausedIndex];
            // If we are sitting in the "extension tail" (e.g., within 1s after end), stick to it.
            // This prevents jumping to the next sentence while paused.
            if (currentTime >= pausedSub.end && currentTime < pausedSub.end + 1.0) {
                matchIndex = pausedIndex;
            }
        }
    }

    // --- 3. GAP & STICKY HANDLING ---
    if (matchIndex === -1) {
      // We are in a gap or at the end.
      if (currentSub) {
        // If we are past the end of the current sentence...
        if (currentTime >= currentSub.end) {
           // Check if there is a Next Sentence
           const nextIndex = activeIndex + 1;
           if (nextIndex < subtitles.length) {
             const nextSub = subtitles[nextIndex];
             // If we are strictly in the gap before the next one starts
             if (currentTime < nextSub.start) {
                // BEHAVIOR DECISION:
                // If Playing & Auto-Pause OFF: Anticipate Next (Better flow)
                // If Playing & Auto-Pause ON:  Stick to Current (Wait for pause trigger)
                // If Paused:                   Stick to Current (Review mode)
                
                if (playing && !settings.autoPause) {
                   matchIndex = nextIndex; 
                } else {
                   matchIndex = activeIndex; 
                }
             }
           }
        } else {
           // We are essentially inside the current sentence (just near the edge), keep it.
           matchIndex = activeIndex;
        }
      }
    }

    // --- 4. THE GUARD CLAUSE ---
    // If we are playing with Auto-Pause ON, we MUST NOT switch to a future index 
    // until the pause logic (Step 1) has successfully fired and paused the player.
    if (playing && settings.autoPause && currentSub && matchIndex > activeIndex) {
        // If we haven't paused for the current ID yet, prevent the switch.
        if (lastAutoPausedId.current !== currentSub.id) {
            matchIndex = activeIndex;
        }
    }

    // --- 5. COMMIT STATE ---
    if (matchIndex !== -1 && matchIndex !== activeIndex) {
      setActiveIndex(matchIndex);
      // We switched to a new sentence (either manually or by playback). 
      // Reset the pause lock so it can pause again for this NEW sentence.
      lastAutoPausedId.current = null;
      
      // Auto-scroll logic
      if (transcriptContainerRef.current) {
        const cards = transcriptContainerRef.current.children;
        if (cards[matchIndex]) {
            setTimeout(() => {
              (cards[matchIndex] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        }
      }
    }

  }, [currentTime, playing, settings.autoPause, subtitles, activeIndex]);


  // --- Handlers ---
  
  const handleSeek = useCallback((time: number, targetId?: string) => {
    if (!playerRef.current) return;
    
    // 1. Lock updates
    isSeekPending.current = true;
    
    // 2. Reset Pause Logic
    lastAutoPausedId.current = null;
    
    // 3. Update UI Immediately (Optimistic)
    if (targetId) {
        const idx = subtitles.findIndex(s => s.id === targetId);
        if (idx !== -1) setActiveIndex(idx);
    } else {
        const idx = subtitles.findIndex(s => time >= s.start && time < s.end);
        if (idx !== -1) setActiveIndex(idx);
    }

    // 4. Seek
    // Add 0.01s buffer to avoid landing exactly on the previous frame end
    playerRef.current.seekTo(time + 0.01, 'seconds');
    setCurrentTime(time + 0.01);
    
    // 5. Play
    setPlaying(true);
    
    // 6. Release Lock
    // Increased delay to 200ms to allow video player state to stabilize and avoid "jumping back"
    setTimeout(() => {
        isSeekPending.current = false;
    }, 200);

  }, [subtitles]);

  const handleProgress = useCallback((state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);
  }, []);

  const saveToHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-10), [...subtitles]]);
  }, [subtitles]);

  const handleMerge = useCallback((id: string) => {
    setSubtitles(currentSubtitles => {
      const index = currentSubtitles.findIndex(s => s.id === id);
      if (index === -1 || index === currentSubtitles.length - 1) return currentSubtitles;
      return currentSubtitles; 
    });
    
    const index = subtitles.findIndex(s => s.id === id);
    if (index === -1 || index === subtitles.length - 1) return;

    setHistory(prev => [...prev.slice(-10), [...subtitles]]);
    lastAutoPausedId.current = null; // Reset logic for modified sentence

    const current = subtitles[index];
    const next = subtitles[index + 1];

    const merged: Subtitle = {
      ...current,
      end: next.end,
      text_en: `${current.text_en} ${next.text_en}`,
      text_cn: `${current.text_cn} ${next.text_cn}`
    };

    const newSubs = [...subtitles];
    newSubs.splice(index, 2, merged);
    setSubtitles(newSubs);
  }, [subtitles]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setSubtitles(previous);
    setHistory(prev => prev.slice(0, -1));
    lastAutoPausedId.current = null;
  }, [history]);

  const handleWordClick = useCallback(async (word: string, rect: DOMRect, context: string) => {
    if (!settings.apiKey) {
      setShowSettings(true);
      return;
    }
    setPlaying(false);
    setPopoverState({
      word,
      context,
      position: { x: rect.left, y: rect.bottom + window.scrollY },
      loading: true,
      data: null,
      error: null
    });

    try {
      const data = await fetchWordAnalysis(word, context, settings);
      setPopoverState(prev => ({ ...prev, loading: false, data }));
    } catch (err: any) {
      setPopoverState(prev => ({ ...prev, loading: false, error: err.message || "Failed to analyze" }));
    }
  }, [settings]);

  // Updated to receive full Subtitle object
  const handleAnalyzeSentence = useCallback(async (subtitle: Subtitle) => {
    if (!settings.apiKey) {
      setShowSettings(true);
      return;
    }
    setPlaying(false);
    setAnalysisState({ isOpen: true, subtitle: subtitle, loading: true, data: null, error: null });

    try {
      const data = await fetchSentenceAnalysis(subtitle.text_en, settings);
      setAnalysisState(prev => ({ ...prev, loading: false, data }));
    } catch (err: any) {
      setAnalysisState(prev => ({ ...prev, loading: false, error: err.message || "Failed to analyze" }));
    }
  }, [settings]);

  // Handle saving result from Analysis Modal
  const handleSaveSentenceWithAnalysis = useCallback((data: AISentenceAnalysis) => {
      const currentSub = analysisState.subtitle;
      if (!currentSub) return;

      setSavedSentences(prev => {
          const existingIndex = prev.findIndex(s => s.id === currentSub.id);
          
          if (existingIndex !== -1) {
              // Update existing
              const newArr = [...prev];
              newArr[existingIndex] = { ...newArr[existingIndex], analysis: data };
              return newArr;
          } else {
              // Create new
              return [{
                  id: currentSub.id,
                  text_en: currentSub.text_en,
                  text_cn: currentSub.text_cn,
                  timestamp: Date.now(),
                  analysis: data
              }, ...prev];
          }
      });
  }, [analysisState.subtitle]);

  // Existing simple toggle bookmark handler
  const handleToggleBookmark = useCallback((subtitle: Subtitle) => {
    setSavedSentences(prev => {
      const exists = prev.find(s => s.id === subtitle.id);
      if (exists) {
        return prev.filter(s => s.id !== subtitle.id);
      } else {
        return [{
          id: subtitle.id,
          text_en: subtitle.text_en,
          text_cn: subtitle.text_cn,
          timestamp: Date.now()
        }, ...prev];
      }
    });
  }, []);

  const handleImport = useCallback((en: string, cn: string, url: string) => {
    if (url) {
        setVideoUrl(url);
        setIsReady(false);
    }
    const merged = parseAndMergeSRT(en, cn);
    setSubtitles(merged);
    setHistory([]);
    setActiveIndex(-1);
    lastAutoPausedId.current = null;
  }, []);
  
  const cycleBlurMode = useCallback(() => {
    setSettings(s => {
      const modes: AppSettings['blurMode'][] = ['none', 'focus', 'all'];
      const currentIndex = modes.indexOf(s.blurMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { ...s, blurMode: modes[nextIndex] };
    });
  }, []);

  const getBlurIcon = () => {
    switch (settings.blurMode) {
      case 'none': return <Eye size={16} />;
      case 'focus': return <Focus size={16} />;
      case 'all': return <EyeOff size={16} />;
    }
  };
  
  const getBlurLabel = () => {
    switch (settings.blurMode) {
      case 'none': return 'Blur: Off';
      case 'focus': return 'Blur: Focus';
      case 'all': return 'Blur: All';
    }
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          setPlaying(p => !p);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (activeIndex > 0) {
              const target = subtitles[activeIndex - 1];
              handleSeek(target.start, target.id);
          } else {
              handleSeek(0);
          }
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (activeIndex < subtitles.length - 1) {
              const target = subtitles[activeIndex + 1];
              handleSeek(target.start, target.id);
          }
          break;
        case 'KeyS': // Replay current
          if (activeIndex !== -1) {
             const target = subtitles[activeIndex];
             handleSeek(target.start, target.id);
          }
          break;
        case 'KeyB':
          cycleBlurMode();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, subtitles, isReady, cycleBlurMode, handleSeek]);


  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900">
        <h1 className="font-bold text-lg text-blue-400">English Learning Player</h1>
        <button onClick={() => setShowSettings(true)}><SettingsIcon size={20} /></button>
      </div>

      {/* Left: Video Player Area */}
      <div className="w-full md:w-[70%] h-[40vh] md:h-full flex flex-col border-r border-slate-800">
        <div className="flex-1 bg-black relative">
          <VideoPlayer 
            url={videoUrl}
            playing={playing}
            playbackRate={playbackRate} // Feature: Playback Speed
            onProgress={handleProgress}
            onDuration={setDuration}
            onEnded={() => setPlaying(false)}
            onReady={() => setIsReady(true)}
            playerRef={playerRef}
            onTogglePlay={() => setPlaying(!playing)}
            onSeek={(time) => handleSeek(time)}
          />
        </div>
        
        {/* Controls Bar */}
        <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setPlaying(!playing)} 
                className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isReady && !!videoUrl}
               >
                  {playing ? <Pause size={20} /> : <Play size={20} />}
               </button>
               
               {/* Speed Control */}
               <div className="hidden sm:flex items-center gap-2 bg-slate-800 rounded-lg px-2 py-1">
                  <Gauge size={16} className="text-slate-400" />
                  <select 
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    className="bg-transparent text-xs font-mono text-slate-300 focus:outline-none cursor-pointer"
                    title="Playback Speed"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1.0x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                  </select>
               </div>

               <div className="text-sm font-mono text-slate-400 hidden sm:block">
                  {new Date(currentTime * 1000).toISOString().substr(14, 5)} / 
                  {new Date(duration * 1000).toISOString().substr(14, 5)}
               </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-800 p-1 rounded-lg">
                 <button 
                  onClick={cycleBlurMode}
                  className={`flex items-center gap-2 px-3 py-1 rounded transition min-w-[100px] justify-center ${settings.blurMode !== 'none' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}
                  title="Cycle Blur Modes (B)"
                 >
                   {getBlurIcon()}
                   <span>{getBlurLabel()}</span>
                 </button>
                 <button 
                  onClick={() => {
                      setSettings(s => ({...s, autoPause: !s.autoPause}));
                      lastAutoPausedId.current = null; // Reset logic when toggling
                  }}
                  className={`px-3 py-1 rounded transition ${settings.autoPause ? 'bg-green-600 text-white' : 'hover:bg-slate-700'}`}
                 >
                   Auto-Pause
                 </button>
              </div>

              <div className="h-6 w-px bg-slate-700 mx-2 hidden md:block" />

              <button 
                onClick={handleUndo} 
                disabled={history.length === 0}
                className={`p-2 rounded transition ${history.length === 0 ? 'text-slate-700' : 'text-slate-400 hover:text-white bg-slate-800'}`}
                title="Undo (Merge)"
              >
                <Undo2 size={18} />
              </button>
            </div>
        </div>
      </div>

      {/* Right: Transcript Area */}
      <div className="w-full md:w-[30%] h-[60vh] md:h-full flex flex-col bg-slate-900">
        {/* Toolbar */}
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 shadow-sm z-10">
           <div className="flex gap-2">
             <button onClick={() => setShowNotebook(true)} className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-blue-400 transition">
               <BookOpen size={16} /> <span className="hidden sm:inline">My Notebook</span>
             </button>
           </div>
           <div className="flex gap-2">
             <button onClick={() => setShowImport(true)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title="Import">
               <FileUp size={18} />
             </button>
             <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title="Settings">
               <SettingsIcon size={18} />
             </button>
           </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/50 text-xs border-b border-slate-800">
           <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.showEn} onChange={e => setSettings({...settings, showEn: e.target.checked})} className="rounded bg-slate-700 border-slate-600" />
                <span>Show English</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.showCn} onChange={e => setSettings({...settings, showCn: e.target.checked})} className="rounded bg-slate-700 border-slate-600" />
                <span>Show Chinese</span>
              </label>
           </div>
           <span className="text-slate-500">{subtitles.length} lines</span>
        </div>

        {/* List */}
        <div 
          ref={transcriptContainerRef}
          className="glp-transcript flex-1 overflow-y-auto p-4 scroll-smooth custom-scrollbar"
          data-blur-mode={settings.blurMode}
        >
          {subtitles.length === 0 ? (
            <div className="text-center text-slate-500 mt-20">
              <p className="mb-2">No subtitles loaded.</p>
              <button onClick={() => setShowImport(true)} className="text-blue-400 underline">Import SRT</button>
            </div>
          ) : (
            subtitles.map((sub, idx) => (
              <SubtitleCard 
                key={sub.id} 
                subtitle={sub} 
                status={idx < activeIndex ? 'past' : idx === activeIndex ? 'current' : 'future'}
                // blurMode removed - handled by CSS via parent data attribute
                showEn={settings.showEn}
                showCn={settings.showCn}
                isBookmarked={savedSentences.some(s => s.id === sub.id)}
                onSeek={(time) => handleSeek(time, sub.id)}
                onMerge={handleMerge}
                onWordClick={handleWordClick}
                onAnalyze={handleAnalyzeSentence}
                onBookmark={handleToggleBookmark}
              />
            ))
          )}
          <div className="h-32" /> {/* Bottom spacer */}
        </div>
      </div>

      {/* Overlays */}
      {showSettings && (
        <SettingsModal 
          settings={settings} 
          onSave={setSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}
      
      {showImport && (
        <ImportModal 
          onImport={handleImport} 
          onClose={() => setShowImport(false)} 
        />
      )}
      
      {showNotebook && (
        <NotebookModal 
          words={savedWords} 
          sentences={savedSentences}
          onDeleteWord={(id) => setSavedWords(prev => prev.filter(w => w.id !== id))}
          onDeleteSentence={(id) => setSavedSentences(prev => prev.filter(s => s.id !== id))}
          onClose={() => setShowNotebook(false)} 
        />
      )}

      {analysisState.isOpen && (
        <SentenceAnalysisModal
          sentence={analysisState.subtitle?.text_en || ""}
          loading={analysisState.loading}
          data={analysisState.data}
          error={analysisState.error}
          isSaved={savedSentences.some(s => s.id === analysisState.subtitle?.id && !!s.analysis)}
          onSave={handleSaveSentenceWithAnalysis}
          onClose={() => setAnalysisState(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {popoverState.word && (
        <WordPopover 
          {...popoverState}
          onClose={() => setPopoverState(prev => ({ ...prev, word: '', position: null }))}
          onSave={(word) => setSavedWords(prev => [word, ...prev])}
          isSaved={savedWords.some(w => w.word === popoverState.word)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainPlayer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}