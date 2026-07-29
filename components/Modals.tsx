import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Download, Trash2, Settings as SettingsIcon, FileVideo, BookOpen, MessageSquare, Loader2, ChevronDown, ChevronUp, Bookmark, Clock, Calendar, Edit2, Check } from 'lucide-react';
import { AppSettings, SavedWord, SavedSentence, AISentenceAnalysis, AIProvider, CachedSubtitleHistory } from '../types';

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
  onImport: (en: string, cn: string, videoUrl: string, mode: 'none' | 'simple' | 'full', name: string) => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose }) => {
  const [srtEn, setSrtEn] = useState('');
  const [srtCn, setSrtCn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preprocessMode, setPreprocessMode] = useState<'none' | 'simple' | 'full'>('full');
  const [subtitleName, setSubtitleName] = useState('');

  useEffect(() => {
    if (file && !subtitleName) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setSubtitleName(nameWithoutExt + ' 字幕');
    }
  }, [file]);

  const handleImport = () => {
    let finalUrl = '';
    if (file) {
      finalUrl = URL.createObjectURL(file);
    }
    const finalName = subtitleName.trim() || `导入字幕 ${new Date().toLocaleTimeString()}`;
    onImport(srtEn, srtCn, finalUrl, preprocessMode, finalName);
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

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">字幕包名称 (Subtitle Name)</label>
          <input 
            type="text"
            value={subtitleName}
            onChange={e => setSubtitleName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-500"
            placeholder="为本次导入的字幕命名，方便在历史记录中区分..."
          />
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

        {/* Subtitle Preprocessing Mode Selection */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <label className="block text-sm font-medium text-slate-300">字幕预处理模式 (Subtitle Preprocessing)</label>
          <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setPreprocessMode('none')}
              className={`py-2 px-1 text-xs font-medium rounded transition-all ${
                preprocessMode === 'none' 
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              不处理
            </button>
            <button
              type="button"
              onClick={() => setPreprocessMode('simple')}
              className={`py-2 px-1 text-xs font-medium rounded transition-all ${
                preprocessMode === 'simple' 
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              简单处理
            </button>
            <button
              type="button"
              onClick={() => setPreprocessMode('full')}
              className={`py-2 px-1 text-xs font-medium rounded transition-all ${
                preprocessMode === 'full' 
                  ? 'bg-blue-600 text-white shadow-sm border border-blue-500 animate-pulse-slow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              完全处理 (AI)
            </button>
          </div>
          
          <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/80 text-xs text-slate-400 space-y-1.5 leading-relaxed">
            {preprocessMode === 'none' && (
              <>
                <p className="font-semibold text-slate-300">🚫 不处理模式 (Skip Preprocessing)</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li>保持 SRT 文件原始结构，不改变时间戳与断句分行。</li>
                  <li>适合已由人工或其它工具精心调校完毕、无需任何再分断或合并的字幕。</li>
                  <li>不发送任何 API 请求，零延迟，零费用。</li>
                </ul>
              </>
            )}
            {preprocessMode === 'simple' && (
              <>
                <p className="font-semibold text-slate-300">⚡ 简单处理模式 (Rule-based Preprocessing)</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li>基于标点符号的简易离线规则进行字幕碎片预合并。</li>
                  <li>不执行 AI 语义分析，也不会自动拆分时长超长（如大于18秒）的卡片。</li>
                  <li>纯本地算法运行，极速处理，不消耗任何 API Token。</li>
                </ul>
              </>
            )}
            {preprocessMode === 'full' && (
              <>
                <p className="font-semibold text-blue-400 flex items-center gap-1">✨ 完全处理模式 (AI-driven Preprocessing)</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li>基于标点符号预合并 + AI 语义完整性判定合并。</li>
                  <li>支持智能并发检测，若合并后或原有卡片超出 18 秒，将通过 AI 语义及呼吸点自动并行拆分。</li>
                  <li>
                    <span className="text-amber-500 font-semibold">⚠️ Token 消耗提示：</span>
                    此模式按字幕分块并发调用大模型接口。如果字幕文件较长，可能会产生
                    <span className="text-amber-400 font-semibold"> 较多/大量的 API Token 消耗</span>
                    ，具体用量与字幕的总行数和字符长度成正比。
                  </li>
                </ul>
              </>
            )}
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

// --- Subtitle History Modal ---
interface SubtitleHistoryModalProps {
  history: CachedSubtitleHistory[];
  currentId?: string;
  onSelect: (item: CachedSubtitleHistory) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onClose: () => void;
}

export const SubtitleHistoryModal: React.FC<SubtitleHistoryModalProps> = ({
  history,
  currentId,
  onSelect,
  onDelete,
  onRename,
  onClose
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
    <Modal title="字幕历史记录 (Subtitle History)" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          这里保存了您处理过的所有字幕记录。您可以随时切换回某份字幕或删除不需要的备份（全部保存在浏览器本地）。
        </p>

        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2 border border-slate-800 rounded-lg bg-slate-900/50">
            <Clock size={28} className="mx-auto text-slate-600 animate-pulse" />
            <p className="text-sm">暂无历史记录</p>
            <p className="text-[11px] text-slate-600">通过导入、处理新字幕，它们会自动保存在这里。</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
            {history.map((item) => {
              const isEditing = editingId === item.id;
              const isCurrent = currentId === item.id;
              const formattedDate = new Date(item.createdAt).toLocaleString('zh-CN', {
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
                            title="保存"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-1 hover:bg-slate-700 text-slate-400 rounded transition shrink-0"
                            title="取消"
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
                            title="重命名"
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
                        <span>{item.subtitles?.length || 0} 句字幕</span>
                        {isCurrent && (
                          <>
                            <span className="text-slate-600">|</span>
                            <span className="text-blue-400 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px]">当前使用中</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded transition shrink-0 self-start"
                      title="删除记录"
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
                        加载此字幕
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