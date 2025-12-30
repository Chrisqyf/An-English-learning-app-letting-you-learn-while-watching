import React, { useState } from 'react';
import { X, Save, Upload, Download, Trash2, Settings as SettingsIcon, FileVideo, BookOpen, MessageSquare, Loader2 } from 'lucide-react';
import { AppSettings, SavedWord, SavedSentence, AISentenceAnalysis } from '../types';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">API Key (Google Gemini)</label>
          <input 
            type="password" 
            value={formData.apiKey}
            onChange={e => setFormData({...formData, apiKey: e.target.value})}
            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="AIza..."
          />
          <p className="text-xs text-slate-500 mt-1">Get your key from Google AI Studio.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Model Name</label>
          <input 
            type="text" 
            list="model-suggestions"
            value={formData.modelName}
            onChange={e => setFormData({...formData, modelName: e.target.value})}
            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="gemini-2.0-flash"
          />
          <datalist id="model-suggestions">
            <option value="gemini-2.0-flash" />
            <option value="gemini-1.5-flash" />
          </datalist>
          <p className="text-xs text-slate-500 mt-1">Select or type a valid model ID.</p>
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
            {sentences.map(s => (
              <div key={s.id} className="bg-slate-800 p-3 rounded border border-slate-700 relative group transition hover:border-slate-600">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-slate-200 leading-relaxed pr-6">{s.text_en}</p>
                  <button onClick={() => onDeleteSentence(s.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-slate-400">{s.text_cn}</p>
                <div className="mt-2 text-xs text-slate-500 flex justify-end">
                   {new Date(s.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
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
  onClose: () => void;
}

export const SentenceAnalysisModal: React.FC<SentenceAnalysisModalProps> = ({ sentence, loading, data, error, onClose }) => {
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
        </div>
      ) : null}
    </Modal>
  );
};