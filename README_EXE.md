# 英语精听应用 (English Intensive Listening) - 桌面 EXE 使用与打包说明

## 🛠️ 关于常见问题与解决方案

### 1. 打开 `.exe` 报错：`require is not defined in ES module scope`

**错误原因：**
项目的 `package.json` 中配置了 `"type": "module"`，而 Electron 主进程代码 (`main.js` / `preload.js`) 使用了 Node.js CommonJS 的 `require` 与 `__dirname`。

**解决办法：**
将 Electron 主进程及预加载脚本文件后缀改为 `.cjs`：
- `electron/main.js` 转换为 `electron/main.cjs`
- `electron/preload.js` 转换为 `electron/preload.cjs`
- `package.json` 中的 `"main"` 修改为 `"electron/main.cjs"`

---

### 2. 打开 `.exe` 后只有深蓝色背景、页面一片空白（没有任何内容）

**原因分析：**
Vite 默认构建时资源引用路径是绝对路径（如 `/assets/index-xxx.js`）。在桌面打包打包运行后，Electron border 使用 `file://` 协议加载 `index.html`，导致浏览器从磁盘根目录 `file:///assets/` 加载 JS/CSS 静态资源，找不到文件（404 错误），从而使 React 页面无法加载，只显示 Electron 窗口的背景色（深蓝色 `#0f172a`）。

**解决办法：**
在 `vite.config.ts` 中添加配置 `base: './'`：
```typescript
export default defineConfig(({ mode }) => {
  return {
    base: './', // 确保 Electron file:// 协议下以相对路径加载静态资源
    // ...其他配置
  };
});
```
修改后重新执行 `npm run electron:build`，打包出来的 `.exe` 即可正常渲染页面！

---

### 3. 自定义选择安装路径（非默认一键安装到 C 盘）

**配置方式：**
在 `package.json` 的 `build.nsis` 中新增以下配置：
```json
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true,
  "shortcutName": "英语精听"
}
```
配置完成后重新执行 `npm run electron:build`，生成的 `Setup.exe` 将会弹出标准的安装向导界面，允许用户选择安装盘符（如 D 盘、E 盘）与安装目录！

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
