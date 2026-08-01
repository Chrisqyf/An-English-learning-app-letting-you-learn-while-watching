export interface Subtitle {
  id: string;
  start: number; // Seconds
  end: number;   // Seconds
  text_en: string;
  text_cn: string;
}

export interface SavedWord {
  id: string;
  word: string;
  definition: string;
  translation: string;
  context: string;
  timestamp: number;
}

export interface SavedSentence {
  id: string;
  text_en: string;
  text_cn: string;
  note?: string;
  timestamp: number;
  analysis?: AISentenceAnalysis; // Added: Store analysis data
}

export type AIProvider = 'gemini' | 'openai';

export interface AppSettings {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  autoPause: boolean;
  blurMode: 'none' | 'focus' | 'all';
  showEn: boolean;
  showCn: boolean;
  appLanguage: 'zh' | 'en';
}

export interface AIResponse {
  definition: string;
  translation: string;
  usage_example: string;
}

export interface AISentenceAnalysis {
  translation: string;
  grammar_analysis: string;
  idioms_and_collocations: string;
}

export interface VideoState {
  playing: boolean;
  played: number; // 0 to 1
  currentTime: number; // seconds
  duration: number; // seconds
}

export interface CachedSubtitleHistory {
  id: string;
  name: string;
  subtitles: Subtitle[];
  videoUrl?: string;
  createdAt: number;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      selectVideoFile: () => Promise<string | null>;
      generateSubtitles: (options: {
        videoPath: string;
        apiKey: string;
        lang?: 'en' | 'zh';
        mode?: 'auto' | 'realtime' | 'offline';
      }) => Promise<{ success: boolean; srtContent?: string; error?: string }>;
      onProgress: (callback: (text: string) => void) => () => void;
    };
  }
}
