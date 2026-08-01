# 英语精听应用 - 桌面 EXE 打包与 `subtitle_gen.exe` 联动指南

本应用原生支持 **Web 网页部署模式** 与 **桌面本地 EXE 模式**：

---

## 🌟 双模式架构说明

### 1. Web 网页模式 (当前预览 / 云端部署)
- 保持干净轻量，不引入复杂的后端/本地可执行文件依赖。
- 支持手动导入 SRT 字幕、粘贴字幕文本、加载历史字幕包以及自定义视频播放。

### 2. 桌面 EXE 模式 (本地运行 / 一键离线字幕生成)
- 借助内置的 Electron 壳 (`electron/main.js` & `electron/preload.js`)。
- 当用户在弹窗中选取本地视频并点击“⚡ 一键调用 `subtitle_gen.exe`”时，Electron 主进程会在后台通过 `child_process.spawn` 自动调用同目录下的 `subtitle_gen.exe`。
- 提取音频、识别字幕并自动对齐后，实时通过 IPC 管道推送到精听 UI 并将生成的 `.srt` 字幕自动装载进精听应用！

---

## 🚀 桌面 EXE 版本打包与运行流程

### 第一步：在本地安装 Electron 依赖

在本机的项目根目录下运行命令：

```bash
npm install electron electron-builder --save-dev
```

### 第二步：开发环境联调测试

在开发状态下测试桌面 EXE：

```bash
npm run electron:dev
```

这将启动 Vite 前端服务并同时打开 Electron 桌面应用窗口。

### 第三步：打包生成桌面 `.exe`

运行构建命令生成 Windows 桌面应用：

```bash
npm run electron:build
```

构建完成后，产物将保存在 `dist_electron/` 或 `dist/` 目录下。

---

## 🔗 放置 `subtitle_gen.exe`

将之前打好的单文件 `subtitle_gen.exe` 放置在打包后的应用根目录或主程序 `.exe` 同级目录下：

```text
你的应用文件夹/
│
├── 英语精听.exe              (打包出的 Electron 桌面主程序)
├── subtitle_gen.exe         (生成的独立字幕提取 EXE 工具)
└── resources/
```

在精听 EXE 中选择视频并配置 API Key 后，点击 **“⚡ 本地 EXE 一键调用字幕生成 (Call subtitle_gen.exe)”** 即可体验全自动识别与对齐字幕装载！
