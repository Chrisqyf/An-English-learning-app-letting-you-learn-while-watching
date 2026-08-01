const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "英语精听 (English Intensive Listening)",
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allow loading local file:// URLs for video playback
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler: Select local video file path
ipcMain.handle('select-video-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择视频/音频文件',
    filters: [
      { name: 'Media Files', extensions: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'mp3', 'wav', 'm4a'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC Handler: Run subtitle_gen.exe to extract audio & generate SRT
ipcMain.handle('generate-subtitles', async (event, options) => {
  const { videoPath, apiKey, lang = 'en', mode = 'auto' } = options;

  if (!videoPath || !fs.existsSync(videoPath)) {
    return { success: false, error: '未找到指定媒体文件路径' };
  }

  // Locate subtitle_gen.exe
  const possiblePaths = [
    path.join(process.cwd(), 'subtitle_gen.exe'),
    path.join(process.cwd(), 'dist', 'subtitle_gen.exe'),
    path.join(app.getAppPath(), '..', 'subtitle_gen.exe'),
    path.join(app.getAppPath(), 'subtitle_gen.exe')
  ];

  let exePath = possiblePaths.find(p => fs.existsSync(p));

  if (!exePath) {
    return { 
      success: false, 
      error: '在本地未找到 subtitle_gen.exe，请确保 subtitle_gen.exe 放置在应用同级目录下。' 
    };
  }

  const outputSrtPath = path.join(app.getPath('temp'), `sub_${Date.now()}.srt`);

  const args = [
    videoPath,
    '--lang', lang,
    '-o', outputSrtPath
  ];

  if (mode === 'realtime') args.push('--realtime');
  if (mode === 'offline') args.push('--offline');

  const env = { ...process.env };
  if (apiKey) {
    env.DASHSCOPE_API_KEY = apiKey;
  }

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';

    const child = spawn(exePath, args, { env });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdoutData += text;
      // Send progress logs to renderer
      if (mainWindow) {
        mainWindow.webContents.send('subtitle-progress', text);
      }
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('error', (err) => {
      resolve({ success: false, error: `启动 subtitle_gen.exe 失败: ${err.message}` });
    });

    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputSrtPath)) {
        try {
          const srtContent = fs.readFileSync(outputSrtPath, 'utf-8');
          // Clean up temp file
          fs.unlinkSync(outputSrtPath);
          resolve({ success: true, srtContent });
        } catch (e) {
          resolve({ success: false, error: `读取生成的 SRT 文件失败: ${e.message}` });
        }
      } else {
        const errorMsg = stderrData || stdoutData || `进程异常退出，退出码 ${code}`;
        resolve({ success: false, error: `字幕生成失败: ${errorMsg}` });
      }
    });
  });
});
