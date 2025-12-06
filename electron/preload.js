const { contextBridge, shell } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  version: process.versions.electron,
  platform: process.platform,
  shell: {
    openExternal: (url) => shell.openExternal(url)
  }
});
