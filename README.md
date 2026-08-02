<div align="center">

[English](README.md) | [中文](README_ZH.md)

</div>

<div align="center">
<img width="2560" height="1270" alt="GHBanner" src="https://github.com/Chrisqyf/An-English-learning-app-letting-you-learn-while-watching/blob/main/interface_v2.0.png" />
</div>

<div align="center">
<img width="2560" height="1270" alt="GHBanner" src="https://github.com/Chrisqyf/An-English-learning-app-letting-you-learn-while-watching/blob/main/interface_v2.0_Import_Subtitles_Media.png" />
</div>

This is a free English Learning Player for Chinese Learner. Any potential fees incurred will only come from the AI API key invoked by yourself. Normally, you can use the free quota provided by the AI model vendor.
Language learning features for other different languages may be added in future updates.

## V2.0 (Major Updates)

2026.08.02: 

1. Provides an executable program that can run locally, which can be launched without networks outside Chinese mainland. See the [DESKTOP_EXE_GUIDE_EN.md](DESKTOP_EXE_GUIDE_EN.md) for details.
2. Provides a higher-quality subtitle acquisition program (subtitle_gen.exe), which can run independently or be invoked via English Intensive Listening.exe to extract video subtitles and load them automatically.
3. Supports loading historical subtitles without repeated import after restarting the application.
4. Allows switching between Chinese and English interfaces.

# How to use (RECOMMEND)
Click this domain that I created by Vercel: 
https://an-english-learning-app-letting-you.vercel.app/

Please note that this access method currently only supports non-Mainland China networks. If you are using such a network, you need to prepare a stable VPN in advance. This app will also update the access method for Mainland China networks in subsequent updates.

A detailed video tutorial has been published: https://www.bilibili.com/video/BV1MDvYBcE4q/?share_source=copy_web&vd_source=8440a348859d4cdcf8c1b27ac0e2b822

# What do you need (IMPORTANT)

1. `API_KEY`: Let app to call gemini for analyzing words/sentences. If you don't have the api key, please follow: https://ai.google.dev/gemini-api/docs/api-key?hl=zh-cn or https://bailian.console.aliyun.com/?spm=5176.29597918.J_SEsSjsNv72yRuRFS2VknO.2.343e7b08KSr9vb&tab=api#/api. Set the `API_KEY` in [.env.local](.env.local).
2. `Video file (.mp4)`: You need to download the video that you're interested in to your computer. There is a free website to download YouTube videos by uploading url: https://en.loader.to/1/vimeo-downloader.html
3. `Subtitle file (.srt)`: A transcript file is required for this app. Usually, there is no subtitles for the downloaded .mp4 file in the last step. There are two ways to get subtitles:
	(1) A free website https://downsub.com/ that gets native subtitles from video platforms (e.g., YouTube). This method requires logging in via an external network. It is completely free of charge, yet the subtitles often feature illogical sentence breaks that impair the user experience.
	(2) (RECOMMEND) A program developed by myself that obtains subtitles through an AI speech model features reasonable subtitle sentence segmentation and precise time window alignment. Configuration of the API key for Alibaba Bailian is required. https://github.com/Chrisqyf/AI-Audio-Video-Subtitle-Generator

# Updates

## V1.0

1. Optimize the single-sentence playback experience by extending the playback duration of each sentence by 0.1 seconds to ensure the complete pronunciation of every sentence.
2. Add variable speed playback function.

2026.01.24: 

1. Fix the bugs of the autoplay function
2. Support favoriting and exporting sentence analysis results


2026.07.29: 

1. Sentence Merging Function Update: Shortcut keys are supported for merging and undoing. The merge button on subtitle cards will no longer affect subtitle display.

