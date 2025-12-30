<div align="center">
<img width="2560" height="1270" alt="GHBanner" src="https://github.com/Chrisqyf/An-English-learning-app-letting-you-learn-while-watching/blob/main/interface.png" />
</div>

This is a free English Learning Player for Chinese Learner. Any potential fees incurred will only come from the AI API key invoked by yourself. Normally, you can use the free quota provided by the AI model vendor.
Language learning features for other different languages may be added in future updates.

## How to use (RECOMMEND)
Click this domain that I created by Vercel: 
https://an-english-learning-app-letting-you.vercel.app/

A detailed video tutorial will be provided later.

## What do you need (IMPORTANT)

1. `API_KEY`: Let app to call gemini for analyzing words/sentences. If you don't have the api key, please follow: https://ai.google.dev/gemini-api/docs/api-key?hl=zh-cn or https://bailian.console.aliyun.com/?spm=5176.29597918.J_SEsSjsNv72yRuRFS2VknO.2.343e7b08KSr9vb&tab=api#/api. Set the `API_KEY` in [.env.local](.env.local).
2. `Video file (.mp4)`: You need to download the video that you're interested in to your computer. There is a free website to download YouTube videos by uploading url: https://en.loader.to/1/vimeo-downloader.html
3. `Subtitle file (.srt)`: A transcript file is required for this app. Usually, there is no subtitles for the downloaded .mp4 file in the last step. A clean, subtitle-free video may be more beneficial for listening practice. There is also a free website that I've used to downloaded video subtitles: https://downsub.com/

# Run and deploy your AI Studio app (System generated)

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1EVn_ghEyHsoAUOdmNk2dk6SVDkkG_sYE

## Run Locally (System generated)

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
