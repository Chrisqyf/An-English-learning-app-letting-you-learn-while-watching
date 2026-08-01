import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Download, Trash2, Settings as SettingsIcon, FileVideo, BookOpen, MessageSquare, ChevronDown, ChevronUp, Bookmark, Clock, Calendar, Edit2, Check, Sparkles, Loader2, Terminal, Cpu, Languages } from 'lucide-react';
import { AppSettings, SavedWord, SavedSentence, AISentenceAnalysis, AIProvider, CachedSubtitleHistory, Subtitle } from '../types';
import { parseAndMergeSRT } from '../services/srtParser';
import { AppLanguage, getT } from '../translations';

// --- Generic Modal Wrapper ---
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition"><X size={20} /></button>
      </div>
      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

// --- Settings Modal ---
interface SettingsModalProps {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [formData, setFormData] = useState(settings);
  const t = getT(formData.appLanguage || 'zh');

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as AIProvider;
    let newModel = formData.modelName;
    let newBaseUrl = formData.baseUrl;
    
    if (newProvider === 'openai') {
      if (newModel.includes('gemini') || !newModel) newModel = 'qwen-plus';
      if (!newBaseUrl) newBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    } else {
      if (!newModel.includes('gemini') && newModel) newModel = 'gemini-2.0-flash';
    }

    setFormData({
      ...formData,
      provider: newProvider,
      modelName: newModel,
      baseUrl: newBaseUrl
    });
  };

  return (
    <Modal title={t.settingsTitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* App Language Setting */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
            <Languages className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">{t.appLanguageLabel}</h3>
          </div>
          <div>
            <select 
              value={formData.appLanguage || 'zh'}
              onChange={e => setFormData({...formData, appLanguage: e.target.value as 'zh' | 'en'})}
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-100"
            >
              <option value="zh">🇨🇳 中文 (Simplified Chinese)</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>
        </div>

        {/* General NLP AI Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-200">{t.generalAiProvider}</h3>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.generalAiProvider}</label>
            <select 
              value={formData.provider}
              onChange={handleProviderChange}
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="gemini">Google Gemini (Native)</option>
              <option value="openai">OpenAI Compatible (Qwen/DeepSeek/Aliyun)</option>
            </select>
          </div>

          {formData.provider === 'openai' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">{t.baseUrlLabel}</label>
              <input 
                type="text" 
                value={formData.baseUrl}
                onChange={e => setFormData({...formData, baseUrl: e.target.value})}
                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.apiKeyLabel}</label>
            <input 
              type="password" 
              value={formData.apiKey}
              onChange={e => setFormData({...formData, apiKey: e.target.value})}
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={formData.provider === 'gemini' ? "AIza..." : "sk-..."}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.modelNameLabel}</label>
            <input 
              type="text" 
              list="model-suggestions"
              value={formData.modelName}
              onChange={e => setFormData({...formData, modelName: e.target.value})}
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={formData.provider === 'gemini' ? "gemini-2.0-flash" : "qwen-plus"}
            />
            <datalist id="model-suggestions">
              <option value="gemini-2.0-flash" />
              <option value="gemini-1.5-flash" />
              <option value="qwen-plus" />
              <option value="qwen-max" />
              <option value="deepseek-v3" />
              <option value="gpt-4o" />
            </datalist>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg font-medium transition shadow-md text-white text-sm">
            <Save size={16} /> {t.saveSettingsBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// --- Import Modal ---
interface ImportModalProps {
  settings: AppSettings;
  onImport: (en: string, cn: string, videoUrl: string, mode: 'none' | 'simple' | 'full', name: string) => void;
  onImportDirectSubtitles?: (subtitles: Subtitle[], videoUrl: string, name: string) => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ settings, onImport, onImportDirectSubtitles, onClose }) => {
  const [srtEn, setSrtEn] = useState('');
  const [srtCn, setSrtCn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [subtitleName, setSubtitleName] = useState('');
  const t = getT(settings.appLanguage || 'zh');

  // Electron EXE state
  const isElectron = !!(typeof window !== 'undefined' && window.electronAPI?.isElectron);
  const [exeFilePath, setExeFilePath] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [exeError, setExeError] = useState<string>('');

  useEffect(() => {
    if (file && !subtitleName) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setSubtitleName(nameWithoutExt + ' Subtitle');
    }
  }, [file]);

  // Handle Electron local file picker
  const handleSelectElectronFile = async () => {
    if (!window.electronAPI) return;
    const selectedPath = await window.electronAPI.selectVideoFile();
    if (selectedPath) {
      setExeFilePath(selectedPath);
      const filename = selectedPath.split(/[/\\]/).pop() || selectedPath;
      if (!subtitleName) {
        setSubtitleName(filename.replace(/\.[^/.]+$/, "") + ' Subtitle');
      }
    }
  };

  // Handle calling subtitle_gen.exe via Electron IPC
  const handleRunSubtitleGenExe = async () => {
    if (!window.electronAPI) return;
    
    let mediaPath = exeFilePath;
    if (!mediaPath && file && (file as any).path) {
      mediaPath = (file as any).path;
    }

    if (!mediaPath) {
      setExeError(t.noFileSelected);
      return;
    }

    setIsGenerating(true);
    setExeError('');
    setProgressLogs(['🚀 ' + t.exeGeneratingLogs]);

    const removeListener = window.electronAPI.onProgress((logText) => {
      setProgressLogs(prev => [...prev.slice(-10), logText.trim()]);
    });

    try {
      const res = await window.electronAPI.generateSubtitles({
        videoPath: mediaPath,
        apiKey: settings.apiKey,
        lang: 'en',
        mode: 'auto'
      });

      removeListener();

      if (res.success && res.srtContent) {
        setProgressLogs(prev => [...prev, '✅ ' + (settings.appLanguage === 'en' ? 'Subtitles generated successfully!' : '字幕生成完成，正在装载...')]);
        const generatedSubs = parseAndMergeSRT(res.srtContent, '');
        
        if (generatedSubs.length === 0) {
          throw new Error("SRT Parse empty error");
        }

        const videoUrl = mediaPath.startsWith('http') ? mediaPath : `file:///${mediaPath.replace(/\\/g, '/')}`;
        const finalName = subtitleName.trim() || `${mediaPath.split(/[/\\]/).pop()} (Auto SRT)`;

        if (onImportDirectSubtitles) {
          onImportDirectSubtitles(generatedSubs, videoUrl, finalName);
        } else {
          onImport('', '', videoUrl, 'none', finalName);
        }
        onClose();
      } else {
        setExeError(res.error || 'Subtitle generation failed');
        setIsGenerating(false);
      }
    } catch (err: any) {
      removeListener();
      setExeError(err.message || 'Call failed');
      setIsGenerating(false);
    }
  };

  const handleImport = () => {
    let finalUrl = '';
    if (file) {
      finalUrl = URL.createObjectURL(file);
    } else if (exeFilePath) {
      finalUrl = `file:///${exeFilePath.replace(/\\/g, '/')}`;
    }
    const finalName = subtitleName.trim() || `Imported Subtitles ${new Date().toLocaleTimeString()}`;
    onImport(srtEn, srtCn, finalUrl, 'none', finalName);
    onClose();
  };

  return (
    <Modal title={t.importTitle} onClose={onClose}>
      <div className="space-y-5">
        {/* Video File Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-300">{t.videoFileLabel}</label>
          </div>

          <div className="animate-in fade-in duration-200 space-y-2">
            {isElectron ? (
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileVideo className="w-5 h-5 text-blue-400 shrink-0" />
                  <span className="text-xs text-slate-200 truncate font-mono">
                    {exeFilePath || (file ? file.name : t.noFileSelected)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectElectronFile}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-medium transition shrink-0"
                >
                  {t.browseFileBtn}
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition ${file ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 bg-slate-800 hover:bg-slate-750'}`}>
                <div className="flex flex-col items-center justify-center pt-3 pb-3">
                  {file ? (
                    <div className="text-center px-4">
                      <FileVideo className="w-6 h-6 mb-1 text-blue-400 mx-auto" />
                      <p className="text-xs text-blue-300 font-medium truncate max-w-[250px]">{file.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mb-1 text-slate-400" />
                      <p className="text-xs text-slate-400 font-medium">{t.clickToUploadVideo}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.supportsFormats}</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>
        </div>

        {/* Local EXE Subtitle Generator Banner (Electron Mode) */}
        {isElectron ? (
          <div className="p-4 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 rounded-xl border border-blue-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-300 font-semibold text-sm">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>{t.desktopExeTitle}</span>
              </div>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-500/30">
                {t.desktopExeTag}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {t.desktopExeDesc}
            </p>

            {exeError && (
              <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-300 leading-relaxed">
                ⚠️ {exeError}
              </div>
            )}

            {isGenerating ? (
              <div className="space-y-2 py-1">
                <div className="flex items-center gap-2 text-xs text-blue-300 font-medium">
                  <Loader2 className="animate-spin w-3.5 h-3.5" />
                  <span>{t.exeGeneratingLogs}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 max-h-24 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-1">
                  {progressLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <Terminal className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                      <span className="break-all">{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRunSubtitleGenExe}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-md transition"
              >
                <Sparkles size={15} className="text-amber-300" />
                <span>{t.desktopExeBtn}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-300 font-medium mb-0.5">{t.webTipTitle}</p>
              <p className="text-slate-400 text-[11px]">
                {t.webTipDesc}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">{t.subtitlePkgName}</label>
          <input 
            type="text"
            value={subtitleName}
            onChange={e => setSubtitleName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-500"
            placeholder={t.subtitlePkgName}
          />
        </div>

        <div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">{t.pasteEnSrt}</label>
              <textarea 
                value={srtEn}
                onChange={e => setSrtEn(e.target.value)}
                className="w-full h-24 bg-slate-800 border border-slate-600 rounded p-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="1&#10;00:00:01,000 --> 00:00:04,000&#10;Hello World"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">{t.pasteCnSrt}</label>
              <textarea 
                value={srtCn}
                onChange={e => setSrtCn(e.target.value)}
                className="w-full h-24 bg-slate-800 border border-slate-600 rounded p-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="1&#10;00:00:01,000 --> 00:00:04,000&#10;你好世界"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button 
            onClick={handleImport} 
            disabled={!file && !exeFilePath && !srtEn && !srtCn}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-900/20 text-sm"
          >
            <Upload size={18} /> {t.importStartBtn}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- Notebook Modal (Unified) ---
interface NotebookModalProps {
  words: SavedWord[];
  sentences: SavedSentence[];
  appLanguage?: AppLanguage;
  onDeleteWord: (id: string) => void;
  onDeleteSentence: (id: string) => void;
  onClose: () => void;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({ words, sentences, appLanguage = 'zh', onDeleteWord, onDeleteSentence, onClose }) => {
  const [activeTab, setActiveTab] = useState<'words' | 'sentences'>('words');
  const [expandedSentenceIds, setExpandedSentenceIds] = useState<Set<string>>(new Set());
  const t = getT(appLanguage);

  const handleExport = () => {
    const data = { words, sentences };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "notebook_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const toggleSentenceExpand = (id: string) => {
    const newSet = new Set(expandedSentenceIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setExpandedSentenceIds(newSet);
  };

  return (
    <Modal title={t.notebookTitle} onClose={onClose}>
      {/* Tabs & Export */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex bg-slate-800 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('words')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'words' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <BookOpen size={16} /> {t.tabSavedWords} ({words.length})
          </button>
          <button 
            onClick={() => setActiveTab('sentences')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'sentences' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <MessageSquare size={16} /> {t.tabSavedSentences} ({sentences.length})
          </button>
        </div>
        <button onClick={handleExport} className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-600 transition text-slate-300">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === 'words' && (
          <>
            {words.length === 0 && <p className="text-center text-slate-500 py-8">{t.noSavedWords}</p>}
            {words.map(w => (
              <div key={w.id} className="bg-slate-800 p-3 rounded border border-slate-700 relative group transition hover:border-slate-600">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-blue-400 text-lg">{w.word}</h3>
                  <button onClick={() => onDeleteWord(w.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-slate-300 italic mb-1">{w.definition}</p>
                <p className="text-sm text-slate-400 mb-2">{t.translationLabel}: {w.translation}</p>
                <div className="bg-slate-900/50 p-2 rounded text-xs text-slate-500 border-l-2 border-slate-600">
                  "{w.context}"
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'sentences' && (
          <>
            {sentences.length === 0 && <p className="text-center text-slate-500 py-8">{t.noSavedSentences}</p>}
            {sentences.map(s => {
              const isExpanded = expandedSentenceIds.has(s.id);
              const hasAnalysis = !!s.analysis;
              
              return (
                <div key={s.id} className="bg-slate-800 p-3 rounded border border-slate-700 relative group transition hover:border-slate-600">
                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-6 cursor-pointer" onClick={() => hasAnalysis && toggleSentenceExpand(s.id)}>
                      <p className="text-sm text-slate-200 leading-relaxed font-medium">{s.text_en}</p>
                    </div>
                    <button onClick={() => onDeleteSentence(s.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0 ml-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <p className="text-sm text-slate-400 mb-2">{s.text_cn}</p>
                  
                  {/* Footer Row */}
                  <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                     <span className="flex items-center gap-1">
                        {new Date(s.timestamp).toLocaleDateString()}
                     </span>
                     
                     {hasAnalysis && (
                        <button 
                          onClick={() => toggleSentenceExpand(s.id)}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition"
                        >
                           {isExpanded ? (
                             <>{appLanguage === 'en' ? 'Hide Analysis' : '隐藏解析'} <ChevronUp size={14} /></>
                           ) : (
                             <>{appLanguage === 'en' ? 'Show Analysis' : '查看解析'} <ChevronDown size={14} /></>
                           )}
                        </button>
                     )}
                  </div>

                  {/* Expanded Analysis Content */}
                  {isExpanded && s.analysis && (
                     <div className="mt-3 pt-3 border-t border-slate-700 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-slate-900/50 p-3 rounded text-sm">
                           <h4 className="text-blue-400 font-bold text-xs uppercase mb-1">{t.grammarLabel}</h4>
                           <p className="text-slate-300 whitespace-pre-wrap">{s.analysis.grammar_analysis}</p>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded text-sm">
                           <h4 className="text-purple-400 font-bold text-xs uppercase mb-1">{t.idiomsLabel}</h4>
                           <p className="text-slate-300 whitespace-pre-wrap">{s.analysis.idioms_and_collocations}</p>
                        </div>
                     </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </Modal>
  );
};

// --- Sentence Analysis Modal ---
interface SentenceAnalysisModalProps {
  sentence: string;
  loading: boolean;
  data: AISentenceAnalysis | null;
  error: string | null;
  isSaved?: boolean;
  appLanguage?: AppLanguage;
  onSave?: (data: AISentenceAnalysis) => void;
  onClose: () => void;
}

export const SentenceAnalysisModal: React.FC<SentenceAnalysisModalProps> = ({ 
  sentence, 
  loading, 
  data, 
  error, 
  isSaved,
  appLanguage = 'zh',
  onSave,
  onClose 
}) => {
  const t = getT(appLanguage);

  return (
    <Modal title={t.sentenceAnalysisTitle} onClose={onClose}>
      <div className="mb-6 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
         <p className="text-lg text-slate-200 font-medium leading-relaxed">"{sentence}"</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
           <Loader2 className="animate-spin text-blue-500" size={32} />
           <p>{t.analyzingSentenceMsg}</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded text-red-300 text-center">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="space-y-2">
             <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">{t.naturalTranslation}</h3>
             <p className="text-slate-200 text-lg">{data.translation}</p>
          </div>
          
          <div className="space-y-2">
             <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">{t.grammarAnalysis}</h3>
             <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{data.grammar_analysis}</p>
          </div>
          
          <div className="space-y-2">
             <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">{t.idiomsCollocations}</h3>
             <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{data.idioms_and_collocations}</p>
          </div>
          
          {/* Action Footer */}
          {onSave && (
              <div className="pt-4 border-t border-slate-700 mt-6 flex justify-end">
                <button 
                  onClick={() => onSave(data)}
                  disabled={isSaved}
                  className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition text-sm ${isSaved ? 'bg-green-600/20 text-green-400 cursor-default' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                >
                    {isSaved ? (
                        <>
                           <Bookmark size={18} fill="currentColor" /> {t.savedToNotebook}
                        </>
                    ) : (
                        <>
                           <Bookmark size={18} /> {t.saveSentenceAnalysisBtn}
                        </>
                    )}
                </button>
              </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};

// --- Subtitle History Modal ---
interface SubtitleHistoryModalProps {
  history: CachedSubtitleHistory[];
  currentId?: string;
  appLanguage?: AppLanguage;
  onSelect: (item: CachedSubtitleHistory) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onClose: () => void;
}

export const SubtitleHistoryModal: React.FC<SubtitleHistoryModalProps> = ({
  history,
  currentId,
  appLanguage = 'zh',
  onSelect,
  onDelete,
  onRename,
  onClose
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const t = getT(appLanguage);

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <Modal title={t.historyTitle} onClose={onClose}>
      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2 border border-slate-800 rounded-lg bg-slate-900/50">
            <Clock size={28} className="mx-auto text-slate-600 animate-pulse" />
            <p className="text-sm">{t.noHistorySubtitles}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
            {history.map((item) => {
              const isEditing = editingId === item.id;
              const isCurrent = currentId === item.id;
              const formattedDate = new Date(item.createdAt).toLocaleString(appLanguage === 'en' ? 'en-US' : 'zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={item.id} 
                  className={`p-3.5 rounded-lg border transition-all flex flex-col gap-2 relative group ${
                    isCurrent 
                      ? 'bg-blue-950/40 border-blue-500/60 shadow-md shadow-blue-950/20' 
                      : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(item.id)}
                            className="bg-slate-900 border border-blue-500 text-sm rounded px-2 py-1 text-slate-100 font-medium focus:outline-none flex-1 min-w-0"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleSaveRename(item.id)}
                            className="p-1 hover:bg-slate-700 text-green-400 rounded transition shrink-0"
                            title="Save"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-1 hover:bg-slate-700 text-slate-400 rounded transition shrink-0"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-200 text-sm truncate" title={item.name}>
                            {item.name}
                          </h3>
                          <button 
                            onClick={() => startEditing(item.id, item.name)}
                            className="p-1 text-slate-500 hover:text-slate-300 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition shrink-0"
                            title={t.renameBtn}
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      )}

                      {/* Subtitle Details */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-500" />
                          {formattedDate}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span>{item.subtitles?.length || 0} {t.linesCount}</span>
                        {isCurrent && (
                          <>
                            <span className="text-slate-600">|</span>
                            <span className="text-blue-400 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px]">{t.activePlayingTag}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded transition shrink-0 self-start"
                      title={t.deleteBtn}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {!isCurrent && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onSelect(item)}
                        className="text-xs bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white px-3 py-1.5 rounded font-medium transition duration-200"
                      >
                        {t.loadSubtitlesBtn}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};