# 英语精听应用 (English Intensive Listening) - 桌面 EXE 使用与打包说明

## 🛠️ 关于此前 `.exe` 报错的原因与解决方案

在打包运行 Electron 应用时，如果遇到以下错误：
> `ReferenceError: require is not defined in ES module scope`

**错误原因：**
项目的 `package.json` 中配置了 `"type": "module"`（即默认使用 ES Module / import 语法），而 Electron 的主进程代码 (`main.js` / `preload.js`) 使用了 Node.js CommonJS 的 `require` 与 `__dirname`。Node 在解析 `.js` 文件时将其作为 ES Module 处理，导致 `require` 未定义。

**完美解决办法：**
将 Electron 主进程及预加载脚本的文件后缀改为 `.cjs`（明确告知 Node 该文件使用 CommonJS 规范）：
- 将 `electron/main.js` 重命名为 `electron/main.cjs`
- 将 `electron/preload.js` 重命名为 `electron/preload.cjs`
- 更新 `package.json` 中的 `"main": "electron/main.cjs"`

---

## 📦 打包产物说明与各个 `.exe` 使用指南

当您执行 `npm run electron:build` 成功打包后，会在 `dist/` 目录下生成以下可执行文件：

| 文件 / 路径 | 文件类型 | 使用说明与推荐场景 |
| :--- | :--- | :--- |
| **`English Intensive Listening Setup 1.0.0.exe`** | 🚀 **安装程序 (NSIS Installer)** | **【最推荐】** 双击运行会启动安装向导，自动安装到系统中，并在桌面和开始菜单生成快捷方式。方便日常长期使用。 |
| **`English Intensive Listening 1.0.0.exe`** | 💼 **绿色便携版 (Portable)** | **免安装单文件**。双击即可直接运行应用，不写入系统注册表，非常适合放到 U 盘或随身携带。 |
| **`win-unpacked/English Intensive Listening.exe`** | 📂 **未打包/免安装目录版** | **解压后的程序目录**。直接进入 `win-unpacked/` 文件夹双击 `English Intensive Listening.exe` 即可运行。 |

---

## ⚡ 配合 `subtitle_gen.exe`（字幕提取工具）使用说明

如果您拥有一键 AI 字幕生成工具 `subtitle_gen.exe`，可以通过以下方式放置：

1. **对于安装版 (`Setup.exe`)**：
   - 安装完成后，将 `subtitle_gen.exe` 复制到应用的安装根目录下（即 `English Intensive Listening.exe` 所在的目录）。

2. **对于便携版 (`English Intensive Listening 1.0.0.exe`)**：
   - 将 `subtitle_gen.exe` 与便携版 `.exe` 放在同一个文件夹下。

3. **对于 `win-unpacked` 解压版**：
   - 直接将 `subtitle_gen.exe` 放入 `dist/win-unpacked/` 文件夹内部。

放置完成后，启动应用，在弹窗中选择视频并填写 API Key，点击 **“⚡ 本地 EXE 一键调用字幕生成”**，程序即可自动调用后台进程提取音频、识别字幕并载入到精听播放器中！

---

## 🛠️ 打包常用命令

```bash
# 1. 安装依赖 (初次配置时执行)
npm install electron electron-builder --save-dev

# 2. 开发环境调试运行
npm run electron:dev

# 3. 构建打包生成 EXE 产物
npm run electron:build
```
