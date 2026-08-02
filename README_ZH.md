<div align="center">

[English](README.md) | [中文](README_ZH.md)

</div>

<div align="center">
<img width="2560" height="1270" alt="GHBanner" src="https://github.com/Chrisqyf/An-English-learning-app-letting-you-learn-while-watching/blob/main/interface_v2.0.png" />
</div>

<div align="center">
<img width="2560" height="1270" alt="GHBanner" src="https://github.com/Chrisqyf/An-English-learning-app-letting-you-learn-while-watching/blob/main/interface_v2.0_Import_Subtitles_Media.png" />
</div>

这是一款为中文学习者打造的免费英语学习播放器。可能产生的任何费用都只来自你自己调用的 AI API Key。通常情况下，你可以直接使用 AI 模型厂商提供的免费额度。
未来的更新中可能会加入对其他语言的学习功能。

## V2.0（重大更新）

2026.08.02：

1. 提供可以在本地运行的可执行程序，在中国大陆以外的地区无需联网即可启动。详见 [DESKTOP_EXE_GUIDE.md](DESKTOP_EXE_GUIDE.md)。
2. 提供更高质量的字幕获取程序（subtitle_gen.exe），它可以独立运行，也可以通过 English Intensive Listening.exe 一键调用，用于提取视频字幕并自动加载。
3. 支持应用重启后加载历史字幕，无需重复导入。
4. 支持中英文界面切换。

# 使用方法（推荐）
点击我通过 Vercel 创建的域名：
https://an-english-learning-app-letting-you.vercel.app/

请注意，该访问方式目前仅支持中国大陆以外的网络。如果你使用的是这类网络，需要提前准备稳定的 VPN。本应用也会在后续更新中为中国大陆网络提供访问方式。

详细的视频教程已发布：https://www.bilibili.com/video/BV1MDvYBcE4q/?share_source=copy_web&vd_source=8440a348859d4cdcf8c1b27ac0e2b822

# 你需要准备什么（重要）

1. `API_KEY`：让应用调用 Gemini 来分析单词/句子。如果你没有 API Key，请参考：https://ai.google.dev/gemini-api/docs/api-key?hl=zh-cn 或 https://bailian.console.aliyun.com/?spm=5176.29597918.J_SEsSjsNv72yRuRFS2VknO.2.343e7b08KSr9vb&tab=api#/api。在 [.env.local](.env.local) 中设置 `API_KEY`。
2. `视频文件（.mp4）`：你需要把感兴趣的视频下载到电脑上。有一个免费网站可以通过上传视频 URL 来下载 YouTube 视频：https://en.loader.to/1/vimeo-downloader.html
3. `字幕文件（.srt）`：本应用需要一份字幕文本文件。通常上一步下载的 .mp4 文件没有字幕。有两种获取字幕的方式：
	
	(1) 免费网站 https://downsub.com/ 可以从视频平台（如 YouTube）获取原生字幕。该方法需要通过外网登录。完全免费，但字幕经常出现不合逻辑的断句，影响使用体验。
	
	(2)（推荐）我自己开发的一个程序，通过 AI 语音模型获取字幕，具备合理的字幕断句和精准的时间轴对齐。需要配置阿里云百炼的 API Key。https://github.com/Chrisqyf/AI-Audio-Video-Subtitle-Generator

# 更新记录

## V1.0

2026.01.02: 

1. 优化单句播放体验：将每个句子的播放时长延长 0.1 秒，确保每个句子的发音完整。
2. 增加变速播放功能。

2026.01.24：

1. 修复自动播放功能的 bug。
2. 支持收藏并导出句子分析结果。

2026.07.29：

1. 句子合并功能更新：支持快捷键合并与撤销。字幕卡片上的合并按钮不再影响字幕显示。
