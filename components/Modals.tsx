import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Download, Trash2, Settings as SettingsIcon, FileVideo, BookOpen, MessageSquare, Loader2, ChevronDown, ChevronUp, Bookmark } from 'lucide-react';
import { AppSettings, SavedWord, SavedSentence, AISentenceAnalysis, AIProvider } from '../types';

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

  // Sync state if settings prop changes (e.g. from App default loading)
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
    // Set meaningful defaults when switching if the fields are empty or generic
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
    <Modal title="Settings" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">AI Provider</label>
          <select 
            value={formData.provider}
            onChange={handleProviderChange}
            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="gemini">Google Gemini (Native)</option>
            <option value="openai">OpenAI Compatible (Qwen/DeepSeek)</option>
          </select>
        </div>

        {formData.provider === 'openai' && (
           <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Base URL</label>
            <input 
              type="text" 
              value={formData.baseUrl}
              onChange={e => setFormData({...formData, baseUrl: e.target.value})}
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
            />
            <p className="text-xs text-slate-500 mt-1">Endpoint base for /chat/completions</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">API Key</label>
          <input 
            type="password" 
            value={formData.apiKey}
            onChange={e => setFormData({...formData, apiKey: e.target.value})}
            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder={formData.provider === 'gemini' ? "AIza..." : "sk-..."}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Model Name</label>
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

        <div className="pt-4 flex justify-end">
          <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-medium transition">
            <Save size={16} /> Save Settings
          </button>
        </div>
      </form>
    </Modal>
  );
};

// --- Import Modal ---
interface ImportModalProps {
  onImport: (en: string, cn: string, videoUrl: string) => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose }) => {
  const [srtEn, setSrtEn] = useState('');
  const [srtCn, setSrtCn] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleImport = () => {
    let finalUrl = '';
    if (file) {
      finalUrl = URL.createObjectURL(file);
    }
    onImport(srtEn, srtCn, finalUrl);
    onClose();
  };

  return (
    <Modal title="Import Content" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Video File (MP4/WebM)</label>
          <div className="animate-in fade-in duration-200">
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition ${file ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 bg-slate-800 hover:bg-slate-750'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <div className="text-center px-4">
                        <FileVideo className="w-8 h-8 mb-2 text-blue-400 mx-auto" />
                        <p className="text-sm text-blue-300 font-medium truncate max-w-[250px]">{file.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2 text-slate-400" />
                        <p className="text-sm text-slate-400 font-medium">Click to upload video</p>
                        <p className="text-xs text-slate-500 mt-1">Supports MP4, WebM</p>
                      </>
                    )}
                </div>
                <input type="file" className="hidden" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">English SRT</label>
            <textarea 
              value={srtEn}
              onChange={e => setSrtEn(e.target.value)}
              className="w-full h-32 bg-slate-800 border border-slate-600 rounded p-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="1&#10;00:00:01,000 --> 00:00:04,000&#10;Hello World"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Chinese SRT</label>
            <textarea 
              value={srtCn}
              onChange={e => setSrtCn(e.target.value)}
              className="w-full h-32 bg-slate-800 border border-slate-600 rounded p-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="1&#10;00:00:01,000 --> 00:00:04,000&#10;你好世界"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button 
            onClick={handleImport} 
            disabled={!file && !srtEn && !srtCn}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-900/20"
          >
            <Upload size={18} /> Import & Start
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
  onDeleteWord: (id: string) => void;
  onDeleteSentence: (id: string) => void;
  onClose: () => void;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({ words, sentences, onDeleteWord, onDeleteSentence, onClose }) => {
  const [activeTab, setActiveTab] = useState<'words' | 'sentences'>('words');
  const [expandedSentenceIds, setExpandedSentenceIds] = useState<Set<string>>(new Set());

  const handleExport = () => {
    const data = { words, sentences };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "gemini_notebook.json");
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
    <Modal title="My Notebook" onClose={onClose}>
      {/* Tabs & Export */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex bg-slate-800 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('words')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'words' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <BookOpen size={16} /> Words ({words.length})
          </button>
          <button 
            onClick={() => setActiveTab('sentences')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'sentences' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <MessageSquare size={16} /> Sentences ({sentences.length})
          </button>
        </div>
        <button onClick={handleExport} className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-600 transition">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === 'words' && (
          <>
            {words.length === 0 && <p className="text-center text-slate-500 py-8">No words saved yet.</p>}
            {words.map(w => (
              <div key={w.id} className="bg-slate-800 p-3 rounded border border-slate-700 relative group transition hover:border-slate-600">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-blue-400 text-lg">{w.word}</h3>
                  <button onClick={() => onDeleteWord(w.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-slate-300 italic mb-1">{w.definition}</p>
                <p className="text-sm text-slate-400 mb-2">Translation: {w.translation}</p>
                <div className="bg-slate-900/50 p-2 rounded text-xs text-slate-500 border-l-2 border-slate-600">
                  "{w.context}"
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'sentences' && (
          <>
            {sentences.length === 0 && <p className="text-center text-slate-500 py-8">No sentences saved yet.</p>}
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
                             <>Hide Analysis <ChevronUp size={14} /></>
                           ) : (
                             <>Show Analysis <ChevronDown size={14} /></>
                           )}
                        </button>
                     )}
                  </div>

                  {/* Expanded Analysis Content */}
                  {isExpanded && s.analysis && (
                     <div className="mt-3 pt-3 border-t border-slate-700 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-slate-900/50 p-3 rounded text-sm">
                           <h4 className="text-blue-400 font-bold text-xs uppercase mb-1">Grammar</h4>
                           <p className="text-slate-300 whitespace-pre-wrap">{s.analysis.grammar_analysis}</p>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded text-sm">
                           <h4 className="text-purple-400 font-bold text-xs uppercase mb-1">Idioms & Collocations</h4>
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
  onSave?: (data: AISentenceAnalysis) => void;
  onClose: () => void;
}

export const SentenceAnalysisModal: React.FC<SentenceAnalysisModalProps> = ({ 
  sentence, 
  loading, 
  data, 
  error, 
  isSaved,
  onSave,
  onClose 
}) => {
  return (
    <Modal title="AI Sentence Analysis" onClose={onClose}>
      <div className="mb-6 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
         <p className="text-lg text-slate-200 font-medium leading-relaxed">"{sentence}"</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
           <Loader2 className="animate-spin text-blue-500" size={32} />
           <p>Analyzing grammar and structure...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded text-red-300 text-center">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="space-y-2">
             <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Translation</h3>
             <p className="text-slate-200 text-lg">{data.translation}</p>
          </div>
          
          <div className="space-y-2">
             <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Grammar Analysis</h3>
             <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{data.grammar_analysis}</p>
          </div>
          
          <div className="space-y-2">
             <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Idioms & Collocations</h3>
             <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{data.idioms_and_collocations}</p>
          </div>
          
          {/* Action Footer */}
          {onSave && (
              <div className="pt-4 border-t border-slate-700 mt-6 flex justify-end">
                <button 
                  onClick={() => onSave(data)}
                  disabled={isSaved}
                  className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition ${isSaved ? 'bg-green-600/20 text-green-400 cursor-default' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                >
                    {isSaved ? (
                        <>
                           <Bookmark size={18} fill="currentColor" /> Saved to Notebook
                        </>
                    ) : (
                        <>
                           <Bookmark size={18} /> Save to Notebook
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