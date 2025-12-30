import { Subtitle, AppSettings } from './types';

export const INITIAL_SETTINGS: AppSettings = {
  apiKey: '',
  modelName: 'gemini-2.0-flash',
  autoPause: false,
  blurMode: 'none',
  showEn: true,
  showCn: true,
};

export const MOCK_SUBTITLES: Subtitle[] = [
  { id: '1', start: 0, end: 4.5, text_en: "Welcome to the Gemini Language Player, a new way to learn English.", text_cn: "欢迎来到 Gemini 语言播放器，这是一种学习英语的新方法。" },
  { id: '2', start: 4.5, end: 9.0, text_en: "This application helps you master vocabulary through context and AI analysis.", text_cn: "此应用程序可帮助您通过上下文和 AI 分析掌握词汇。" },
  { id: '3', start: 9.0, end: 13.5, text_en: "You can click on any word to get an instant definition and translation.", text_cn: "您可以单击任何单词以获得即时定义和翻译。" },
  { id: '4', start: 13.5, end: 18.0, text_en: "Try using the keyboard shortcuts to navigate through the video efficiently.", text_cn: "尝试使用键盘快捷键高效地浏览视频。" },
  { id: '5', start: 18.0, end: 22.5, text_en: "You can import your own subtitles and connect your own Gemini API key.", text_cn: "您可以导入自己的字幕并连接自己的 Gemini API 密钥。" },
  { id: '6', start: 22.5, end: 26.0, text_en: "Video learning is one of the most effective methods for retention.", text_cn: "视频学习是保持记忆最有效的方法之一。" },
  { id: '7', start: 26.0, end: 30.0, text_en: "Don't forget to save difficult words to your vocabulary notebook.", text_cn: "别忘了把难懂的单词保存到你的生词本里。" },
  { id: '8', start: 30.0, end: 34.0, text_en: "Syncing subtitles allows you to focus on listening comprehension.", text_cn: "同步字幕让您可以专注于听力理解。" },
  { id: '9', start: 34.0, end: 38.0, text_en: "Use the blur mode to hide text and test your ears.", text_cn: "使用模糊模式隐藏文本并测试您的耳朵。" },
  { id: '10', start: 38.0, end: 42.0, text_en: "Let's get started with your learning journey right now.", text_cn: "让我们现在就开始您的学习之旅吧。" },
];

// Default to empty to show the Intro/Shortcuts screen first
export const DEFAULT_VIDEO_URL = "";