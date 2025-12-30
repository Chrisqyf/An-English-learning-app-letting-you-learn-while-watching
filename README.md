<div align="center">
<img width="2560" height="1270" alt="GHBanner" src="https://github.com/Chrisqyf/An-English-learning-app-letting-you-learn-while-watching/blob/main/interface.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1EVn_ghEyHsoAUOdmNk2dk6SVDkkG_sYE

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## What do you need (IMPORTANT)

1. `GEMINI_API_KEY`: Let app to call gemini for analyzing words/sentences. If you don't have the api key, please follow: https://ai.google.dev/gemini-api/docs/api-key?hl=zh-cn. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
2. Video file (.mp4): You need to download the video that you're interested in to your computer. There is a free website to download YouTube videos by uploading url: https://en.loader.to/1/vimeo-downloader.html
3. Subtitle file (.srt): A transcript file is required for this app. Usually, there is no subtitles for the downloaded .mp4 file in the last step. A clean, subtitle-free video may be more beneficial for listening practice. There is also a free website that I've used to downloaded video subtitles: https://downsub.com/
