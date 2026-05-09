const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (args) => ipcRenderer.invoke('save-file', args),
  openFile: ()     => ipcRenderer.invoke('open-file'),
  onMenuExport: (cb) => ipcRenderer.on('menu-export', cb),
  onMenuImport: (cb) => ipcRenderer.on('menu-import', cb),
  winMinimize: () => ipcRenderer.invoke('win-minimize'),
  winMaximize: () => ipcRenderer.invoke('win-maximize'),
  winClose: () => ipcRenderer.invoke('win-close'),
  storeLoadSync: () => ipcRenderer.sendSync('store-load-sync'),
  storeSave: (data) => ipcRenderer.invoke('store-save', data),
  storeSaveSync: (data) => ipcRenderer.sendSync('store-save-sync', data),
});
