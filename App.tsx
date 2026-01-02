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
  const [playbackRate, setPlaybackRate] = useState(1); // Default to integer 1
  const [isReady, setIsReady] = useState(false);
  
  const [subtitles, setSubtitles] = useState<Subtitle[]>(MOCK_SUBTITLES);
  const [history, setHistory] = useState<Subtitle[][]>([]);
  
  const [activeIndex, setActiveIndex] = useState(-1);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('glp_settings');
      // Merge saved settings with INITIAL_SETTINGS to ensure new fields (provider, baseUrl) exist
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
    sentence: string;
    loading: boolean;
    data: AISentenceAnalysis | null;
    error: string | null;
  }>({ isOpen: false, sentence: '', loading: false, data: null, error: null });

  // Refs
  const playerRef = useRef<any>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const lastAutoPausedIndex = useRef<number | null>(null);
  const isManualSeek = useRef<boolean>(false);

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

  // --- Active Subtitle Calculation (Smart Sticky Logic) ---
  useEffect(() => {
    // 1. Identify matches
    // isExtended is wide (1.5s) to allow the "Sticky" logic plenty of room to hold 
    // the index before the Auto-Pause logic triggers.
    const matches = subtitles.map((s, i) => ({
      index: i,
      isStrict: currentTime >= s.start && currentTime < s.end,
      isExtended: currentTime >= s.start && currentTime < s.end + 1.5 
    })).filter(m => m.isExtended);

    let newIndex = -1;

    if (matches.length > 0) {
      if (isManualSeek.current) {
        // CASE: Manual Seek -> Always snap to Strict Match (start of sentence)
        const strictMatch = matches.find(m => m.isStrict);
        newIndex = strictMatch ? strictMatch.index : matches[0].index;
        isManualSeek.current = false; 
      } else {
        // CASE: Flow
        const currentIsStillValid = matches.some(m => m.index === activeIndex);
        
        if (currentIsStillValid && activeIndex !== -1) {
          const currentSub = subtitles[activeIndex];
          
          // DYNAMIC STICKY THRESHOLD:
          // We want to Auto-Pause at `end + 0.1s`.
          // To ensure the Auto-Pause effect detects the current sentence BEFORE this logic switches 
          // to the next one, the sticky threshold while playing must be significantly larger than 0.1s.
          // Using 0.4s gives a 0.3s safety buffer (approx 6-10 frames), preventing race conditions.
          // When Paused, we hold it much longer (1.2s) to allow "Replay" of the just-finished sentence.
          const stickyThreshold = playing ? 0.4 : 1.2;

          if (currentTime < currentSub.end + stickyThreshold) {
             newIndex = activeIndex; // Stick to current
          } else {
             // Release sticky, prefer strict (Next Sentence)
             const strictMatch = matches.find(m => m.isStrict);
             // If no strict match (gap), keep using extended match or closest
             newIndex = strictMatch ? strictMatch.index : matches[0].index;
          }
        } else {
          // Current not valid (or startup), pick Strict
          const strictMatch = matches.find(m => m.isStrict);
          newIndex = strictMatch ? strictMatch.index : matches[0].index;
        }
      }
    } else {
      newIndex = -1;
    }
    
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      
      if (transcriptContainerRef.current) {
        const cards = transcriptContainerRef.current.children;
        if (cards[newIndex]) {
            setTimeout(() => {
              (cards[newIndex] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        }
      }
    }
  }, [currentTime, subtitles, playing]); // 'playing' dependency ensures threshold updates immediately on pause

  // --- Auto Pause Logic ---
  useEffect(() => {
    if (!settings.autoPause || !playing || activeIndex === -1) return;

    const sub = subtitles[activeIndex];
    if (!sub) return;

    // Trigger: Time passes "end + 0.1" (Requested Change)
    // We use a safe window [0.1, 0.8] to catch the event
    const triggerTime = sub.end + 0.1;
    const isTime = currentTime >= triggerTime && currentTime < triggerTime + 0.8;
    
    // We only trigger if we haven't already paused for this specific sentence index
    const isNew = lastAutoPausedIndex.current !== activeIndex;

    if (isTime && isNew) {
      setPlaying(false);
      lastAutoPausedIndex.current = activeIndex;
    }

  }, [currentTime, activeIndex, playing, settings.autoPause, subtitles]);

  // --- Handlers (Memoized) ---
  
  const handleSeek = useCallback((time: number) => {
    if (!playerRef.current) return;
    
    lastAutoPausedIndex.current = null;
    isManualSeek.current = true;

    if (typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(time, 'seconds');
      setCurrentTime(time); 
      setPlaying(true);
    }
  }, []);

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
    
    // Reset Auto-Pause memory because the index might now represent a NEW merged sentence
    // that needs to be paused at its new end time.
    lastAutoPausedIndex.current = null;

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
    lastAutoPausedIndex.current = null; // Also reset on undo
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

  const handleAnalyzeSentence = useCallback(async (text: string) => {
    if (!settings.apiKey) {
      setShowSettings(true);
      return;
    }
    setPlaying(false);
    setAnalysisState({ isOpen: true, sentence: text, loading: true, data: null, error: null });

    try {
      const data = await fetchSentenceAnalysis(text, settings);
      setAnalysisState(prev => ({ ...prev, loading: false, data }));
    } catch (err: any) {
      setAnalysisState(prev => ({ ...prev, loading: false, error: err.message || "Failed to analyze" }));
    }
  }, [settings]);

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
    lastAutoPausedIndex.current = null;
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
          if (activeIndex > 0) handleSeek(subtitles[activeIndex - 1].start);
          else handleSeek(0);
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (activeIndex < subtitles.length - 1) handleSeek(subtitles[activeIndex + 1].start);
          break;
        case 'KeyD':
          if (activeIndex < subtitles.length - 1) handleSeek(subtitles[activeIndex + 1].start);
          break;
        case 'KeyS':
          if (activeIndex !== -1) handleSeek(subtitles[activeIndex].start);
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
            onSeek={handleSeek}
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
                  onClick={() => setSettings(s => ({...s, autoPause: !s.autoPause}))}
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
                onSeek={handleSeek}
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
          sentence={analysisState.sentence}
          loading={analysisState.loading}
          data={analysisState.data}
          error={analysisState.error}
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