# English Intensive Listening App - Desktop EXE Packaging & `subtitle_gen.exe` Integration Guide

[English](DESKTOP_EXE_GUIDE_EN.md) | [中文](DESKTOP_EXE_GUIDE.md)

This app natively supports both the **Web deployment mode** and the **desktop local EXE mode**:

---

## 🌟 Desktop Build Artifacts & `.exe` Usage

After a successful local build with `npm run electron:build`, several `.exe` executables are generated in the `dist/` directory:

1. **`English Intensive Listening Setup 1.0.0.exe` (Installer - Recommended)**
   - **What it is**: A standard Windows installer.
   - **How to use**: Double-click to launch the setup wizard. You can choose your own installation path (e.g., drive D or E) and shortcuts. Ideal for long-term use on a personal computer. This file has already been uploaded to the project's Releases, so no local environment setup or packaging is required.

2. **`English Intensive Listening 1.0.0.exe` (Portable)**
   - **What it is**: A portable, no-install single-file version.
   - **How to use**: Double-click to run directly, no installation needed. Convenient for storing on a USB drive or external hard drive and using it anywhere.

3. **`win-unpacked/English Intensive Listening.exe` (Unpacked)**
   - **What it is**: The directory of the already-unpacked binary files.
   - **How to use**: Double-click to run directly from inside the `win-unpacked` folder. Convenient for development/debugging or testing local services in the same directory.

---

## 🛠️ Common Packaging Commands

```bash
# 1. Install dependencies (run during initial setup)
npm install electron electron-builder --save-dev

# 2. Run for development/debugging
npm run electron:dev

# 3. Build and package the EXE artifacts
npm run electron:build
```

---

## 🔗 Placing the `subtitle_gen.exe` Companion Tool

Place the offline subtitle extraction tool `subtitle_gen.exe` in the same directory as the main program (e.g., the `win-unpacked/` folder or the installation root):

```text
App root/
├── English Intensive Listening.exe   (Desktop intensive-listening main program)
├── subtitle_gen.exe                 (Subtitle generation tool)
└── resources/
```

After selecting a local video and entering your API Key in the app, click **"⚡ One-Click Subtitle Generation via Local EXE"**, and the app will automatically invoke `subtitle_gen.exe` to generate subtitles and load them directly!
