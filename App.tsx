import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { VideoPlayer } from './components/VideoPlayer';
import { SubtitleCard } from './components/SubtitleCard';
import { SettingsModal, ImportModal, NotebookModal, SentenceAnalysisModal } from './components/Modals';
import { WordPopover } from './components/WordPopover';
import { Settings as SettingsIcon, FileUp, BookOpen, Undo2, Play, Pause, Eye, EyeOff, Focus } from 'lucide-react';
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

export default function App() {
  // --- State ---
  const [videoUrl, setVideoUrl] = useState(DEFAULT_VIDEO_URL);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const [subtitles, setSubtitles] = useState<Subtitle[]>(MOCK_SUBTITLES);
  const [history, setHistory] = useState<Subtitle[][]>([]);
  
  const [activeIndex, setActiveIndex] = useState(-1);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('glp_settings');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
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
  const playerRef = useRef<ReactPlayer>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const lastAutoPausedIndex = useRef<number | null>(null);

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

  // Sync Active Subtitle & Scroll
  useEffect(() => {
    const index = subtitles.findIndex(s => currentTime >= s.start && currentTime < s.end);
    
    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
      
      // Auto-scroll
      if (transcriptContainerRef.current) {
        const cards = transcriptContainerRef.current.children;
        if (cards[index]) {
            setTimeout(() => {
              (cards[index] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        }
      }
    }
  }, [currentTime, subtitles]); 

  // --- Auto Pause Logic ---
  useEffect(() => {
    if (!settings.autoPause || !playing || activeIndex === -1) return;

    if (lastAutoPausedIndex.current !== null && lastAutoPausedIndex.current !== activeIndex) {
       lastAutoPausedIndex.current = null;
    }
    if (lastAutoPausedIndex.current === activeIndex) return;

    // Stale state guard
    const realTimeIndex = subtitles.findIndex(s => currentTime >= s.start && currentTime < s.end);
    if (realTimeIndex !== activeIndex) return;

    const currentSub = subtitles[activeIndex];
    if (currentTime >= currentSub.end - 0.2) {
      setPlaying(false);
      lastAutoPausedIndex.current = activeIndex;
    }

  }, [currentTime, activeIndex, playing, settings.autoPause, subtitles]);


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
  }, [activeIndex, subtitles, isReady]);


  // --- Handlers ---
  
  const cycleBlurMode = () => {
    setSettings(s => {
      const modes: AppSettings['blurMode'][] = ['none', 'focus', 'all'];
      const currentIndex = modes.indexOf(s.blurMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { ...s, blurMode: modes[nextIndex] };
    });
  };

  const handleProgress = (state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);
  };

  const handleSeek = (time: number) => {
    if (!playerRef.current) return;
    lastAutoPausedIndex.current = null;

    if (typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(time, 'seconds');
      setCurrentTime(time); 
      setPlaying(true);
    }
  };

  const saveToHistory = () => {
    setHistory(prev => [...prev.slice(-10), [...subtitles]]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setSubtitles(previous);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleMerge = (id: string) => {
    const index = subtitles.findIndex(s => s.id === id);
    if (index === -1 || index === subtitles.length - 1) return;

    saveToHistory();

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
  };

  const handleWordClick = async (word: string, rect: DOMRect, context: string) => {
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
  };

  const handleAnalyzeSentence = async (text: string) => {
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
  };

  const handleToggleBookmark = (subtitle: Subtitle) => {
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
  };

  const handleImport = (en: string, cn: string, url: string) => {
    if (url) {
        setVideoUrl(url);
        setIsReady(false);
    }
    const merged = parseAndMergeSRT(en, cn);
    setSubtitles(merged);
    setHistory([]);
    setActiveIndex(-1);
    lastAutoPausedIndex.current = null;
  };
  
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

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900">
        <h1 className="font-bold text-lg text-blue-400">GeminiPlayer</h1>
        <button onClick={() => setShowSettings(true)}><SettingsIcon size={20} /></button>
      </div>

      {/* Left: Video Player Area */}
      <div className="w-full md:w-[70%] h-[40vh] md:h-full flex flex-col border-r border-slate-800">
        <div className="flex-1 bg-black relative">
          <VideoPlayer 
            url={videoUrl}
            playing={playing}
            onProgress={handleProgress}
            onDuration={setDuration}
            onReady={() => setIsReady(true)}
            onEnded={() => setPlaying(false)}
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
               <div className="text-sm font-mono text-slate-400">
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
          className="flex-1 overflow-y-auto p-4 scroll-smooth custom-scrollbar"
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
                blurMode={settings.blurMode}
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