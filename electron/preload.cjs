const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  generateSubtitles: (options) => ipcRenderer.invoke('generate-subtitles', options),
  onProgress: (callback) => {
    const listener = (event, text) => callback(text);
    ipcRenderer.on('subtitle-progress', listener);
    return () => ipcRenderer.removeListener('subtitle-progress', listener);
  }
});
