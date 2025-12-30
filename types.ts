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