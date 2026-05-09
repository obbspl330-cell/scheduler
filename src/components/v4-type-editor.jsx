// V4 案件タイプ編集画面

// ModalShell を持たない純粋なボディ。V5SettingsModal 内へ埋め込み利用する。
function V4TypeEditorBody({ t, store }) {
  const [selectedId, setSelectedId] = React.useState(Object.keys(store.types)[0]);
  const [newTypeName, setNewTypeName] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [newProcName, setNewProcName] = React.useState('');
  const [showNewProc, setShowNewProc] = React.useState(false);
  const [, _bump] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => _bump();
    window.addEventListener('colorsettings-change', h);
    return () => window.removeEventListener('colorsettings-change', h);
  }, []);

  const ty = store.types[selectedId];

  const togglePr = (key) => {
    const list = ty.typicalProcesses.includes(key)
      ? ty.typicalProcesses.filter(x => x !== key)
      : [...ty.typicalProcesses, key];
    store.saveType(selectedId, { typicalProcesses: list });
  };

  const reorderProcs = (next) => store.saveType(selectedId, { typicalProcesses: next });

  const addNewType = () => {
    if (!newTypeName) return;
    const id = 'type_' + Date.now();
    // 新規タイプの hue は既存タイプと重複しないよう均等に振る
    const presetHues = [22, 292, 189, 256, 150, 35, 0, 330];
    const used = new Set(Object.values(store.types).map(t => typeof t.hue === 'number' ? t.hue : null).filter(v => v != null));
    const hue = presetHues.find(h => !used.has(h)) ?? Math.floor(Math.random() * 360);
    store.addType(id, {
      id, name: newTypeName, hue,
      typicalProcesses: [],
    });
    setSelectedId(id);
    setNewTypeName('');
    setShowNew(false);
  };

  return (
    <div>
      {/* 全体レイアウト: 中央タイプリスト (SUBTLE bg) + 右編集 (枠なし)。
          親 V5SettingsModal の sidebar と合わせて視覚的に 3 カラムに見える設計。 */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 18, minHeight: 380 }}>
        {/* 中央: タイプリスト（背景塗りでカラム区切り、選択時のみ淡くカード化） */}
        <div style={{
          background: t.SUBTLE, borderRadius: 10, padding: 12,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ fontSize: 11, color: t.MUTED, padding: '0 4px 8px', lineHeight: 1.5 }}>
            案件タイプを選ぶと、紐づく工程セットが新規案件作成時に自動で入ります。
          </div>
          {Object.values(store.types).map(tp => {
            const active = tp.id === selectedId;
            const tc = (window.typeColor ? window.typeColor(tp) : (tp.color || '#999'));
            return (
              <button key={tp.id} onClick={() => setSelectedId(tp.id)} style={{
                padding: '9px 10px', borderRadius: 7,
                border: 'none',
                background: active ? t.CARD : 'transparent',
                color: t.TEXT,
                fontSize: 12, fontWeight: active ? 600 : 500, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
                textAlign: 'left',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = `${t.CARD}99`; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tc, flexShrink: 0 }} />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tp.name}</span>
                <span style={{ fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>{tp.typicalProcesses.length}</span>
              </button>
            );
          })}
          {showNew ? (
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                placeholder="タイプ名" autoFocus
                onKeyDown={e => e.key === 'Enter' && addNewType()}
                style={{ ...inputStyle(t), padding: '6px 8px', fontSize: 11 }} />
              <button onClick={addNewType} style={{ ...buttonStyle(t, 'primary'), padding: '6px 10px', fontSize: 11 }}>＋</button>
            </div>
          ) : (
            <button onClick={() => setShowNew(true)} style={{
              padding: '8px 10px', border: `1px dashed ${t.BORDER}`, background: 'transparent',
              color: t.MUTED, fontSize: 11, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
            }}>＋ 新しいタイプ</button>
          )}
        </div>

        {/* 右: 編集（外枠は廃しフィールド単位の余白で整理） */}
        {ty && (
          <div>
            <Field t={t} label="タイプ名">
              <input value={ty.name} onChange={e => store.saveType(selectedId, { name: e.target.value })} style={inputStyle(t)} />
            </Field>

            <Field t={t} label="工程セット（ドラッグで並べ替え）" hint={`${ty.typicalProcesses.length}工程`}>
              {/* 二重囲い廃止: 外枠なし、各行は背景塗りのみ */}
              <div style={{ minHeight: 60, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <V4DnDList items={ty.typicalProcesses} onReorder={reorderProcs} keyFn={(k) => k}
                  renderItem={(key, i) => {
                    const col = processColor(key, 'solid', t.dark ? 'dark' : 'light');
                    return (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                        background: t.SUBTLE, border: 'none', borderRadius: 6,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                        <div style={{ fontSize: 10, fontWeight: 700, color: col, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', width: 16 }}>{i + 1}</div>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
                        <div style={{ flex: 1, fontSize: 12, color: t.TEXT }}>{PROCESS_COLORS[key].name}</div>
                        <button onClick={() => togglePr(key)} style={{
                          width: 22, height: 22, border: 'none', background: 'transparent',
                          color: t.MUTED, cursor: 'pointer', borderRadius: 4,
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    );
                  }} />
              </div>
            </Field>

            <Field t={t} label="追加できる工程">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {Object.keys(PROCESS_COLORS).filter(k => !ty.typicalProcesses.includes(k)).map(k => {
                  const col = processColor(k, 'solid', t.dark ? 'dark' : 'light');
                  return (
                    <button key={k} onClick={() => togglePr(k)} style={{
                      padding: '4px 10px', borderRadius: 14, border: 'none',
                      background: t.SUBTLE, color: t.MUTED, fontSize: 11, cursor: 'pointer',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: col }} />
                      ＋ {PROCESS_COLORS[k].name}
                    </button>
                  );
                })}
                {showNewProc ? (
                  <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <input autoFocus value={newProcName} onChange={e => setNewProcName(e.target.value)}
                      placeholder="工程名 (例: ラフ)"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const key = window.v5AddCustomProcess && window.v5AddCustomProcess(newProcName);
                          if (key) togglePr(key);
                          setNewProcName(''); setShowNewProc(false);
                        } else if (e.key === 'Escape') {
                          setNewProcName(''); setShowNewProc(false);
                        }
                      }}
                      style={{ ...inputStyle(t), padding: '3px 10px', fontSize: 11, width: 130, borderRadius: 14 }} />
                    <button onClick={() => {
                      const key = window.v5AddCustomProcess && window.v5AddCustomProcess(newProcName);
                      if (key) togglePr(key);
                      setNewProcName(''); setShowNewProc(false);
                    }} style={{
                      width: 22, height: 22, border: 'none', background: t.ACCENT, color: 'white',
                      borderRadius: '50%', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit',
                    }}>✓</button>
                    <button onClick={() => { setNewProcName(''); setShowNewProc(false); }} title="キャンセル" style={{
                      width: 22, height: 22, border: `1px solid ${t.BORDER}`, background: 'transparent',
                      color: t.MUTED, borderRadius: '50%', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewProc(true)} style={{
                    padding: '4px 10px', borderRadius: 14, border: `1px dashed ${t.ACCENT}66`,
                    background: `${t.ACCENT}08`, color: t.ACCENT, fontSize: 11, cursor: 'pointer',
                    fontFamily: 'inherit', fontWeight: 600,
                  }}>＋ 新しい工程を作成</button>
                )}
              </div>
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

function V4TypeEditor({ t, store, onClose }) {
  return (
    <ModalShell t={t} title="案件タイプ設定" onClose={onClose} width={720}>
      <V4TypeEditorBody t={t} store={store} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={buttonStyle(t, 'primary')}>完了</button>
      </div>
    </ModalShell>
  );
}

window.V4TypeEditor = V4TypeEditor;
window.V4TypeEditorBody = V4TypeEditorBody;
