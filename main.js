const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.setAppUserModelId('com.scheduler.app');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'scheduler',
    icon: path.join(__dirname, 'assets', 'icon_app.ico'),
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#f5f6f8',
    show: false,
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  win.on('page-title-updated', (e) => { e.preventDefault(); });

  win.once('ready-to-show', () => {
    win.show();
  });

  // Menu を消すと F12/Ctrl+Shift+I の標準ショートカットも無効になるので、
  // before-input-event で DevTools を開くキーを再登録
  win.webContents.on('before-input-event', (event, input) => {
    const isF12 = input.type === 'keyDown' && input.key === 'F12';
    const isCtrlShiftI = input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i';
    if (isF12 || isCtrlShiftI) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  Menu.setApplicationMenu(null);
}

ipcMain.handle('win-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.handle('win-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) { win.isMaximized() ? win.unmaximize() : win.maximize(); }
});
ipcMain.handle('win-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('save-file', async (event, { defaultName, content }) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'データをエクスポート',
    defaultPath: defaultName,
    filters: [{ name: 'JSONファイル', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false };
  try { fs.writeFileSync(filePath, content, 'utf8'); return { ok: true, filePath }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('open-file', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'データをインポート',
    filters: [{ name: 'JSONファイル', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { ok: false };
  try { const content = fs.readFileSync(filePaths[0], 'utf8'); return { ok: true, content }; }
  catch (e) { return { ok: false, error: e.message }; }
});

// ===== v5 ストア永続化: userData/v5-store.json へ直接書き出す =====
// （Chromium の file:// localStorage が環境依存で永続化に失敗するケースに備えた堅牢なバックアップ）
function storeFilePath() { return path.join(app.getPath('userData'), 'v5-store.json'); }
ipcMain.on('store-load-sync', (event) => {
  try {
    const p = storeFilePath();
    event.returnValue = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  } catch (e) {
    event.returnValue = null;
  }
});
function writeStoreAtomic(data) {
  const p = storeFilePath();
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, data, 'utf8');
  fs.renameSync(tmp, p);
  return p;
}
ipcMain.handle('store-save', async (_event, data) => {
  try { return { ok: true, path: writeStoreAtomic(data) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
// 同期版: アプリ終了直前に確実に flush するため (beforeunload では invoke の完了を待てない)
ipcMain.on('store-save-sync', (event, data) => {
  try { writeStoreAtomic(data); event.returnValue = true; }
  catch (e) { event.returnValue = false; }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
