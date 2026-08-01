import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VideoPlayer } from './components/VideoPlayer';
import { SubtitleCard } from './components/SubtitleCard';
import { SettingsModal, ImportModal, NotebookModal, SentenceAnalysisModal, SubtitleHistoryModal } from './components/Modals';
import { WordPopover } from './components/WordPopover';
import { Settings as SettingsIcon, FileUp, BookOpen, Undo2, Play, Pause, Eye, EyeOff, Focus, Gauge, Loader2, Download, Clock, Languages } from 'lucide-react';
import { Subtitle, AppSettings, SavedWord, SavedSentence, AIResponse, AISentenceAnalysis, CachedSubtitleHistory } from './types';
import { INITIAL_SETTINGS, MOCK_SUBTITLES, DEFAULT_VIDEO_URL } from './constants';
import { parseAndMergeSRT, exportSubtitlesToSRT, ensureUniqueIds } from './services/srtParser';
import { fetchWordAnalysis, fetchSentenceAnalysis } from './services/aiService';
import { getT, AppLanguage } from './translations';

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
  
  const [subtitleHistory, setSubtitleHistory] = useState<CachedSubtitleHistory[]>(() => {
    try {
      const saved = localStorage.getItem('glp_subtitle_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentSubtitleId, setCurrentSubtitleId] = useState<string | undefined>(undefined);
  const [showSubtitleHistory, setShowSubtitleHistory] = useState(false);
  
  const [activeIndex, setActiveIndex] = useState(-1);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('glp_settings');
      return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const t = getT(settings.appLanguage || 'zh');
  
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

  const toggleLanguage = () => {
    setSettings(s => ({
      ...s,
      appLanguage: s.appLanguage === 'en' ? 'zh' : 'en'
    }));
  };
  
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

  useEffect(() => {
    localStorage.setItem('glp_subtitle_history', JSON.stringify(subtitleHistory));
  }, [subtitleHistory]);

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

  const handleMergePrev = useCallback((id: string) => {
    const index = subtitles.findIndex(s => s.id === id);
    if (index <= 0) return; // Cannot merge with previous if index is 0 or -1

    setHistory(prev => [...prev.slice(-10), [...subtitles]]);
    lastAutoPausedId.current = null; // Reset logic for modified sentence

    const prevSub = subtitles[index - 1];
    const current = subtitles[index];

    const merged: Subtitle = {
      ...prevSub,
      end: current.end,
      text_en: `${prevSub.text_en} ${current.text_en}`,
      text_cn: `${prevSub.text_cn} ${current.text_cn}`
    };

    const newSubs = [...subtitles];
    newSubs.splice(index - 1, 2, merged);
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

  const handleExportSRT = useCallback(() => {
    if (!subtitles || subtitles.length === 0) return;
    try {
      const srtContent = exportSubtitlesToSRT(subtitles);
      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'processed_subtitles.srt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export SRT:", err);
    }
  }, [subtitles]);

  const handleVideoSelect = useCallback((url: string) => {
    setVideoUrl(url);
    setIsReady(false);
    if (currentSubtitleId) {
      setSubtitleHistory(prev => prev.map(item => item.id === currentSubtitleId ? { ...item, videoUrl: url } : item));
    }
  }, [currentSubtitleId]);

  const handleImport = useCallback(async (en: string, cn: string, url: string, mode: 'none' | 'simple' | 'full', name: string) => {
    const hasSrtInput = (en && en.trim().length > 0) || (cn && cn.trim().length > 0);

    // If user uploaded only a video (no SRT content provided)
    if (!hasSrtInput) {
      if (url) {
        setVideoUrl(url);
        setIsReady(false);
        if (currentSubtitleId) {
          setSubtitleHistory(prev => prev.map(item => item.id === currentSubtitleId ? { ...item, videoUrl: url } : item));
        }
      }
      return; // Keep existing loaded subtitles intact!
    }

    if (url) {
      setVideoUrl(url);
      setIsReady(false);
    }
    
    // 1. Initial Parse and Align EN/CN
    const initialMerged = parseAndMergeSRT(en, cn);
    if (initialMerged.length === 0) {
      return;
    }

    const uniqueSubs = ensureUniqueIds(initialMerged);
    setSubtitles(uniqueSubs);
    setHistory([]);
    setActiveIndex(-1);
    lastAutoPausedId.current = null;

    // Cache the subtitle record to browser history
    const effectiveVideoUrl = url || videoUrl || undefined;
    const newHistoryItem: CachedSubtitleHistory = {
      id: generateId(),
      name: name,
      subtitles: uniqueSubs,
      videoUrl: effectiveVideoUrl,
      createdAt: Date.now()
    };
    setSubtitleHistory(prev => [newHistoryItem, ...prev]);
    setCurrentSubtitleId(newHistoryItem.id);

  }, [currentSubtitleId, videoUrl]);

  const handleImportDirectSubtitles = useCallback((newSubs: Subtitle[], newVideoUrl?: string, name?: string) => {
    const uniqueSubs = ensureUniqueIds(newSubs);
    setSubtitles(uniqueSubs);
    setActiveIndex(-1);
    lastAutoPausedId.current = null;

    if (newVideoUrl) {
      setVideoUrl(newVideoUrl);
    }

    const finalName = name || `Imported Subtitles ${new Date().toLocaleTimeString()}`;
    const newHistoryItem: CachedSubtitleHistory = {
      id: generateId(),
      name: finalName,
      subtitles: uniqueSubs,
      videoUrl: newVideoUrl || videoUrl || undefined,
      createdAt: Date.now()
    };
    setSubtitleHistory(prev => [newHistoryItem, ...prev]);
    setCurrentSubtitleId(newHistoryItem.id);
  }, [videoUrl]);

  const handleSelectHistorySubtitle = useCallback((item: CachedSubtitleHistory) => {
    setSubtitles(ensureUniqueIds(item.subtitles));
    setCurrentSubtitleId(item.id);

    // If a valid video is already playing/selected in current session, keep it!
    if (videoUrl) {
      setSubtitleHistory(prev => prev.map(h => h.id === item.id ? { ...h, videoUrl } : h));
    } else if (item.videoUrl) {
      // If no video loaded currently, try setting stored video URL
      setVideoUrl(item.videoUrl);
      setIsReady(false);
    }

    setHistory([]);
    setActiveIndex(-1);
    lastAutoPausedId.current = null;
    setShowSubtitleHistory(false);
  }, [videoUrl]);

  const handleDeleteHistorySubtitle = useCallback((id: string) => {
    setSubtitleHistory(prev => prev.filter(item => item.id !== id));
    setCurrentSubtitleId(prev => prev === id ? undefined : prev);
  }, []);

  const handleRenameHistorySubtitle = useCallback((id: string, newName: string) => {
    setSubtitleHistory(prev => prev.map(item => item.id === id ? { ...item, name: newName } : item));
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
      case 'none': return t.blurNone;
      case 'focus': return t.blurFocus;
      case 'all': return t.blurAll;
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
        case 'KeyQ': // Merge with previous
          if (activeIndex > 0) {
            e.preventDefault();
            handleMergePrev(subtitles[activeIndex].id);
          }
          break;
        case 'KeyE': // Merge with next
          if (activeIndex !== -1 && activeIndex < subtitles.length - 1) {
            e.preventDefault();
            handleMerge(subtitles[activeIndex].id);
          }
          break;
        case 'KeyZ': // Undo merge
          e.preventDefault();
          handleUndo();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, subtitles, isReady, cycleBlurMode, handleSeek, handleMerge, handleMergePrev, handleUndo]);


  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900">
        <h1 className="font-bold text-lg text-blue-400">{t.appTitle}</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleLanguage}
            className="p-1.5 bg-slate-800 text-xs font-semibold rounded border border-slate-700 text-slate-300 flex items-center gap-1"
            title={t.langToggle}
          >
            <Languages size={14} className="text-amber-400" />
            <span>{settings.appLanguage === 'en' ? 'EN' : '中文'}</span>
          </button>
          <button onClick={() => setShowSettings(true)}><SettingsIcon size={20} /></button>
        </div>
      </div>

      {/* Left: Video Player Area */}
      <div className="w-full md:w-[70%] h-[40vh] md:h-full flex flex-col border-r border-slate-800">
        <div className="flex-1 bg-black relative">
          <VideoPlayer 
            url={videoUrl}
            playing={playing}
            playbackRate={playbackRate}
            appLanguage={settings.appLanguage}
            onProgress={handleProgress}
            onDuration={setDuration}
            onEnded={() => setPlaying(false)}
            onReady={() => setIsReady(true)}
            playerRef={playerRef}
            onTogglePlay={() => setPlaying(!playing)}
            onSeek={(time) => handleSeek(time)}
            onVideoSelect={handleVideoSelect}
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
                    title={t.playbackSpeed}
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
                      lastAutoPausedId.current = null;
                  }}
                  className={`px-3 py-1 rounded transition ${settings.autoPause ? 'bg-green-600 text-white' : 'hover:bg-slate-700'}`}
                 >
                   {t.autoPause}
                 </button>
              </div>

              <div className="h-6 w-px bg-slate-700 mx-2 hidden md:block" />

              <button 
                onClick={handleUndo} 
                disabled={history.length === 0}
                className={`p-2 rounded transition ${history.length === 0 ? 'text-slate-700' : 'text-slate-400 hover:text-white bg-slate-800'}`}
                title={t.undoMerge}
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
           <div className="flex items-center gap-2">
             <button onClick={() => setShowNotebook(true)} className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-blue-400 transition">
               <BookOpen size={16} /> <span className="hidden sm:inline">{t.myNotebook}</span>
             </button>
           </div>
           <div className="flex items-center gap-2">
             <button 
               onClick={toggleLanguage}
               className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 font-semibold transition"
               title={t.langToggle}
             >
               <Languages size={14} className="text-amber-400" />
               <span>{settings.appLanguage === 'en' ? 'EN' : '中文'}</span>
             </button>
             <button 
               onClick={() => setShowSubtitleHistory(true)} 
               className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" 
               title={t.subtitleHistory}
             >
               <Clock size={18} />
             </button>
             <button onClick={() => setShowImport(true)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title={t.importSubtitles}>
               <FileUp size={18} />
             </button>
             <button 
               onClick={handleExportSRT} 
               className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" 
               title={t.exportSubtitles}
               disabled={subtitles.length === 0}
             >
               <Download size={18} />
             </button>
             <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title={t.settings}>
               <SettingsIcon size={18} />
             </button>
           </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/50 text-xs border-b border-slate-800">
           <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.showEn} onChange={e => setSettings({...settings, showEn: e.target.checked})} className="rounded bg-slate-700 border-slate-600" />
                <span>{t.showEn}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.showCn} onChange={e => setSettings({...settings, showCn: e.target.checked})} className="rounded bg-slate-700 border-slate-600" />
                <span>{t.showCn}</span>
              </label>
           </div>
           <span className="text-slate-500">{subtitles.length} {t.linesCount}</span>
        </div>

        {/* List */}
        <div 
          ref={transcriptContainerRef}
          className="glp-transcript flex-1 overflow-y-auto p-4 scroll-smooth custom-scrollbar"
          data-blur-mode={settings.blurMode}
        >
          {subtitles.length === 0 ? (
            <div className="text-center text-slate-500 mt-20">
              <p className="mb-2">{t.noSubtitlesLoaded}</p>
              <button onClick={() => setShowImport(true)} className="text-blue-400 underline">{t.importSrtLink}</button>
            </div>
          ) : (
            subtitles.map((sub, idx) => (
              <SubtitleCard 
                key={`${sub.id}_${idx}`} 
                subtitle={sub} 
                status={idx < activeIndex ? 'past' : idx === activeIndex ? 'current' : 'future'}
                showEn={settings.showEn}
                showCn={settings.showCn}
                isBookmarked={savedSentences.some(s => s.id === sub.id)}
                appLanguage={settings.appLanguage}
                onSeek={(time) => handleSeek(time, sub.id)}
                onMergeNext={handleMerge}
                onMergePrev={handleMergePrev}
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
          settings={settings}
          onImport={handleImport} 
          onImportDirectSubtitles={handleImportDirectSubtitles}
          onClose={() => setShowImport(false)} 
        />
      )}
      
      {showNotebook && (
        <NotebookModal 
          words={savedWords} 
          sentences={savedSentences}
          appLanguage={settings.appLanguage}
          onDeleteWord={(id) => setSavedWords(prev => prev.filter(w => w.id !== id))}
          onDeleteSentence={(id) => setSavedSentences(prev => prev.filter(s => s.id !== id))}
          onClose={() => setShowNotebook(false)} 
        />
      )}

      {showSubtitleHistory && (
        <SubtitleHistoryModal
          history={subtitleHistory}
          currentId={currentSubtitleId}
          appLanguage={settings.appLanguage}
          onSelect={handleSelectHistorySubtitle}
          onDelete={handleDeleteHistorySubtitle}
          onRename={handleRenameHistorySubtitle}
          onClose={() => setShowSubtitleHistory(false)}
        />
      )}

      {analysisState.isOpen && (
        <SentenceAnalysisModal
          sentence={analysisState.subtitle?.text_en || ""}
          loading={analysisState.loading}
          data={analysisState.data}
          error={analysisState.error}
          isSaved={savedSentences.some(s => s.id === analysisState.subtitle?.id && !!s.analysis)}
          appLanguage={settings.appLanguage}
          onSave={handleSaveSentenceWithAnalysis}
          onClose={() => setAnalysisState(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {popoverState.word && (
        <WordPopover 
          {...popoverState}
          appLanguage={settings.appLanguage}
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