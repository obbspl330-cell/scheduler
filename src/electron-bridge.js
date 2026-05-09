// Electron ブリッジ：フレームレス窓のタイトルバー + 保存/読込ダイアログ
// preload.js が contextBridge で expose した window.electronAPI を利用
(function () {
  'use strict';

  const api = (typeof window !== 'undefined' && window.electronAPI) || null;
  if (!api) {
    console.warn('[electron-bridge] window.electronAPI が未定義です。ブラウザ単体で起動していないか確認してください。');
    return;
  }

  // ===== fs ベースの localStorage 永続化（Chromium の file:// localStorage 不具合を回避） =====
  // 起動時: userData/v5-store.json から全キーを読み込み localStorage に書き戻す（コンポーネント読込より前）
  // 変更時: localStorage.setItem/removeItem/clear をフックし、500ms デバウンスで JSON に全スナップショット保存
  try {
    const raw = api.storeLoadSync && api.storeLoadSync();
    if (raw) {
      const snapshot = JSON.parse(raw);
      if (snapshot && typeof snapshot === 'object') {
        Object.keys(snapshot).forEach(k => {
          const v = snapshot[k];
          if (typeof v === 'string') {
            try { localStorage.setItem(k, v); } catch (e) { /* quota or parse err */ }
          }
        });
        console.log('[electron-bridge] 永続データを復元しました:', Object.keys(snapshot).length, 'keys');
      }
    }
  } catch (e) {
    console.warn('[electron-bridge] 永続データ復元に失敗:', e);
  }

  // localStorage.* のフック
  const dumpLocalStorage = () => {
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k == null) continue;
      dump[k] = localStorage.getItem(k);
    }
    return JSON.stringify(dump);
  };
  let saveTimer = null;
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try { api.storeSave && api.storeSave(dumpLocalStorage()); }
      catch (e) { console.warn('[electron-bridge] 永続保存に失敗:', e); }
    }, 500);
  };
  const wrapStorageMethod = (name) => {
    const orig = Storage.prototype[name];
    Storage.prototype[name] = function () {
      const r = orig.apply(this, arguments);
      if (this === localStorage) scheduleSave();
      return r;
    };
  };
  wrapStorageMethod('setItem');
  wrapStorageMethod('removeItem');
  wrapStorageMethod('clear');
  // アプリ終了時に同期保存で確実に flush (invoke 版は完了前に窓が閉じうる)
  window.addEventListener('beforeunload', () => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    try {
      if (api.storeSaveSync) api.storeSaveSync(dumpLocalStorage());
      else api.storeSave && api.storeSave(dumpLocalStorage());
    } catch (e) { /* best effort */ }
  });

  // ===== タイトルバーの操作ボタン =====
  function wireTitlebar() {
    const btnMin = document.getElementById('btn-min');
    const btnMax = document.getElementById('btn-max');
    const btnClose = document.getElementById('btn-close');
    if (btnMin) btnMin.addEventListener('click', () => api.winMinimize());
    if (btnMax) btnMax.addEventListener('click', () => api.winMaximize());
    if (btnClose) btnClose.addEventListener('click', () => api.winClose());
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireTitlebar);
  } else {
    wireTitlebar();
  }

  // ===== v5 の Blob ダウンロード / <input type="file"> を Electron ダイアログに差し替え =====
  // v5DataManageBody は内部で以下を使う：
  //   - a.click() による JSON ダウンロード
  //   - <input type="file"> の change イベント
  // これらを親切にネイティブダイアログへ差し替える。

  // 1) ダウンロード：a 要素の click を乗っ取る
  //    href が blob: で download 属性が .json のときのみ Electron の saveFile へ振り替え
  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function patchedClick() {
    try {
      const href = this.getAttribute('href') || '';
      const dl = this.getAttribute('download') || '';
      if (href.startsWith('blob:') && /\.json$/i.test(dl)) {
        // blob の中身を読み取ってネイティブ保存ダイアログへ
        fetch(href)
          .then(res => res.text())
          .then(content => api.saveFile({ defaultName: dl, content }))
          .then(result => {
            if (result && result.ok) {
              console.log('[electron-bridge] 保存しました:', result.filePath);
            } else if (result && result.error) {
              alert('保存に失敗しました: ' + result.error);
            }
          })
          .catch(err => {
            console.error('[electron-bridge] 保存エラー:', err);
            // 失敗時は従来の download 挙動にフォールバック
            origAnchorClick.call(this);
          });
        return; // 元の click は呼ばない
      }
    } catch (e) {
      console.warn('[electron-bridge] anchor click フック失敗、元の挙動へフォールバック:', e);
    }
    return origAnchorClick.apply(this, arguments);
  };

  // 2) インポート：<input type="file" accept="...json"> のクリックを乗っ取る
  //    一度だけ発火する change イベントをシミュレートして既存ハンドラに渡す
  const origInputClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function patchedInputClick() {
    try {
      if (this.type === 'file') {
        const accept = (this.accept || '').toLowerCase();
        if (accept.includes('json') || accept.includes('.json')) {
          const target = this;
          api.openFile().then(result => {
            if (!result || !result.ok) return;
            // File-like オブジェクトを作って reader.onload で拾えるようにする
            const fakeFile = new File([result.content || ''], 'imported.json', { type: 'application/json' });
            try {
              const dt = new DataTransfer();
              dt.items.add(fakeFile);
              Object.defineProperty(target, 'files', {
                configurable: true,
                get: () => dt.files,
              });
            } catch (e) {
              // DataTransfer が使えない環境のフォールバック
              Object.defineProperty(target, 'files', {
                configurable: true,
                get: () => [fakeFile],
              });
            }
            // change イベントを発火
            const evt = new Event('change', { bubbles: true });
            target.dispatchEvent(evt);
          }).catch(err => {
            console.error('[electron-bridge] 読込エラー:', err);
            alert('読込に失敗しました: ' + (err?.message || err));
          });
          return; // 元の click は呼ばない（OS のファイル選択ダイアログを開かせない）
        }
      }
    } catch (e) {
      console.warn('[electron-bridge] input click フック失敗、元の挙動へフォールバック:', e);
    }
    return origInputClick.apply(this, arguments);
  };

  // ===== メニュー経由のエクスポート/インポート要求（将来の拡張用） =====
  if (typeof api.onMenuExport === 'function') {
    api.onMenuExport(() => {
      window.dispatchEvent(new CustomEvent('electron-menu-export'));
    });
  }
  if (typeof api.onMenuImport === 'function') {
    api.onMenuImport(() => {
      window.dispatchEvent(new CustomEvent('electron-menu-import'));
    });
  }
})();
