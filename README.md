<div align="center">
<img width="2560" height="1270" alt="GHBanner" src="https://github.com/Chrisqyf/An-English-learning-app-letting-you-learn-while-watching/blob/main/interface.png" />
</div>

This is a free English Learning Player for Chinese Learner. Any potential fees incurred will only come from the AI API key invoked by yourself. Normally, you can use the free quota provided by the AI model vendor.
Language learning features for other different languages may be added in future updates.

## How to use (RECOMMEND)
Click this domain that I created by Vercel: 
https://an-english-learning-app-letting-you.vercel.app/

Please note that this access method currently only supports non-Mainland China networks. If you are using such a network, you need to prepare a stable VPN in advance. This app will also update the access method for Mainland China networks in subsequent updates.

A detailed video tutorial has been published: https://www.bilibili.com/video/BV1MDvYBcE4q/?share_source=copy_web&vd_source=8440a348859d4cdcf8c1b27ac0e2b822

## What do you need (IMPORTANT)

1. `API_KEY`: Let app to call gemini for analyzing words/sentences. If you don't have the api key, please follow: https://ai.google.dev/gemini-api/docs/api-key?hl=zh-cn or https://bailian.console.aliyun.com/?spm=5176.29597918.J_SEsSjsNv72yRuRFS2VknO.2.343e7b08KSr9vb&tab=api#/api. Set the `API_KEY` in [.env.local](.env.local).
2. `Video file (.mp4)`: You need to download the video that you're interested in to your computer. There is a free website to download YouTube videos by uploading url: https://en.loader.to/1/vimeo-downloader.html
3. `Subtitle file (.srt)`: A transcript file is required for this app. Usually, there is no subtitles for the downloaded .mp4 file in the last step. A clean, subtitle-free video may be more beneficial for listening practice. There is also a free website that I've used to downloaded video subtitles: https://downsub.com/

# Updates
2026.01.02: 

1. Optimize the single-sentence playback experience by extending the playback duration of each sentence by 0.1 seconds to ensure the complete pronunciation of every sentence.
2. Add variable speed playback function.
