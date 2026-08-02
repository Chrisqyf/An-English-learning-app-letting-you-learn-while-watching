# 英语精听应用 - 桌面 EXE 打包与 `subtitle_gen.exe` 联动指南

本应用原生支持 **Web 网页部署模式** 与 **桌面本地 EXE 模式**：

---

## 🌟 桌面打包产物与 `.exe` 使用说明

在本地执行 `npm run electron:build` 成功构建后，在 `dist/` 目录下会生成不同类型的 `.exe` 可执行文件：

1. **`English Intensive Listening Setup 1.0.0.exe`（安装包 - 推荐）**
   - **作用**：标准的 Windows 安装程序。
   - **用法**：双击启动安装向导，支持用户自主选择安装路径（如 D 盘、E 盘）与快捷方式，适合个人电脑长期使用。在项目的Release中已经上传该文件，无需在本地配置环境，打包程序。

2. **`English Intensive Listening 1.0.0.exe`（便携版）**
   - **作用**：绿色免安装单文件版。
   - **用法**：双击直接运行，无需安装，方便保存在 U 盘或移动硬盘中随插随用。

3. **`win-unpacked/English Intensive Listening.exe`（解压运行版）**
   - **作用**：已解压好的二进制文件目录。
   - **用法**：在 `win-unpacked` 文件夹内部直接双击运行，方便开发调试或测试同目录下的本地服务。

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

---

## 🔗 放置 `subtitle_gen.exe` 联动工具

将离线字幕提取工具 `subtitle_gen.exe` 放置在与主程序相同的目录下（如 `win-unpacked/` 目录或安装根目录）：

```text
应用根目录/
├── English Intensive Listening.exe   (精听桌面主程序)
├── subtitle_gen.exe                 (字幕生成工具)
└── resources/
```

在应用中选取本地视频并输入 API Key 后，点击 **“⚡ 本地 EXE 一键调用字幕生成”**，系统将自动调用 `subtitle_gen.exe` 生成字幕并直接加载！
