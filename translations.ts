export type AppLanguage = 'zh' | 'en';

export const translations = {
  zh: {
    // Top Bar & Controls
    appTitle: "英语精听",
    playbackSpeed: "播放速度",
    blurNone: "无模糊",
    blurFocus: "焦点模糊",
    blurAll: "全模糊",
    autoPause: "自动暂停",
    undoMerge: "撤销合并 (Z键)",
    langToggle: "语言 / Lang",
    
    // Right Toolbar & Subtitles
    myNotebook: "我的生词本",
    subtitleHistory: "历史字幕包",
    importSubtitles: "导入字幕",
    exportSubtitles: "导出 SRT",
    settings: "设置",
    showEn: "显示英文",
    showCn: "显示中文",
    linesCount: "条字幕",
    noSubtitlesLoaded: "暂无加载字幕",
    importSrtLink: "点击导入 SRT",

    // Welcome Screen & Shortcuts
    welcomeTitle: "欢迎使用英语精听学习播放器",
    welcomeSub: "请导入或选择本地视频/音频文件开始精听学习",
    shortcutsTitle: "快捷键指南",
    featuresTitle: "核心功能特点",
    spacePlayPause: "播放 / 暂停",
    prevSentence: "上一句",
    nextSentence: "下一句",
    replayCurrent: "重播当前句",
    cycleBlur: "切换模糊模式",
    mergeWithPrev: "与上一句合并",
    mergeWithNext: "与下一句合并",
    undoKey: "撤销上次合并",
    aiDefinitionFeature: "单击任意单词即可获取 AI 精准释义与地道例句",
    autoPauseFeature: "单句播放完毕后可开启自动暂停，方便跟读复述",
    mergeSubsFeature: "灵活按 Q / E 键快速合并上下切分不佳的字幕",
    notebookFeature: "一键收藏生词与精彩例句到生词本",
    selectVideoFileBtn: "选取本地视频文件",
    selectVideoNotice: "选择本地视频/音频文件以同步播放：",

    // Playback Error
    playbackErrorTitle: "播放错误",
    playbackErrorMsg: "视频无法嵌入播放或链接失效，请选择本地视频文件以配合字幕播放：",

    // Subtitle Card Tooltips
    aiAnalysisTooltip: "AI 句法与表达深度解析",
    bookmarkSentenceTooltip: "收藏例句",
    mergePrevTooltip: "与上一句合并 (Q)",
    mergeNextTooltip: "与下一句合并 (E)",

    // Settings Modal
    settingsTitle: "设置",
    appLanguageLabel: "应用界面语言 (App Language)",
    generalAiProvider: "通用 AI 服务商 (General AI Provider)",
    apiKeyLabel: "AI API Key 密钥",
    baseUrlLabel: "API Base URL 请求地址",
    modelNameLabel: "模型名称 (Model Name)",
    saveSettingsBtn: "保存设置",

    // Import Modal
    importTitle: "导入字幕与视频",
    videoFileLabel: "视频文件 (Video File)",
    browseFileBtn: "浏览文件...",
    clickToUploadVideo: "点击上传视频文件",
    supportsFormats: "支持 MP4, WebM 等本地格式",
    noFileSelected: "尚未选取本地视频路径",
    subtitlePkgName: "字幕包名称",
    pasteEnSrt: "粘贴英文 SRT 字幕",
    pasteCnSrt: "粘贴中文 SRT 字幕",
    importStartBtn: "导入并开启精听",
    desktopExeTitle: "⚡ 本地 EXE 一键生成字幕",
    desktopExeTag: "DESKTOP EXE",
    desktopExeDesc: "后台自动调用同目录下的 subtitle_gen.exe 提取音频并生成高精度对齐字幕，生成后自动装载到精听程序中。",
    desktopExeBtn: "一键调用 subtitle_gen.exe 提取并加载字幕",
    exeGeneratingLogs: "正在生成字幕中，请稍候...",
    webTipTitle: "💡 运行提示 (Web / EXE 说明)",
    webTipDesc: "当前为 Web 浏览器版本。如果您在本机打包或运行 Electron EXE 桌面版本，此页面支持一键自动调用同目录下的 subtitle_gen.exe 提取字幕。当前 Web 版本可直接粘贴/导入 SRT 文件或载入历史字幕。",

    // Notebook Modal
    notebookTitle: "我的单词与例句本",
    tabSavedWords: "生词库",
    tabSavedSentences: "精彩例句",
    noSavedWords: "暂无收藏的生词",
    noSavedSentences: "暂无收藏的例句",
    definitionLabel: "英文释义",
    translationLabel: "中文翻译",
    usageLabel: "地道例句",
    grammarLabel: "句法结构解析",
    idiomsLabel: "固定搭配与地道表达",

    // Sentence Analysis Modal
    sentenceAnalysisTitle: "AI 句子深度解析",
    naturalTranslation: "自然中文翻译",
    grammarAnalysis: "句法与语法结构解析",
    idiomsCollocations: "固定搭配与地道表达",
    saveSentenceAnalysisBtn: "收藏该例句与解析",
    savedToNotebook: "已收藏至生词本",
    analyzingSentenceMsg: "正在深度分析句法结构与地道表达...",

    // Subtitle History Modal
    historyTitle: "历史字幕包管理",
    activePlayingTag: "当前播放中",
    loadSubtitlesBtn: "加载此字幕包",
    renameBtn: "重命名",
    deleteBtn: "删除",
    noHistorySubtitles: "暂无历史字幕记录",
    renamePrompt: "请输入新的字幕包名称：",

    // Word Popover
    wordAnalysisTitle: "单词解析",
    saveToVocabTooltip: "保存至生词本",
    analyzingContextMsg: "正在结合上下文分析..."
  },
  en: {
    // Top Bar & Controls
    appTitle: "English Intensive Listening",
    playbackSpeed: "Playback Speed",
    blurNone: "Blur: Off",
    blurFocus: "Blur: Focus",
    blurAll: "Blur: All",
    autoPause: "Auto-Pause",
    undoMerge: "Undo Merge (Z)",
    langToggle: "Lang / 语言",

    // Right Toolbar & Subtitles
    myNotebook: "My Notebook",
    subtitleHistory: "Subtitle History",
    importSubtitles: "Import Subtitles",
    exportSubtitles: "Export SRT",
    settings: "Settings",
    showEn: "Show English",
    showCn: "Show Chinese",
    linesCount: "lines",
    noSubtitlesLoaded: "No subtitles loaded",
    importSrtLink: "Import SRT",

    // Welcome Screen & Shortcuts
    welcomeTitle: "Welcome to English Intensive Listening Player",
    welcomeSub: "Import or select a local video/audio file to start listening practice",
    shortcutsTitle: "Keyboard Shortcuts",
    featuresTitle: "Key Features",
    spacePlayPause: "Play / Pause",
    prevSentence: "Previous Sentence",
    nextSentence: "Next Sentence",
    replayCurrent: "Replay Current",
    cycleBlur: "Cycle Blur Mode",
    mergeWithPrev: "Merge with Previous",
    mergeWithNext: "Merge with Next",
    undoKey: "Undo Last Merge",
    aiDefinitionFeature: "Click any word for AI definition & contextual usage",
    autoPauseFeature: "Auto-Pause after sentence ends for shadow reading",
    mergeSubsFeature: "Press Q / E to quickly merge fragmented subtitles",
    notebookFeature: "Bookmark words and sentences to your Notebook",
    selectVideoFileBtn: "Select Local Video File",
    selectVideoNotice: "Select a local video file to sync playback:",

    // Playback Error
    playbackErrorTitle: "Playback Error",
    playbackErrorMsg: "Video stream cannot be loaded. Select a local video file to play alongside your subtitles:",

    // Subtitle Card Tooltips
    aiAnalysisTooltip: "AI Sentence Analysis",
    bookmarkSentenceTooltip: "Bookmark Sentence",
    mergePrevTooltip: "Merge with Previous (Q)",
    mergeNextTooltip: "Merge with Next (E)",

    // Settings Modal
    settingsTitle: "Settings",
    appLanguageLabel: "App Interface Language",
    generalAiProvider: "General AI Provider",
    apiKeyLabel: "AI API Key",
    baseUrlLabel: "API Base URL",
    modelNameLabel: "Model Name",
    saveSettingsBtn: "Save Settings",

    // Import Modal
    importTitle: "Import Subtitles & Media",
    videoFileLabel: "Video File",
    browseFileBtn: "Browse...",
    clickToUploadVideo: "Click to upload video file",
    supportsFormats: "Supports MP4, WebM and local media",
    noFileSelected: "No local video path selected",
    subtitlePkgName: "Subtitle Package Name",
    pasteEnSrt: "Paste English SRT Subtitles",
    pasteCnSrt: "Paste Chinese SRT Subtitles",
    importStartBtn: "Import & Start",
    desktopExeTitle: "⚡ Local EXE Subtitle Generator",
    desktopExeTag: "DESKTOP EXE",
    desktopExeDesc: "Invokes subtitle_gen.exe in the background to extract audio and generate precision aligned subtitles directly into the app.",
    desktopExeBtn: "Run subtitle_gen.exe & Load Subtitles",
    exeGeneratingLogs: "Generating subtitles, please wait...",
    webTipTitle: "💡 Operating Mode (Web / EXE)",
    webTipDesc: "Running in Web Browser mode. When packaged or run as Electron EXE, this page can call subtitle_gen.exe automatically. In Web mode, you can paste/import SRT files or load history.",

    // Notebook Modal
    notebookTitle: "My Vocabulary & Sentences Notebook",
    tabSavedWords: "Saved Words",
    tabSavedSentences: "Saved Sentences",
    noSavedWords: "No saved words yet",
    noSavedSentences: "No saved sentences yet",
    definitionLabel: "Definition",
    translationLabel: "Translation",
    usageLabel: "Usage Example",
    grammarLabel: "Grammar Analysis",
    idiomsLabel: "Idioms & Collocations",

    // Sentence Analysis Modal
    sentenceAnalysisTitle: "AI Sentence Analysis",
    naturalTranslation: "Translation",
    grammarAnalysis: "Grammar & Structure Analysis",
    idiomsCollocations: "Idioms & Collocations",
    saveSentenceAnalysisBtn: "Bookmark Sentence & Analysis",
    savedToNotebook: "Saved to Notebook",
    analyzingSentenceMsg: "Analyzing sentence grammar and expressions...",

    // Subtitle History Modal
    historyTitle: "Subtitle History Management",
    activePlayingTag: "Currently Playing",
    loadSubtitlesBtn: "Load Subtitles",
    renameBtn: "Rename",
    deleteBtn: "Delete",
    noHistorySubtitles: "No subtitle history found",
    renamePrompt: "Enter new subtitle package name:",

    // Word Popover
    wordAnalysisTitle: "Word Analysis",
    saveToVocabTooltip: "Save to Vocabulary",
    analyzingContextMsg: "Analyzing in context..."
  }
};

export type Translations = typeof translations.zh;

export const getT = (lang: AppLanguage = 'zh'): Translations => {
  return translations[lang] || translations.zh;
};
