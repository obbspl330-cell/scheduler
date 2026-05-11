// V5 Patches - 既存v4コンポーネントを上書きして追加機能を実装
// 1. サブラベル編集DnD  2. タイムライン案件DnD  3. 日セルメモ
// 4. ポモセット欄修正   5. 工程行追加/削除      6. カードWクリック  7. 締切表示

// ============ 0. 共通アニメーションスタイル (transitions.dev) を 1 度だけ注入 ============
(function injectV5AnimStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('v5-anim-styles')) return;
  const s = document.createElement('style');
  s.id = 'v5-anim-styles';
  s.textContent = `
@keyframes v5-number-pop {
  from { opacity: 0; transform: translateY(6px); filter: blur(4px); }
  60%  { opacity: 1; filter: blur(0); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@keyframes v5-text-swap {
  from { opacity: 0; filter: blur(3px); }
  to   { opacity: 1; filter: blur(0); }
}
@keyframes v5-icon-swap {
  from { opacity: 0; transform: scale(0.6); filter: blur(2px); }
  to   { opacity: 1; transform: scale(1); filter: blur(0); }
}
@keyframes v5-badge-pop {
  0%   { opacity: 0; transform: translate(-4px, 4px) scale(0.7); }
  60%  { opacity: 1; transform: translate(0, 0) scale(1.08); }
  100% { opacity: 1; transform: translate(0, 0) scale(1); }
}
@keyframes v5-page-enter {
  from { opacity: 0; }
  to   { opacity: 1; }
}
/* View Transitions (kanban DnD 等): デフォルトの 250ms linear をやや滑らかに */
::view-transition-group(*) {
  animation-duration: 0.32s;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
`;
  document.head.appendChild(s);
})();

// 値が変わるたびにポップインするスパン
function NumberPop({ value, style, className }) {
  const [animKey, setAnimKey] = React.useState(0);
  const prev = React.useRef(value);
  React.useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setAnimKey(k => k + 1);
    }
  }, [value]);
  return (
    <span key={animKey} className={className} style={{
      display: 'inline-block',
      animation: 'v5-number-pop 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
      ...style,
    }}>{value}</span>
  );
}
window.NumberPop = NumberPop;

// triggerKey が変わるとぼかし→クリアでスワップする汎用ラッパー（テキスト・アイコン共用）
function TextSwap({ triggerKey, children, style, className, anim = 'text' }) {
  const animName = anim === 'icon' ? 'v5-icon-swap' : 'v5-text-swap';
  return (
    <span key={triggerKey} className={className} style={{
      display: 'inline-block',
      animation: `${animName} 0.28s cubic-bezier(0.16, 1, 0.3, 1) both`,
      ...style,
    }}>{children}</span>
  );
}
window.TextSwap = TextSwap;

// ============ 1. サブラベル編集を DnD 対応に上書き ============
const _origSubLabel = window.V3SubLabelEditor;
window.V3SubLabelEditor = function V3SubLabelEditorV5({ t, processKey, onClose }) {
  const initial = (JSON.parse(localStorage.getItem('subLabels') || '{}')[processKey])
    || DEFAULT_SUBLABELS[processKey] || [];
  const [labels, setLabels] = React.useState(initial);
  const [newLabel, setNewLabel] = React.useState('');

  const save = () => {
    const cur = JSON.parse(localStorage.getItem('subLabels') || '{}');
    cur[processKey] = labels;
    localStorage.setItem('subLabels', JSON.stringify(cur));
    onClose();
  };

  const proc = PROCESS_COLORS[processKey];
  const col = processColor(processKey, 'solid', t.dark ? 'dark' : 'light');
  const suggestions = ['ラフ決定', '色調整', 'パーツ追加', '描き込み', 'チェック', '修正反映'];

  return (
    <ModalShell t={t} title={`${proc.name} · サブラベル編集`} onClose={onClose} width={480}>
      <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 12 }}>
        各日に表示される作業内容。ドラッグで順序変更できます。
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, color: t.ACCENT }}>
        <V4DnDList items={labels} onReorder={setLabels} keyFn={(l, i) => i + l}
          renderItem={(l, i) => (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: t.SUBTLE, borderRadius: 6, border: `1px solid ${t.BORDER}`,
              marginBottom: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
              <div style={{
                width: 22, height: 22, borderRadius: 4, background: `${col}20`,
                color: col, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
              }}>{i + 1}</div>
              <input value={l} onChange={e => {
                const next = [...labels]; next[i] = e.target.value; setLabels(next);
              }} style={{
                flex: 1, border: 'none', background: 'transparent', fontSize: 12,
                color: t.TEXT, fontFamily: 'inherit', outline: 'none',
              }} />
              <button onClick={() => setLabels(labels.filter((_, j) => j !== i))} style={{
                width: 22, height: 22, border: 'none', background: 'transparent',
                color: t.MUTED, cursor: 'pointer', borderRadius: 4,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
          placeholder="新しいサブラベル"
          onKeyDown={e => { if (e.key === 'Enter' && newLabel) { setLabels([...labels, newLabel]); setNewLabel(''); } }}
          style={{ ...inputStyle(t), flex: 1 }} />
        <button onClick={() => { if (newLabel) { setLabels([...labels, newLabel]); setNewLabel(''); } }}
          style={buttonStyle(t, 'ghost')}>追加</button>
      </div>
      <div style={{ marginTop: 16, padding: 12, background: `${t.ACCENT}10`,
        border: `1px dashed ${t.ACCENT}44`, borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.ACCENT} strokeWidth="2">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 600, color: t.ACCENT }}>学習サジェスト</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => setLabels([...labels, s])} style={{
              padding: '3px 8px', fontSize: 10, border: `1px solid ${t.BORDER}`,
              background: t.CARD, color: t.TEXT, borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>＋ {s}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button onClick={onClose} style={buttonStyle(t, 'ghost')}>キャンセル</button>
        <button onClick={save} style={buttonStyle(t, 'primary')}>保存</button>
      </div>
    </ModalShell>
  );
};

// ============ 4. ポモドーロセットアップ: プリセット + 編集モーダル ============
const POMO_DEFAULT_PRESETS = [
  { id: 'p_quick', name: 'クイック',     workMin: 15, breakMin: 3, longBreakMin: 10, sets: 3 },
  { id: 'p_std',   name: 'スタンダード', workMin: 25, breakMin: 5, longBreakMin: 15, sets: 4 },
];
const POMO_MAX_PRESETS = 3;
const POMO_FUTURA_FF = '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif';

function loadPomoPresets() {
  try {
    const raw = localStorage.getItem('v5.pomoPresets');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch (e) {}
  return POMO_DEFAULT_PRESETS.map(p => ({ ...p }));
}
function savePomoPresetsLs(arr) {
  try { localStorage.setItem('v5.pomoPresets', JSON.stringify(arr)); } catch (e) {}
}
function loadPomoPresetIdLs() {
  try { return localStorage.getItem('v5.pomoPresetId') || null; } catch (e) { return null; }
}
function savePomoPresetIdLs(id) {
  try { if (id) localStorage.setItem('v5.pomoPresetId', id); } catch (e) {}
}
function pomoClamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function V5PomoPresetEditor({ t, preset, canDelete, onSave, onDelete, onClose }) {
  const [name, setName] = React.useState(preset.name);
  const [workMin, setWorkMin] = React.useState(preset.workMin);
  const [breakMin, setBreakMin] = React.useState(preset.breakMin);
  const [longBreakMin, setLongBreakMin] = React.useState(preset.longBreakMin);
  const [sets, setSets] = React.useState(preset.sets);

  const save = () => {
    onSave({
      name: (name || '').trim() || preset.name,
      workMin: pomoClamp(parseInt(workMin, 10) || 25, 1, 180),
      breakMin: pomoClamp(parseInt(breakMin, 10) || 5, 1, 60),
      longBreakMin: pomoClamp(parseInt(longBreakMin, 10) || 15, 1, 120),
      sets: pomoClamp(parseInt(sets, 10) || 4, 1, 8),
    });
  };

  const inSty = {
    width: '100%', padding: '8px 10px', border: `1px solid ${t.BORDER}`,
    borderRadius: 6, background: t.CARD, color: t.TEXT,
    fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box',
  };
  const lblSty = { fontSize: 10, color: t.MUTED, marginBottom: 4, fontWeight: 500 };

  return ReactDOM.createPortal(
    <div onMouseDown={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onMouseDown={e => e.stopPropagation()} style={{
        width: 320, padding: '18px 20px',
        background: t.CARD, border: `1px solid ${t.BORDER}`,
        borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
        boxSizing: 'border-box',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT, marginBottom: 14 }}>プリセット編集</div>
        <div style={{ marginBottom: 12 }}>
          <div style={lblSty}>名前</div>
          <input value={name} onChange={e => setName(e.target.value)} style={inSty} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={lblSty}>作業(分)</div>
            <input type="number" value={workMin} onChange={e => setWorkMin(e.target.value)} style={inSty} />
          </div>
          <div>
            <div style={lblSty}>休憩(分)</div>
            <input type="number" value={breakMin} onChange={e => setBreakMin(e.target.value)} style={inSty} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <div style={lblSty}>長休憩(分)</div>
            <input type="number" value={longBreakMin} onChange={e => setLongBreakMin(e.target.value)} style={inSty} />
          </div>
          <div>
            <div style={lblSty}>セット数</div>
            <input type="number" value={sets} onChange={e => setSets(e.target.value)} style={inSty} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {canDelete ? (
            <button onClick={onDelete} style={{
              padding: '7px 16px', border: `1px solid ${t.BORDER}`,
              background: t.CARD, color: t.MUTED, borderRadius: 6, cursor: 'pointer',
              fontSize: 11, fontFamily: 'inherit',
            }}>削除</button>
          ) : <div />}
          <button onClick={save} style={{
            padding: '8px 22px', border: 'none', background: t.ACCENT,
            color: '#fff', borderRadius: 6, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
          }}>完了</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const _origPomo = window.V4PomoSetup;
window.V4PomoSetup = function V4PomoSetupV5({ t, store, onStart, onClose }) {
  const [presets, setPresets] = React.useState(loadPomoPresets);
  const [presetId, setPresetId] = React.useState(() => {
    const arr = loadPomoPresets();
    const id = loadPomoPresetIdLs();
    return (id && arr.find(p => p.id === id)) ? id : arr[0].id;
  });
  const currentPreset = presets.find(p => p.id === presetId) || presets[0];
  const [s, setS] = React.useState({
    workMin: currentPreset.workMin,
    breakMin: currentPreset.breakMin,
    longBreakMin: currentPreset.longBreakMin,
    sets: currentPreset.sets,
    autoLog: store.pomoSettings.autoLog ?? true,
  });

  const [editingId, setEditingId] = React.useState(null);

  // タイムラインで今日色付けされている最初の作業を初期選択
  const todayTask = React.useMemo(() => {
    const DATA_START = new Date(2026, 3, 15);
    const TODAY_DAY_IDX = Math.round((TODAY - DATA_START) / 86400000);
    for (const p of store.projects) {
      for (const pr of p.processes) {
        if (pr.days && pr.days.includes(TODAY_DAY_IDX)) return { projectId: p.id, procType: pr.type };
      }
    }
    return null;
  }, []);
  const [projectId, setProjectId] = React.useState(todayTask?.projectId || store.projects[0]?.id);
  const [procType, setProcType] = React.useState(todayTask?.procType || store.projects[0]?.processes[0]?.type || 'color');
  const project = store.projects.find(p => p.id === projectId);
  const availProcs = project?.processes || [];

  const updatePresets = (next) => {
    setPresets(next);
    savePomoPresetsLs(next);
  };
  const selectPreset = (id) => {
    const p = presets.find(x => x.id === id);
    if (!p) return;
    setPresetId(id);
    savePomoPresetIdLs(id);
    setS(prev => ({ ...prev, workMin: p.workMin, breakMin: p.breakMin, longBreakMin: p.longBreakMin, sets: p.sets }));
  };
  const addPreset = () => {
    if (presets.length >= POMO_MAX_PRESETS) return;
    const id = 'p_' + Date.now().toString(36);
    const np = { id, name: `プリセット${presets.length + 1}`, workMin: 25, breakMin: 5, longBreakMin: 15, sets: 4 };
    const next = [...presets, np];
    updatePresets(next);
    setPresetId(id);
    savePomoPresetIdLs(id);
    setS(prev => ({ ...prev, workMin: np.workMin, breakMin: np.breakMin, longBreakMin: np.longBreakMin, sets: np.sets }));
    setEditingId(id);
  };
  const savePresetEdit = (patch) => {
    const next = presets.map(p => p.id === editingId ? { ...p, ...patch } : p);
    updatePresets(next);
    if (presetId === editingId) {
      setS(prev => ({ ...prev, workMin: patch.workMin, breakMin: patch.breakMin, longBreakMin: patch.longBreakMin, sets: patch.sets }));
    }
    setEditingId(null);
  };
  const deletePreset = (id) => {
    if (presets.length <= 1) return;
    const next = presets.filter(p => p.id !== id);
    updatePresets(next);
    if (presetId === id) {
      const np = next[0];
      setPresetId(np.id);
      savePomoPresetIdLs(np.id);
      setS(prev => ({ ...prev, workMin: np.workMin, breakMin: np.breakMin, longBreakMin: np.longBreakMin, sets: np.sets }));
    }
    setEditingId(null);
  };

  const commit = () => {
    store.setPomoSettings(s);
    onStart({ projectId, procType, settings: s });
  };

  const Num = ({ label, value, set, min, max, unit, divider }) => (
    <div style={{ flex: 1, padding: '10px 6px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      borderLeft: divider ? `1px solid ${t.BORDER}` : 'none',
    }}>
      <div style={{ fontSize: 10, color: t.MUTED, fontWeight: 600, letterSpacing: 0.4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => set(Math.max(min, value - 1))} style={{
          width: 24, height: 24, border: `1px solid ${t.BORDER}`, background: t.CARD,
          color: t.TEXT, borderRadius: 5, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', flexShrink: 0,
        }}>−</button>
        <div style={{ minWidth: 44, fontSize: 20, fontWeight: 700, fontFamily: POMO_FUTURA_FF, color: t.TEXT, textAlign: 'center', letterSpacing: -0.5 }}>
          {value}<span style={{ fontSize: 10, color: t.MUTED, fontWeight: 400, marginLeft: 2 }}>{unit}</span>
        </div>
        <button onClick={() => set(Math.min(max, value + 1))} style={{
          width: 24, height: 24, border: `1px solid ${t.BORDER}`, background: t.CARD,
          color: t.TEXT, borderRadius: 5, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', flexShrink: 0,
        }}>+</button>
      </div>
    </div>
  );

  const workTotalMin = s.sets * s.workMin;
  const breakTotalMin = (s.sets - 1) * s.breakMin + s.longBreakMin;
  const totalMin = workTotalMin + breakTotalMin;
  const fmtTotal = (m) => {
    const h = Math.floor(m / 60), r = m % 60;
    if (h > 0) return r === 0 ? `${h}h` : `${h}h${r}m`;
    return `${m}m`;
  };

  return (
    <ModalShell t={t} title="集中モードを開始" onClose={onClose} width={580}>
      {/* プリセット行 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {presets.map(p => {
          const active = p.id === presetId;
          return (
            <div key={p.id} style={{ flex: 1, position: 'relative' }}>
              <button onClick={() => selectPreset(p.id)} style={{
                width: '100%', padding: '12px 8px',
                border: `1.5px solid ${active ? t.ACCENT : t.BORDER}`,
                background: active ? `${t.ACCENT}10` : t.SUBTLE,
                borderRadius: 12, cursor: 'pointer',
                textAlign: 'center', fontFamily: 'inherit',
                transition: 'border-color 0.12s, background 0.12s',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: active ? t.ACCENT : t.TEXT }}>{p.name}</div>
                <div style={{ fontSize: 10, color: t.MUTED, marginTop: 3, fontFamily: POMO_FUTURA_FF, letterSpacing: 0.2 }}>
                  {p.workMin}×{p.sets}
                </div>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setEditingId(p.id); }} title="編集" style={{
                position: 'absolute', top: 5, right: 5, width: 18, height: 18,
                border: 'none', background: 'transparent', color: t.MUTED,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, padding: 0,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          );
        })}
        {presets.length < POMO_MAX_PRESETS && (
          <button onClick={addPreset} style={{
            flex: 1, padding: '12px 8px',
            border: `1.5px dashed ${t.BORDER}`, background: 'transparent',
            borderRadius: 12, cursor: 'pointer', color: t.MUTED, fontSize: 12,
            fontFamily: 'inherit',
          }}>＋ 追加</button>
        )}
      </div>

      {/* 数値入力行（一連の枠で繋ぐ） */}
      <div style={{
        display: 'flex', marginBottom: 10,
        background: t.SUBTLE, borderRadius: 10, overflow: 'hidden',
      }}>
        <Num label="作業" value={s.workMin} set={v => setS({...s, workMin: v})} min={5} max={120} unit="分" />
        <Num label="休憩" value={s.breakMin} set={v => setS({...s, breakMin: v})} min={1} max={30} unit="分" divider />
        <Num label="長休憩" value={s.longBreakMin} set={v => setS({...s, longBreakMin: v})} min={5} max={60} unit="分" divider />
        <Num label="セット数" value={s.sets} set={v => setS({...s, sets: v})} min={1} max={8} unit="回" divider />
      </div>

      {/* プログレスバー（左寄せ・固定幅）+ 合計（右寄せ） */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
        <div style={{
          width: 360, height: 6, borderRadius: 3, background: t.SUBTLE,
          display: 'flex', overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{ flex: workTotalMin, background: t.ACCENT }} />
          <div style={{ flex: breakTotalMin, background: `${t.ACCENT}40` }} />
        </div>
        <div style={{
          display: 'flex', gap: 12, flexShrink: 0,
          fontSize: 10, color: t.MUTED, whiteSpace: 'nowrap',
        }}>
          <span>作業 <span style={{ fontFamily: POMO_FUTURA_FF, color: t.TEXT }}>{workTotalMin}m</span></span>
          <span>休憩 <span style={{ fontFamily: POMO_FUTURA_FF, color: t.TEXT }}>{breakTotalMin}m</span></span>
          <span>合計 <span style={{ color: t.ACCENT, fontWeight: 700, fontFamily: POMO_FUTURA_FF }}>{fmtTotal(totalMin)}</span></span>
        </div>
      </div>

      {/* 取り組む作業 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: t.MUTED, fontWeight: 600, marginBottom: 6, letterSpacing: 0.4 }}>
          取り組む作業
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={projectId} onChange={e => {
            setProjectId(e.target.value);
            const p = store.projects.find(x => x.id === e.target.value);
            if (p?.processes[0]) setProcType(p.processes[0].type);
          }} style={{ ...inputStyle(t), flex: 1 }}>
            {store.projects.map(p => <option key={p.id} value={p.id}>{store.displayName ? store.displayName(p) : p.name}</option>)}
          </select>
          <select value={procType} onChange={e => setProcType(e.target.value)} style={{ ...inputStyle(t), flex: 1 }}>
            {availProcs.map(pr => (
              <option key={pr.id} value={pr.type}>{PROCESS_COLORS[pr.type]?.name || pr.type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 自動記録 */}
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 22, cursor: 'pointer' }}>
        <input type="checkbox" checked={s.autoLog} onChange={e => setS({...s, autoLog: e.target.checked})}
          style={{ width: 15, height: 15, accentColor: t.ACCENT }} />
        <span style={{ fontSize: 12, color: t.TEXT }}>セット完了時に作業ログへ自動記録</span>
      </label>

      {/* スタートボタン */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
        <button onClick={commit} style={{
          padding: '14px 42px', border: 'none', background: t.ACCENT,
          color: '#fff', borderRadius: 28, cursor: 'pointer',
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit', letterSpacing: 0.3,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: `0 4px 14px ${t.ACCENT}40`,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 3 20 12 6 21 6 3"/>
          </svg>
          スタート
        </button>
      </div>

      {/* プリセット編集モーダル */}
      {editingId && (() => {
        const p = presets.find(x => x.id === editingId);
        if (!p) return null;
        return (
          <V5PomoPresetEditor
            t={t}
            preset={p}
            canDelete={presets.length > 1}
            onSave={savePresetEdit}
            onDelete={() => deletePreset(editingId)}
            onClose={() => setEditingId(null)}
          />
        );
      })()}
    </ModalShell>
  );
};

// ============ 7. 締切メモを案件列に表示 + 2 + 5: DnD行 & 新規工程追加 ============
// cellMemo用: localStorage key "cellMemos" = { [projectId]: { [procId]: { [dayIdx]: memo } } }
function loadCellMemos() {
  try { return JSON.parse(localStorage.getItem('cellMemos') || '{}'); } catch (e) { return {}; }
}
function saveCellMemos(m) { localStorage.setItem('cellMemos', JSON.stringify(m)); }

// V3SidebarRow を上書き: 高さ整合 + 案件DnDハンドル + 工程行DnD + 案件編集/削除
// - 案件ヘッダ行は timeline 側の V4ProjectRow (44px) と厳密に一致させる
// - 案件操作（編集/削除）はヘッダの鉛筆/ゴミ箱に集約
// - 工程行のペン/ゴミ箱は削除（編集モーダルから触る）
// - 「＋工程を追加」は削除（編集モーダルから追加）
window.V3SidebarRow = function V3SidebarRowV5({ t, project, expanded, onToggle, onEditSub, store, projectIdx, onReorderProject, onReorderProc, onEditProject, onDeleteProject, onDragHandlePointerDown, isDragging }) {
  const type = store?.types?.[project.typeId] || PROJECT_TYPES[project.typeId];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState({ top: 0, left: 0 });
  const menuRef = React.useRef(null);
  const btnRef = React.useRef(null);
  React.useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    const onScrollOrResize = () => setMenuOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [menuOpen]);
  const openMenu = (e) => {
    e.stopPropagation();
    if (!menuOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const MENU_W = 160;
      setMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - MENU_W) });
    }
    setMenuOpen(o => !o);
  };

  const isDone = (project.boardStatus || computedBoardStatus(project)) === 'done';
  const markDone = () => {
    if (store?.setBoardStatus) store.setBoardStatus(project.id, 'done');
    else if (store?.updateProject) store.updateProject(project.id, { boardStatus: 'done' });
    setMenuOpen(false);
  };
  const revertDone = () => {
    // 進行中に戻す: boardStatus をクリアして computedBoardStatus (pct ベース) に委譲
    if (store?.setBoardStatus) store.setBoardStatus(project.id, null);
    else if (store?.updateProject) store.updateProject(project.id, { boardStatus: null });
    setMenuOpen(false);
  };
  const doDelete = () => {
    setMenuOpen(false);
    const dn = store?.displayName ? store.displayName(project) : project.name;
    if (confirm(`「${dn}」を削除しますか？（取り消せません）`)) {
      onDeleteProject && onDeleteProject(project.id);
    }
  };

  // ドラッグ状態は親 (V4Timeline) で一元管理。isDragging は props 経由
  // HTML5 DnD は廃止し、pointer events で自前実装（ブラウザのカーソル fluctuation 回避）
  const isOnHold = project.boardStatus === 'onhold';
  return (
    <div data-project={project.id} style={{ opacity: isOnHold ? 0.45 : 1 }}>
      <div onClick={onToggle}
        style={{
          height: 44, padding: '0 6px',
          display: 'flex', alignItems: 'center', gap: 5,
          borderBottom: `1px solid ${t.BORDER}`, cursor: 'pointer',
          boxSizing: 'border-box',
          // 自分をドラッグ中は半透明
          opacity: isDragging ? 0.4 : 1,
          transition: 'opacity 0.15s, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
        <div title="ドラッグで並べ替え"
          onPointerDown={(e) => {
            // 親 (V4Timeline) のハンドラに委譲（pointer events で完全自前実装）
            if (onDragHandlePointerDown) onDragHandlePointerDown(project.id, e);
          }}
          onClick={e => e.stopPropagation()}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            color: t.MUTED, padding: 2, flexShrink: 0,
            touchAction: 'none', // pointer cancel を防止
          }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2.5" style={{
          transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0,
        }}><path d="m9 18 6-6-6-6"/></svg>
        <div style={{
          width: 4, height: 28, borderRadius: 2, flexShrink: 0,
          // カードビューと揃えて案件タイプの色を使う（旧: 最上位工程の色）
          background: type ? typeColor(type) : t.ACCENT,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 500, color: t.TEXT,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.25,
          }}>{store?.displayName ? store.displayName(project) : project.name}</div>
          <div style={{ fontSize: 9.5, color: t.MUTED, marginTop: 2, display: 'flex', gap: 5, alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1 }}>
            {/* 表示形式は「タイプ chip + 末尾締切」で固定（旧: type/status/deadline の切替設定は廃止） */}
            {type && (() => {
              const tc = typeColor(type);
              return (
                <span style={{
                  padding: '1px 4px', borderRadius: 3, background: `${tc}20`,
                  color: tc, fontSize: 9, fontWeight: 600, flexShrink: 0,
                }}>{type.name}</span>
              );
            })()}
            {project.deadline ? (() => {
              const today = TODAY;
              const dlDate = project.deadline instanceof Date ? project.deadline : new Date(project.deadline);
              const dl = Math.round((dlDate - today) / 86400000);
              const isDone = (project.boardStatus || computedBoardStatus(project)) === 'done';
              const urgent = !isDone && dl >= 0 && dl <= 7;
              const overdue = !isDone && dl < 0;
              const col = overdue ? (t.dark ? '#f87171' : '#dc2626') : urgent ? (t.dark ? '#fbbf24' : '#d97706') : t.MUTED;
              return (
                <span style={{
                  color: col, fontWeight: urgent || overdue ? 600 : 500,
                  fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', fontSize: 9.5,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }} title={project.client ? `締切 ${dlDate.getMonth()+1}/${dlDate.getDate()} · ${project.client}` : `締切 ${dlDate.getMonth()+1}/${dlDate.getDate()}`}>
                  {dlDate.getMonth()+1}/{dlDate.getDate()}
                </span>
              );
            })() : project.client ? (
              <span style={{
                color: t.MUTED, fontWeight: 500, fontSize: 9.5,
                overflow: 'hidden', textOverflow: 'ellipsis',
              }} title={`締切メモ: ${project.client}`}>{project.client}</span>
            ) : null}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onEditProject && onEditProject(project); }} title="案件を編集（名前/工程/メモ）" style={{
          width: 22, height: 22, border: 'none', background: 'transparent',
          color: t.MUTED, cursor: 'pointer', borderRadius: 3, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button ref={btnRef} onClick={openMenu} title={isDone ? '進行中に戻す / 削除' : '完了 / 削除'} style={{
            width: 22, height: 22, border: 'none', background: menuOpen ? t.SUBTLE : 'transparent',
            color: t.MUTED, cursor: 'pointer', borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
          {menuOpen && (
            <div ref={menuRef} onClick={e => e.stopPropagation()} style={{
              position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 1000,
              minWidth: 160, padding: 4, background: t.CARD,
              border: `1px solid ${t.BORDER}`, borderRadius: 6,
              boxShadow: t.dark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              {isDone ? (
                <button onClick={revertDone} style={{
                  padding: '6px 10px', fontSize: 11, border: 'none',
                  background: 'transparent', color: t.dark ? '#60a5fa' : '#2563eb',
                  cursor: 'pointer', fontFamily: 'inherit', borderRadius: 4,
                  display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left',
                }} onMouseEnter={e => e.currentTarget.style.background = t.SUBTLE}
                   onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
                  進行中に戻す
                </button>
              ) : (
                <button onClick={markDone} style={{
                  padding: '6px 10px', fontSize: 11, border: 'none',
                  background: 'transparent', color: t.dark ? '#5ee1a9' : '#059669',
                  cursor: 'pointer', fontFamily: 'inherit', borderRadius: 4,
                  display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left',
                }} onMouseEnter={e => e.currentTarget.style.background = t.SUBTLE}
                   onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                  完了にする
                </button>
              )}
              <button onClick={doDelete} style={{
                padding: '6px 10px', fontSize: 11, border: 'none',
                background: 'transparent', color: t.dark ? '#f87171' : '#dc2626',
                cursor: 'pointer', fontFamily: 'inherit', borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left',
              }} onMouseEnter={e => e.currentTarget.style.background = t.SUBTLE}
                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                削除
              </button>
            </div>
          )}
        </div>
      </div>
      {expanded && project.processes.map((pr, prIdx) => (
        <div key={pr.id} data-proc={pr.id}
          draggable onDragStart={(e) => { e.dataTransfer.setData('procIdx', prIdx); e.dataTransfer.setData('procProject', project.id); e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); }}
          onDragOver={(e) => { if (e.dataTransfer.types.includes('procidx')) { e.preventDefault(); e.currentTarget.style.borderTop = `2px solid ${t.ACCENT}`; } }}
          onDragLeave={(e) => { e.currentTarget.style.borderTop = ''; }}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderTop = ''; const from = parseInt(e.dataTransfer.getData('procIdx')); const fromProj = e.dataTransfer.getData('procProject'); if (!isNaN(from) && fromProj === project.id && from !== prIdx) onReorderProc(project.id, from, prIdx); }}
          style={{
          height: 32, padding: '0 8px 0 20px',
          display: 'flex', alignItems: 'center', gap: 6,
          borderBottom: `1px solid ${t.BORDER}`,
          background: t.dark ? 'rgba(255,255,255,0.02)' : t.SUBTLE + '55',
          cursor: 'grab', boxSizing: 'border-box',
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
          <div style={{
            width: 8, height: 8, borderRadius: 2,
            background: processColor(pr.type, 'solid', t.dark ? 'dark' : 'light'),
          }} />
          <div style={{ fontSize: 11, color: t.TEXT, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{PROCESS_COLORS[pr.type].name}</div>
          <div style={{
            fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', minWidth: 48, textAlign: 'right',
          }}>{pr.actualH.toFixed(1)}/{pr.plannedH}h</div>
        </div>
      ))}
    </div>
  );
};

window.loadCellMemos = loadCellMemos;
window.saveCellMemos = saveCellMemos;

// ============ 3. 日セルメモ: V4ProcessRow を上書き（セル単位の描画 / 移動 / リサイズ / 非連続対応） ============
// 単一モーダル方針: module-level store で "今開いているメモエディタ" を管理。
// 別セルをクリックすると自動で前のモーダルが閉じる。
// 配置: cell の getBoundingClientRect を anchor として position:fixed で描画。cellEl を毎 render 参照してスクロールに追従。
const v5MemoEditor = (function() {
  let state = null; // { projectId, prId, dayIdx, anchor: { left, top, bottom, width, cellEl } }
  const listeners = new Set();
  return {
    getSnapshot: () => state,
    open(next) { state = next; listeners.forEach(fn => fn()); },
    close() { state = null; listeners.forEach(fn => fn()); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();
// 他画面遷移 / モーダルオープン時に呼んで閉じる用
window.v5MemoEditor = v5MemoEditor;

const _origProcRow = window.V4ProcessRow;
window.V4ProcessRow = function V4ProcessRowV5({ t, project, pr, store, days, todayIdx, shiftIdx, dayW }) {
  const [memos, setMemos] = React.useState(() => {
    const m = loadCellMemos();
    return m[project.id]?.[pr.id] || {};
  });
  const editorState = React.useSyncExternalStore(v5MemoEditor.subscribe, v5MemoEditor.getSnapshot, v5MemoEditor.getSnapshot);
  const editing = (editorState && editorState.projectId === project.id && editorState.prId === pr.id)
    ? editorState.dayIdx : null;
  const editorAnchor = editing !== null ? editorState.anchor : null;
  // 親スクロールコンテナのスクロールに追従して再計算するための tick
  // anchor.cellEl が生きている間、scroll イベントで rerender してポップオーバーを cell に追従させる
  const [scrollTick, setScrollTick] = React.useState(0);
  React.useEffect(() => {
    if (editing === null || !editorAnchor?.cellEl) return;
    const handler = () => setScrollTick(v => v + 1);
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [editing, editorAnchor?.cellEl]);
  // 表示用 rect: cellEl が生きていれば最新 getBoundingClientRect、無ければ初期 anchor を使う
  const liveAnchor = (() => {
    if (!editorAnchor) return null;
    if (editorAnchor.cellEl && editorAnchor.cellEl.isConnected) {
      const r = editorAnchor.cellEl.getBoundingClientRect();
      return { left: r.left, top: r.top, bottom: r.bottom, width: r.width };
    }
    return editorAnchor;
  })();
  // ポップオーバー外クリックで閉じる（cell の click は stopPropagation 済みなので document には届かない）
  const popoverRef = React.useRef(null);
  React.useEffect(() => {
    if (editing === null) return;
    const onDocClick = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      v5MemoEditor.close();
    };
    // 開いたクリックの bubble が捕まらないよう次フレームで attach
    const id = requestAnimationFrame(() => document.addEventListener('click', onDocClick));
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('click', onDocClick);
    };
  }, [editing]);
  const setEditing = (dayIdx, anchor) => {
    if (dayIdx === null || dayIdx === undefined) {
      v5MemoEditor.close();
    } else {
      v5MemoEditor.open({ projectId: project.id, prId: pr.id, dayIdx, anchor });
    }
  };
  const [drag, setDrag] = React.useState(null);
  const [hoverEmpty, setHoverEmpty] = React.useState(null);

  const updateMemo = (dayIdx, text) => {
    const next = { ...memos };
    if (text) next[dayIdx] = text;
    else delete next[dayIdx];
    setMemos(next);
    const all = loadCellMemos();
    if (!all[project.id]) all[project.id] = {};
    all[project.id][pr.id] = next;
    saveCellMemos(all);
  };

  const sortedDays = [...pr.days].sort((a, b) => a - b);
  const daySet = new Set(sortedDays);
  const first = sortedDays[0];
  const last = sortedDays[sortedDays.length - 1];

  const col = processColor(pr.type, 'solid', t.dark ? 'dark' : 'light');
  const fill = processColor(pr.type, 'fill', t.dark ? 'dark' : 'light');
  const border = processColor(pr.type, 'border', t.dark ? 'dark' : 'light');

  const applyDays = (nextDays) => {
    store.setProjects(ps => ps.map(p => p.id !== project.id ? p : ({
      ...p, processes: p.processes.map(x => x.id !== pr.id ? x : ({ ...x, days: nextDays })),
    })));
  };

  const addDay = (dIdx) => {
    if (daySet.has(dIdx)) return;
    store.pushUndo && store.pushUndo('timelineAddDay');
    applyDays([...sortedDays, dIdx].sort((a, b) => a - b));
  };

  const removeDay = (dIdx) => {
    if (!daySet.has(dIdx) || sortedDays.length <= 1) return;
    store.pushUndo && store.pushUndo('timelineRemoveDay');
    applyDays(sortedDays.filter(d => d !== dIdx));
  };

  const onCellMouseDown = (mode, dIdx) => (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    const startX = ev.clientX;
    // クリックしたセル (move モードのみ意味がある) の viewport 矩形を保持してメモエディタの anchor に使う
    const cellEl = mode === 'move' ? ev.currentTarget : null;
    const cellRect = cellEl ? cellEl.getBoundingClientRect() : null;
    const orig = [...sortedDays];
    const origMemos = { ...memos };
    // 連続日付の「ラン（塊）」を事前計算。move/resize ともに対象となるランを 1 つに絞る
    const origRuns = (() => {
      if (orig.length === 0) return [];
      const out = [];
      let rs = orig[0], re = orig[0];
      for (let i = 1; i < orig.length; i++) {
        if (orig[i] === re + 1) re = orig[i];
        else { out.push([rs, re]); rs = re = orig[i]; }
      }
      out.push([rs, re]);
      return out;
    })();
    // dIdx を含むランの index（move 時はそのランを単位にスライド）
    const targetRunIdx = origRuns.findIndex(([rs, re]) => dIdx >= rs && dIdx <= re);
    let moved = false;
    let lastDx = 0;
    // ステップアキュムレーター: 最後にマス変化した時のマウス基準位置。
    // ここから ±dayW を超えた分を新たな dx として加算する。
    // → 進める／戻すどちらの方向でも「1 セル分のマウス移動 = 1 マス変化」が保証され、
    //    Math.round の「最初の 1 マスだけ半閾値」や Math.trunc の「広い dx=0 域でジャンプ」を回避できる。
    let stepReferenceX = startX;
    let lastShift = 0; // 実際にランが動いた量（クランプ後）。memo 永続化に使う
    let pushedUndo = false;
    const ensureUndoPushed = () => {
      if (pushedUndo) return;
      // 実際の変更が入る直前に 1 回だけスナップショット
      store.pushUndo && store.pushUndo(mode === 'move' ? 'moveProcess' : 'resizeProcess');
      pushedUndo = true;
    };
    const onMove = (e) => {
      if (Math.abs(e.clientX - startX) > 3) moved = true;
      // 最後の基準位置からの移動量で stepCount を算出。abs >= dayW のときだけ dx を更新。
      const since = e.clientX - stepReferenceX;
      const stepCount = Math.trunc(since / dayW);
      if (stepCount === 0) return;
      const dx = lastDx + stepCount;
      stepReferenceX += stepCount * dayW;
      lastDx = dx;
      ensureUndoPushed();
      // dx === 0 は「元の状態に戻った」ケース。早期 return せず apply 側のロジックで
      // origRuns 通りの days と orig のメモを再適用する（戻り操作で元の長さに戻れない不具合の修正）。
      if (mode === 'move') {
        // 対象のラン 1 つだけをシフト。隣接ランで挟まれている場合は手前/直後の境界でクランプ
        if (targetRunIdx < 0) return;
        const [trs, tre] = origRuns[targetRunIdx];
        const len = tre - trs;
        let newRs = trs + dx;
        if (targetRunIdx > 0) newRs = Math.max(newRs, origRuns[targetRunIdx - 1][1] + 1);
        if (targetRunIdx < origRuns.length - 1) newRs = Math.min(newRs, origRuns[targetRunIdx + 1][0] - 1 - len);
        const newRe = newRs + len;
        const actualShift = newRs - trs;
        lastShift = actualShift;
        const nextRuns = origRuns.map((r, i) => i === targetRunIdx ? [newRs, newRe] : r);
        const next = [];
        for (const [a, b] of nextRuns) { for (let d = a; d <= b; d++) next.push(d); }
        applyDays(next);
        // メモは対象ラン分だけシフト
        const targetSet = new Set();
        for (let d = trs; d <= tre; d++) targetSet.add(d);
        const shifted = {};
        Object.entries(origMemos).forEach(([k, v]) => {
          const ki = Number(k);
          if (targetSet.has(ki)) shifted[ki + actualShift] = v;
          else shifted[ki] = v;
        });
        setMemos(shifted);
      } else if (mode === 'left' || mode === 'right') {
        // dIdx を含むランのみを伸縮（隣接ランとはぶつかる手前でクランプ）
        const idx = origRuns.findIndex(([rs, re]) => mode === 'left' ? rs === dIdx : re === dIdx);
        if (idx < 0) return;
        const [rs, re] = origRuns[idx];
        let newRs = rs, newRe = re;
        if (mode === 'left') {
          newRs = rs + dx;
          if (idx > 0) newRs = Math.max(newRs, origRuns[idx - 1][1] + 1);
          if (newRs > re) newRs = re;
        } else {
          newRe = re + dx;
          if (idx < origRuns.length - 1) newRe = Math.min(newRe, origRuns[idx + 1][0] - 1);
          if (newRe < rs) newRe = rs;
        }
        const nextRuns = origRuns.map((r, i) => i === idx ? [newRs, newRe] : r);
        const next = [];
        for (const [a, b] of nextRuns) { for (let d = a; d <= b; d++) next.push(d); }
        applyDays(next);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDrag(null);
      if (!moved && mode === 'move') {
        const anchor = cellRect ? {
          left: cellRect.left,
          top: cellRect.top,
          bottom: cellRect.bottom,
          width: cellRect.width,
          cellEl, // スクロール時に最新位置を再計算するため
        } : null;
        setEditing(dIdx, anchor);
      }
      if (moved && mode === 'move' && lastShift !== 0 && targetRunIdx >= 0) {
        const [trs, tre] = origRuns[targetRunIdx];
        const targetSet = new Set();
        for (let d = trs; d <= tre; d++) targetSet.add(d);
        const shifted = {};
        Object.entries(origMemos).forEach(([k, v]) => {
          const ki = Number(k);
          if (targetSet.has(ki)) shifted[ki + lastShift] = v;
          else shifted[ki] = v;
        });
        const all = loadCellMemos();
        if (!all[project.id]) all[project.id] = {};
        all[project.id][pr.id] = shifted;
        saveCellMemos(all);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    setDrag({ mode });
  };

  // ラン（連続日付の固まり）の開始セル判定
  const isRunStart = (dIdx) => !daySet.has(dIdx - 1);

  // 工程提出日 (複数可) の dayIdx 集合
  const deadlineIdxs = (pr.deadlines || [])
    .map(d => window.dateToDayIdx(d))
    .filter(i => i !== null && !isNaN(i));
  const deadlineIdxSet = new Set(deadlineIdxs);
  const toggleDeadlineDayIdx = (dIdx) => {
    const target = window.dayIdxToDate(dIdx);
    if (!target) return;
    store.pushUndo && store.pushUndo('procDeadline');
    store.setProjects(ps => ps.map(p => p.id !== project.id ? p : ({
      ...p, processes: p.processes.map(x => {
        if (x.id !== pr.id) return x;
        // store の clone (JSON.parse/stringify) を経由すると Date は ISO string に変わる。
        // ここで Date オブジェクトに正規化してから比較する。
        const cur = (x.deadlines || [])
          .map(d => d instanceof Date ? d : (d ? new Date(d) : null))
          .filter(d => d && !isNaN(d.getTime()));
        const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
        const has = cur.some(d => sameDay(d, target));
        const next = has
          ? cur.filter(d => !sameDay(d, target))
          : [...cur, target].sort((a, b) => a - b);
        return { ...x, deadlines: next };
      }),
    })));
  };

  // 案件締切カラムのハイライト（案件行と揃えるため、工程行にも同じ列を薄く色付け。文字無し）
  const projDlDate = project.deadline
    ? (project.deadline instanceof Date ? project.deadline : new Date(project.deadline))
    : null;
  const projDlIdx = projDlDate && !isNaN(projDlDate.getTime()) && days.length > 0
    ? Math.round((projDlDate - days[0]) / 86400000)
    : -1;
  const showProjDl = projDlIdx >= 0 && projDlIdx < days.length;
  const projDlColor = t.dark ? '#f87171' : '#dc2626';

  return (
    <div style={{
      height: 32, position: 'relative', borderBottom: `1px solid ${t.BORDER}`,
      background: t.dark ? 'rgba(255,255,255,0.02)' : t.SUBTLE + '55',
    }}>
      <V3GridBg t={t} days={days} dayW={dayW} />
      <V3TodayLine todayIdx={todayIdx} dayW={dayW} ACCENT={t.ACCENT} />
      {/* 案件締切カラム（文字無し色付けのみ。案件行と縦に揃えて視覚的につなげる） */}
      {showProjDl && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: projDlIdx * dayW, width: dayW,
          background: `${projDlColor}10`,
          pointerEvents: 'none', zIndex: 0,
        }} />
      )}
      {/* 空きセル: クリックでポップオーバーを開く（作業日 / 提出日 / メモ） */}
      {days.map((_, absIdx) => {
        const dIdx = absIdx - shiftIdx;
        if (daySet.has(dIdx)) return null;
        const isHover = hoverEmpty === absIdx;
        const isDeadlineHere = deadlineIdxSet.has(dIdx);
        const isEditing = editing === dIdx;
        return (
          <div key={'e' + absIdx}
            onMouseEnter={() => setHoverEmpty(absIdx)}
            onMouseLeave={() => setHoverEmpty(null)}
            onClick={(e) => {
              e.stopPropagation();
              const cellEl = e.currentTarget;
              const rect = cellEl.getBoundingClientRect();
              setEditing(dIdx, {
                left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width,
                cellEl,
              });
            }}
            title={isDeadlineHere ? '提出日 · クリックで設定変更' : 'クリックで作業日 / 提出日を設定'}
            style={{
              position: 'absolute', left: absIdx * dayW, top: 4,
              width: dayW, height: 24, cursor: 'pointer',
              background: isHover && !isDeadlineHere ? `${col}11` : 'transparent',
              border: isHover && !isDeadlineHere ? `1px dashed ${col}55` : '1px dashed transparent',
              borderRadius: 4,
              outline: isEditing ? `2px dashed ${t.ACCENT}` : 'none',
              outlineOffset: isEditing ? 1 : 0,
              opacity: isEditing ? 1 : (isHover && !isDeadlineHere ? 1 : 0),
              transition: 'opacity 0.1s',
              zIndex: isEditing ? 3 : 0,
            }} />
        );
      })}
      {/* 非工程日の提出日マーカー: 工程の色で薄い破線枠 + 「提出」ラベル（クリックは下層の空きセルが受ける） */}
      {deadlineIdxs.filter(i => !daySet.has(i)).map((dIdx) => {
        const absIdx = dIdx + shiftIdx;
        if (absIdx < 0 || absIdx >= days.length) return null;
        return (
          <div key={'dl-nonwork-' + dIdx} style={{
            position: 'absolute', top: 4, height: 24,
            left: absIdx * dayW + 2,
            width: dayW - 4,
            background: 'transparent',
            border: `1.5px dashed ${col}`,
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 2,
          }}>
            <span style={{
              fontSize: 9.5, fontWeight: 700, color: col, letterSpacing: 0.5,
              filter: t.dark ? 'brightness(1.3)' : 'none',
            }}>提出</span>
          </div>
        );
      })}
      {/* 工程セル: 各日を個別にレンダリング */}
      {sortedDays.map((dIdx) => {
        const absIdx = dIdx + shiftIdx;
        if (absIdx < 0 || absIdx >= days.length) return null;
        const isFirst = dIdx === first;
        const isLast = dIdx === last;
        const isLeftEdge = !daySet.has(dIdx - 1);
        const isRightEdge = !daySet.has(dIdx + 1);
        const memo = memos[dIdx];
        const isDeadline = deadlineIdxSet.has(dIdx);
        const isEditing = editing === dIdx;
        const showLabel = isDeadline
          ? '提出'
          : (memo || (isRunStart(dIdx) ? PROCESS_COLORS[pr.type].name : ''));
        return (
          <div key={dIdx}
            onMouseDown={onCellMouseDown('move', dIdx)}
            title={isDeadline ? '提出日 · クリックで編集' : (memo ? memo : 'ドラッグで移動 · クリックでメモ編集')}
            style={{
              position: 'absolute', top: 4, height: 24,
              left: absIdx * dayW + (isLeftEdge ? 2 : 0),
              width: dayW - (isLeftEdge ? 2 : 0) - (isRightEdge ? 2 : 0),
              background: isDeadline ? col : fill,
              borderTop: `1px solid ${isDeadline ? col : border + '66'}`,
              borderBottom: `1px solid ${isDeadline ? col : border + '66'}`,
              borderLeft: isLeftEdge ? `1px solid ${isDeadline ? col : border + '66'}` : 'none',
              borderRight: isRightEdge ? `1px solid ${isDeadline ? col : border + '66'}` : 'none',
              borderTopLeftRadius: isLeftEdge ? 4 : 0,
              borderBottomLeftRadius: isLeftEdge ? 4 : 0,
              borderTopRightRadius: isRightEdge ? 4 : 0,
              borderBottomRightRadius: isRightEdge ? 4 : 0,
              outline: isEditing ? `2px dashed ${t.ACCENT}` : 'none',
              outlineOffset: isEditing ? 1 : 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
              cursor: drag ? 'grabbing' : 'grab',
              overflow: 'hidden', whiteSpace: 'nowrap',
              userSelect: 'none', zIndex: isEditing ? 4 : (isDeadline ? 2 : 1),
            }}>
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis',
              fontSize: isDeadline ? 9.5 : (memo ? 8.5 : 9),
              color: isDeadline ? (t.dark ? t.BG : 'white') : col,
              filter: isDeadline ? 'none' : (t.dark ? 'brightness(1.6)' : 'brightness(0.55)'),
              fontWeight: isDeadline || memo ? 700 : 600,
              letterSpacing: isDeadline ? 0.5 : 0,
            }}>{showLabel}</span>
            {isLeftEdge && (
              <div onMouseDown={onCellMouseDown('left', dIdx)} style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
                cursor: 'ew-resize', zIndex: 3,
              }} />
            )}
            {isRightEdge && (
              <div onMouseDown={onCellMouseDown('right', dIdx)} style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
                cursor: 'ew-resize', zIndex: 3,
              }} />
            )}
          </div>
        );
      })}
      {/* 編集ポップオーバー: position:fixed + Portal で body 直下、cellEl の getBoundingClientRect に毎 render 追従して開いた cell にロック */}
      {editing !== null && liveAnchor && ReactDOM.createPortal((() => {
        const popoverW = 280;
        const popoverH = 220; // 概算
        let left = liveAnchor.left + liveAnchor.width / 2 - popoverW / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - popoverW - 8));
        let top = liveAnchor.bottom + 6;
        if (top + popoverH > window.innerHeight - 8) {
          top = Math.max(8, liveAnchor.top - popoverH - 6);
        }
        const isWorkDay = daySet.has(editing);
        const isDeadlineCell = deadlineIdxSet.has(editing);
        const canRemoveWorkDay = sortedDays.length > 1;
        const toggleWorkDay = () => {
          if (isWorkDay) {
            if (!canRemoveWorkDay) return;
            updateMemo(editing, '');
            removeDay(editing);
          } else {
            addDay(editing);
          }
        };
        const toggleDeadline = () => toggleDeadlineDayIdx(editing);
        const renderToggle = (label, on, onClick, disabled, disabledTitle) => (
          <button onClick={onClick} disabled={disabled} title={disabled ? disabledTitle : ''}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '6px 8px',
              border: `1px solid ${on ? col : t.BORDER}`,
              background: 'transparent',
              color: on ? col : t.MUTED,
              borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
              opacity: disabled ? 0.45 : 1,
            }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%',
              background: on ? col : 'transparent',
              border: `1.5px solid ${on ? col : t.MUTED}`,
              flexShrink: 0,
            }} />
            {label}
          </button>
        );
        return (
          <div ref={popoverRef} style={{
            position: 'fixed', left, top, zIndex: 2000,
            width: popoverW, padding: 10, background: t.CARD,
            border: `1px solid ${t.BORDER}`, borderRadius: 8,
            boxShadow: t.dark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: col }} />
              <div style={{ fontSize: 10, fontWeight: 600, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {PROCESS_COLORS[pr.type].name} · Day{editing + 1}
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setEditing(null)} style={{
                width: 18, height: 18, border: 'none', background: 'transparent',
                color: t.MUTED, cursor: 'pointer', borderRadius: 3,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {renderToggle(
                isWorkDay ? '作業日 ON' : '作業日にする',
                isWorkDay, toggleWorkDay,
                isWorkDay && !canRemoveWorkDay,
                '最後の1日は外せません',
              )}
              {renderToggle(
                isDeadlineCell ? '提出日 ON' : '提出日にする',
                isDeadlineCell, toggleDeadline,
                false, '',
              )}
            </div>

            {isWorkDay ? (
              <>
                <textarea autoFocus value={memos[editing] || ''}
                  onChange={(e) => updateMemo(editing, e.target.value)}
                  placeholder="この日のメモ (例: ラフA案を詰める)"
                  style={{
                    width: '100%', minHeight: 54, padding: 6, boxSizing: 'border-box',
                    border: `1px solid ${t.BORDER}`, borderRadius: 4,
                    background: t.SUBTLE, color: t.TEXT, fontSize: 11,
                    fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                  }} />
                <div style={{ marginTop: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => updateMemo(editing, '')}
                    disabled={!memos[editing]}
                    style={{
                      padding: '2px 0', fontSize: 10, border: 'none', background: 'transparent',
                      color: memos[editing] ? t.MUTED : t.BORDER,
                      cursor: memos[editing] ? 'pointer' : 'default', fontFamily: 'inherit',
                    }}>メモ削除</button>
                </div>
              </>
            ) : (
              <div style={{
                padding: '8px 10px',
                background: t.SUBTLE, border: `1px dashed ${t.BORDER}`,
                borderRadius: 4, fontSize: 10, color: t.MUTED, lineHeight: 1.5,
              }}>
                工程日に設定するとメモを書けます。
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setEditing(null)} style={{
                padding: '5px 14px', fontSize: 11, border: `1px solid ${t.ACCENT}`,
                background: t.ACCENT, color: t.dark ? t.BG : 'white',
                borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              }}>OK</button>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
};

// ============ 6. Kanban: Wクリック詳細 + カードDnD ============
const _origKanban = window.V4Kanban;

function computedBoardStatus(p) {
  // 完了判定は工程の手動チェック (pr.completed) に委ねる。時間超過では done にしない
  const total = p.processes.length;
  const completed = p.processes.filter(x => !!x.completed).length;
  if (total > 0 && completed >= total) return 'done';
  if (completed > 0) return 'progress';
  // 何も完了していなくても、作業予定セルが今日を過ぎていれば進行中扱い
  const todayIdx = (window.dateToDayIdx && window.dateToDayIdx(TODAY)) ?? 0;
  const hasStarted = p.processes.some(x => (x.days || []).some(d => d <= todayIdx));
  if (hasStarted) return 'progress';
  // review は手動配置のみ
  return 'todo';
}

const CARD_SIZE_KEY = 'v5.kanbanCardSize';
const CARD_CHECKLIST_EXPANDED_KEY = 'v5.kanbanChecklistExpandAll';
function loadCardSize() {
  const v = localStorage.getItem(CARD_SIZE_KEY);
  return v === 'small' ? 'small' : 'large';
}
function loadChecklistExpandAll() {
  return localStorage.getItem(CARD_CHECKLIST_EXPANDED_KEY) === '1';
}

function V5CardContextMenu({ t, project, store, x, y, onClose, onEdit }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  const isArchived = !!project.archived;
  const isOnHold = (project.boardStatus || computedBoardStatus(project)) === 'onhold';
  const W = 160;
  const H = 130;
  const left = Math.min(x, window.innerWidth - W - 8);
  const top = Math.min(y, window.innerHeight - H - 8);

  const Item = ({ label, color, onClick }) => (
    <button onClick={onClick} style={{
      padding: '7px 12px', textAlign: 'left', fontSize: 12, fontFamily: 'inherit',
      background: 'transparent', border: 'none', color: color || t.TEXT,
      cursor: 'pointer', width: '100%',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = t.SUBTLE; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      {label}
    </button>
  );

  const toggleOnHold = () => {
    onClose();
    if (isOnHold) {
      // 解除: computedBoardStatus に委譲
      store.updateProject(project.id, { boardStatus: null });
    } else {
      store.updateProject(project.id, { boardStatus: 'onhold' });
    }
  };

  return ReactDOM.createPortal(
    <div ref={ref} style={{
      position: 'fixed', left, top, width: W, zIndex: 9999,
      background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)', padding: 4,
      display: 'flex', flexDirection: 'column',
    }}>
      <Item label="編集" onClick={() => { onClose(); onEdit && onEdit(project); }} />
      <Item label={isOnHold ? '保留解除' : '保留にする'} onClick={toggleOnHold} />
      <Item label={isArchived ? 'アーカイブ解除' : 'アーカイブ'}
        onClick={() => { onClose(); store.setArchived(project.id, !isArchived); }} />
      <div style={{ height: 1, background: t.BORDER, margin: '2px 4px' }} />
      <Item label="削除" color={t.dark ? '#f87171' : '#dc2626'}
        onClick={() => {
          onClose();
          const dn = store?.displayName ? store.displayName(project) : project.name;
          if (confirm(`「${dn}」を削除しますか？（取り消せません）`)) {
            store.deleteProject(project.id);
          }
        }} />
    </div>,
    document.body
  );
}

window.V4Kanban = function V4KanbanV5({ t, store, onNewProject, onEditProject }) {
  const [detail, setDetail] = React.useState(null);
  const [dragId, setDragId] = React.useState(null);
  const [overCol, setOverCol] = React.useState(null);
  // ドラッグ中のドロップターゲット {colId, idx}|null。null は「カーソルがどの列にも未到達」
  const [dropTarget, setDropTarget] = React.useState(null);
  const [cardSize, setCardSize] = React.useState(loadCardSize);
  const [expandAll, setExpandAll] = React.useState(loadChecklistExpandAll);
  const [showArchived, setShowArchived] = React.useState(false);
  const [showOnHold, setShowOnHold] = React.useState(true);
  const [menuPos, setMenuPos] = React.useState(null);
  // ターゲットのキャッシュ（同じ位置で連続発火しないように）
  const lastTargetKeyRef = React.useRef(null);
  const dropAppliedRef = React.useRef(false);
  const changeSize = (s) => { setCardSize(s); localStorage.setItem(CARD_SIZE_KEY, s); };
  const toggleExpandAll = () => {
    setExpandAll(v => {
      const next = !v;
      localStorage.setItem(CARD_CHECKLIST_EXPANDED_KEY, next ? '1' : '0');
      return next;
    });
  };

  // dropTarget の更新。ドラッグ中は即時更新（ラグ防止のため view transition は使わない）
  // 同一ターゲットへの連続発火は lastTargetKeyRef で間引く
  const setDropTargetSmooth = React.useCallback((next) => {
    const key = next ? `${next.colId}::${next.idx}` : 'null';
    if (lastTargetKeyRef.current === key) return;
    lastTargetKeyRef.current = key;
    setDropTarget(next);
  }, []);

  // 案件を「指定列の指定 idx」に移動: boardStatus 更新 + kanbanOrder の入れ替えを行う
  // store.projects の配列順は触らない（タイムライン側の並び順と独立させる）
  const applyMove = React.useCallback((projectId, targetStatus, targetIdxInCol, postUpdate) => {
    const mutate = () => {
      // 1. boardStatus 更新（status だけ書き換え、配列順は不変）
      store.setProjects(ps => ps.map(p => p.id === projectId ? { ...p, boardStatus: targetStatus } : p));
      // 2. kanbanOrder の中で並び替え
      store.setKanbanOrder(currentOrder => {
        const projectsById = new Map(store.projects.map(p => [p.id, p]));
        const withoutIds = currentOrder.filter(id => id !== projectId);
        const statusOfId = (id) => {
          if (id === projectId) return targetStatus; // dragged の新ステータスを優先
          const p = projectsById.get(id);
          if (!p) return null;
          // 保留中のカードは列配置上は computedBoardStatus 扱い
          if (p.boardStatus === 'onhold') return computedBoardStatus(p);
          return p.boardStatus || computedBoardStatus(p);
        };
        const colMemberIds = withoutIds.filter(id => statusOfId(id) === targetStatus);
        let flatIdx;
        if (colMemberIds.length === 0) {
          flatIdx = withoutIds.length;
        } else if (targetIdxInCol <= 0) {
          flatIdx = withoutIds.indexOf(colMemberIds[0]);
        } else if (targetIdxInCol >= colMemberIds.length) {
          flatIdx = withoutIds.indexOf(colMemberIds[colMemberIds.length - 1]) + 1;
        } else {
          flatIdx = withoutIds.indexOf(colMemberIds[targetIdxInCol]);
        }
        if (flatIdx < 0) flatIdx = withoutIds.length;
        const newOrder = [...withoutIds];
        newOrder.splice(flatIdx, 0, projectId);
        return newOrder;
      });
      if (postUpdate) postUpdate();
    };
    const apply = () => {
      if (ReactDOM.flushSync) ReactDOM.flushSync(mutate);
      else mutate();
    };
    if (document.startViewTransition) document.startViewTransition(apply);
    else apply();
  }, [store]);

  const cleanupDragState = React.useCallback(() => {
    setDragId(null);
    setDropTarget(null);
    setOverCol(null);
    lastTargetKeyRef.current = null;
  }, []);

  // pointer events ベースのカード DnD（HTML5 DnD のカーソル flicker を回避）
  // - 5px 動くまでドラッグ判定にしない（onDoubleClick / 単純クリックを保持）
  // - 列とカード位置は data-kanban-col / data-kanban-card-id 経由で querySelector
  // - ドラッグ要素のクローン (ゴースト) を fixed 配置でカーソル追従
  const handleCardPointerDown = React.useCallback((projectId, e) => {
    if (e.button !== 0) return;
    const startX = e.clientX, startY = e.clientY;
    let dragStarted = false;
    const cardEl = e.currentTarget;
    const cardRect = cardEl.getBoundingClientRect();
    const offsetX = e.clientX - cardRect.left;
    const offsetY = e.clientY - cardRect.top;
    let ghostEl = null;

    const computeTarget = (cursorX, cursorY) => {
      const colEls = document.querySelectorAll('[data-kanban-col]');
      let targetColEl = null;
      colEls.forEach((col) => {
        const r = col.getBoundingClientRect();
        if (cursorX >= r.left && cursorX <= r.right && cursorY >= r.top && cursorY <= r.bottom) {
          targetColEl = col;
        }
      });
      if (!targetColEl) return null;
      const colId = targetColEl.dataset.kanbanCol;
      const cardEls = targetColEl.querySelectorAll('[data-kanban-card-id]');
      let idx = 0;
      cardEls.forEach((card) => {
        if (card.dataset.kanbanCardId === projectId) return;
        const r = card.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        if (cursorY > mid) idx++;
      });
      return { colId, idx };
    };

    const onMove = (mv) => {
      if (!dragStarted) {
        const dx = mv.clientX - startX;
        const dy = mv.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) < 5) return;
        dragStarted = true;
        setDragId(projectId);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
        // ゴーストクローン生成
        ghostEl = cardEl.cloneNode(true);
        ghostEl.style.position = 'fixed';
        ghostEl.style.left = `${cardRect.left}px`;
        ghostEl.style.top = `${cardRect.top}px`;
        ghostEl.style.width = `${cardRect.width}px`;
        ghostEl.style.height = `${cardRect.height}px`;
        ghostEl.style.margin = '0';
        ghostEl.style.pointerEvents = 'none';
        ghostEl.style.zIndex = '10000';
        ghostEl.style.opacity = '0.92';
        ghostEl.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.28)';
        ghostEl.style.transform = 'rotate(1.5deg) scale(1.03)';
        ghostEl.style.transition = 'box-shadow 0.15s ease';
        ghostEl.style.cursor = 'grabbing';
        document.body.appendChild(ghostEl);
      }
      if (ghostEl) {
        ghostEl.style.left = `${mv.clientX - offsetX}px`;
        ghostEl.style.top = `${mv.clientY - offsetY}px`;
      }
      const target = computeTarget(mv.clientX, mv.clientY);
      if (target) setDropTargetSmooth(target);
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (ghostEl) {
        try { document.body.removeChild(ghostEl); } catch (err) { /* ignore */ }
        ghostEl = null;
      }
      if (!dragStarted) return; // 単純クリック/ダブルクリック等はそのまま fire させる
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      // ドラッグ後の click は 1 回だけ握りつぶす（ダブルクリック誤判定回避）
      const blockClick = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        document.removeEventListener('click', blockClick, true);
      };
      document.addEventListener('click', blockClick, true);
      setTimeout(() => document.removeEventListener('click', blockClick, true), 300);
      // commit (現在の dropTarget を読み取って実行)
      setDropTarget(currentTarget => {
        if (currentTarget) {
          applyMove(projectId, currentTarget.colId, currentTarget.idx, () => {
            setDragId(null);
            setOverCol(null);
            lastTargetKeyRef.current = null;
          });
        } else {
          setDragId(null);
          setOverCol(null);
          lastTargetKeyRef.current = null;
        }
        return null;
      });
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }, [applyMove, setDropTargetSmooth]);

  const columns = [
    { id: 'todo', label: '未着手' },
    { id: 'progress', label: '進行中' },
    { id: 'review', label: 'レビュー待ち' },
    { id: 'done', label: '完了' },
  ];

  // 保留 (onhold) は専用列を持たず、列配置は computedBoardStatus にフォールバック
  // （カードは「進行中」「未着手」など本来の列に薄表示で残る）
  const statusOf = (p) => {
    if (p.boardStatus === 'onhold') return computedBoardStatus(p);
    return p.boardStatus || computedBoardStatus(p);
  };
  const archivedCount = store.projects.filter(p => p.archived).length;
  const onHoldCount = store.projects.filter(p => p.boardStatus === 'onhold' && !p.archived).length;

  const SizeTab = ({ value, label, icon }) => (
    <button onClick={() => changeSize(value)} title={`${label}カード`} style={{
      padding: '4px 8px', border: 'none', borderRadius: 4,
      background: cardSize === value ? t.CARD : 'transparent',
      color: cardSize === value ? t.ACCENT : t.MUTED,
      display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
      fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
    }}>{icon}{label}</button>
  );

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: t.TEXT, letterSpacing: -0.3 }}>カード</div>
          <div style={{ fontSize: 11, color: t.MUTED, marginTop: 2 }}>
            ドラッグで列を移動 · <span style={{ color: t.ACCENT }}>ダブルクリックで詳細</span> · 工程アイコンクリックで完了切替 · 右クリックで編集/アーカイブ/削除
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onHoldCount > 0 && (
            <button onClick={() => setShowOnHold(v => !v)}
              title={showOnHold ? '保留中を非表示' : '保留中を表示'}
              style={{
                padding: '5px 9px', borderRadius: 6, border: `1px solid ${showOnHold ? t.ACCENT : t.BORDER}`,
                background: showOnHold ? `${t.ACCENT}12` : t.CARD,
                color: showOnHold ? t.ACCENT : t.MUTED,
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>
              </svg>
              保留中 {onHoldCount}
            </button>
          )}
          {archivedCount > 0 && (
            <button onClick={() => setShowArchived(v => !v)}
              title={showArchived ? 'アーカイブ済みを非表示' : 'アーカイブ済みを表示'}
              style={{
                padding: '5px 9px', borderRadius: 6, border: `1px solid ${showArchived ? t.ACCENT : t.BORDER}`,
                background: showArchived ? `${t.ACCENT}12` : t.CARD,
                color: showArchived ? t.ACCENT : t.MUTED,
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>
              </svg>
              アーカイブ済み {archivedCount}
            </button>
          )}
          {cardSize === 'large' && (
            <button onClick={toggleExpandAll}
              title={expandAll ? '事務チェックをすべて折りたたむ' : '事務チェックをすべて展開'}
              style={{
                padding: '5px 9px', borderRadius: 6, border: `1px solid ${t.BORDER}`,
                background: expandAll ? `${t.ACCENT}12` : t.CARD,
                color: expandAll ? t.ACCENT : t.TEXT,
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                style={{ transition: 'transform 0.15s', transform: expandAll ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
              事務チェック{expandAll ? ' 展開中' : ''}
            </button>
          )}
          <div style={{ display: 'flex', gap: 2, background: t.SUBTLE, borderRadius: 6, padding: 2 }}>
            <SizeTab value="small" label="小" icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="7" width="16" height="4" rx="1"/><rect x="4" y="14" width="16" height="4" rx="1"/></svg>
            } />
            <SizeTab value="large" label="大" icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="7" rx="1"/><rect x="4" y="13" width="16" height="7" rx="1"/></svg>
            } />
          </div>
          <button onClick={onNewProject} style={{ ...buttonStyle(t, 'primary'), display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            新しい案件
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {(() => {
          // カードビュー独自の並び順 (store.kanbanOrder) を適用。store.projects 配列とは独立
          const orderedProjects = (() => {
            const order = store.kanbanOrder;
            if (!order || order.length === 0) return store.projects;
            const projById = new Map(store.projects.map(p => [p.id, p]));
            const ordered = [];
            order.forEach(id => { const p = projById.get(id); if (p) ordered.push(p); });
            const inOrder = new Set(order);
            store.projects.forEach(p => { if (!inOrder.has(p.id)) ordered.push(p); });
            return ordered;
          })();
          return columns.map(col => {
          // この列の本来の所属メンバー (kanbanOrder の順序で)
          const colMembers = orderedProjects.filter(p => {
            if (statusOf(p) !== col.id) return false;
            if (!showArchived && p.archived) return false;
            if (!showOnHold && p.boardStatus === 'onhold') return false;
            return true;
          });
          const isOver = dropTarget?.colId === col.id;
          // ドラッグ中の表示用配列。dropTarget がこの列にある場合、dragged を その idx に挿入してプレビュー
          let displayItems = colMembers;
          if (dragId) {
            const dragged = store.projects.find(p => p.id === dragId);
            const isPreviewHere = !!(dropTarget && dropTarget.colId === col.id);
            const draggedInRealCol = colMembers.some(p => p.id === dragId);
            if (dragged && isPreviewHere) {
              const without = colMembers.filter(p => p.id !== dragId);
              displayItems = [...without];
              const idx = Math.max(0, Math.min(dropTarget.idx, displayItems.length));
              displayItems.splice(idx, 0, dragged);
            } else if (dragged && draggedInRealCol && dropTarget && dropTarget.colId !== col.id) {
              // 他列でプレビュー中。元の列からは除く
              displayItems = colMembers.filter(p => p.id !== dragId);
            }
          }
          // pointer events 化: 列ハンドラ撤去。データ属性のみ残し handleCardPointerDown で駆動
          return (
            <div key={col.id}
              data-kanban-col={col.id}
              style={{
                background: t.CARD,
                border: `1px solid ${isOver ? t.ACCENT : t.BORDER}`,
                borderRadius: 10, display: 'flex', flexDirection: 'column', minHeight: 480,
                transition: 'border-color 0.15s, background 0.15s',
                boxShadow: isOver ? `inset 0 0 0 1px ${t.ACCENT}44` : 'none',
              }}>
              <div style={{
                padding: '12px 14px', borderBottom: `1px solid ${t.BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT }}>{col.label}</div>
                <span style={{
                  fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                  padding: '1px 6px', background: t.SUBTLE, borderRadius: 3, fontWeight: 600,
                }}>{colMembers.length}</span>
              </div>
              <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {displayItems.map(p => (
                  <div key={p.id}
                    data-kanban-card-id={p.id}
                    onPointerDown={(e) => handleCardPointerDown(p.id, e)}
                    onDoubleClick={() => setDetail(p)}
                    onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY, project: p }); }}
                    style={{
                      opacity: dragId === p.id ? 0.4 : (p.archived ? 0.55 : 1),
                      transition: 'opacity 0.15s',
                      position: 'relative',
                      cursor: dragId === p.id ? 'grabbing' : 'grab',
                      touchAction: 'none',
                    }}>
                    {p.archived && (
                      <div style={{
                        position: 'absolute', top: 4, right: 4, zIndex: 1,
                        padding: '1px 6px', borderRadius: 3,
                        background: t.SUBTLE, color: t.MUTED,
                        fontSize: 9, fontWeight: 600, letterSpacing: 0.3,
                        pointerEvents: 'none',
                        animation: 'v5-badge-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                      }}>アーカイブ</div>
                    )}
                    {cardSize === 'small'
                      ? <V5KanbanCardSmall t={t} project={p} store={store} />
                      : <V4KanbanCard t={t} project={p} store={store} expandAll={expandAll} />}
                  </div>
                ))}
                {displayItems.length === 0 && (
                  <div style={{
                    padding: 30, textAlign: 'center', fontSize: 11,
                    color: isOver ? t.ACCENT : t.MUTED,
                    border: `1px dashed ${isOver ? t.ACCENT : t.BORDER}`,
                    borderRadius: 8, margin: 4,
                    background: isOver ? `${t.ACCENT}08` : 'transparent',
                  }}>{isOver ? 'ここにドロップ' : '案件なし'}</div>
                )}
              </div>
            </div>
          );
          });
        })()}
      </div>
      {detail && <V5ProjectDetail t={t} store={store} project={detail}
        onClose={() => setDetail(null)}
        onEdit={onEditProject ? () => { const p = detail; setDetail(null); onEditProject(p); } : null} />}
      {menuPos && (
        <V5CardContextMenu t={t} store={store}
          project={menuPos.project} x={menuPos.x} y={menuPos.y}
          onClose={() => setMenuPos(null)}
          onEdit={onEditProject ? (p) => onEditProject(p) : null} />
      )}
    </div>
  );
};

// 入力量に応じて高さが伸縮する textarea。空のときは初期高さ、入力ぶん scrollHeight に合わせて拡張。max まで広がったら内部スクロール
function V5AutoGrowTextarea({ value, onChange, t, placeholder, maxHeight = 500, minHeight = 54 }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const sh = el.scrollHeight;
    el.style.height = Math.min(maxHeight, Math.max(minHeight, sh)) + 'px';
    el.style.overflowY = sh > maxHeight ? 'auto' : 'hidden';
  }, [value, maxHeight, minHeight]);
  return (
    <textarea ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...inputStyle(t),
        minHeight, resize: 'none', fontFamily: 'inherit',
        overflowY: 'hidden',
      }} />
  );
}
window.V5AutoGrowTextarea = V5AutoGrowTextarea;

// 小型カード: 案件タイプ / 案件名 / 締め切り（カードらしさを残した中間サイズ）
function V5KanbanCardSmall({ t, project, store }) {
  const ty = (store?.types?.[project.typeId]) || PROJECT_TYPES[project.typeId];
  const dlDate = project.deadline
    ? (project.deadline instanceof Date ? project.deadline : new Date(project.deadline))
    : null;
  const today = TODAY;
  const deadlineDays = dlDate ? Math.round((dlDate - today) / 86400000) : null;
  const isDone = (project.boardStatus || computedBoardStatus(project)) === 'done';
  const isOnHold = project.boardStatus === 'onhold';
  // 保留中は締切煽りを抑制
  const isUrgent = !isDone && !isOnHold && deadlineDays !== null && deadlineDays <= 7 && deadlineDays >= 0;
  const isOverdue = !isDone && !isOnHold && deadlineDays !== null && deadlineDays < 0;
  const dlColor = isOverdue || isUrgent ? (t.dark ? '#f87171' : '#dc2626') : t.MUTED;

  return (
    <div style={{
      padding: '9px 11px', background: t.CARD,
      // border shorthand 経由でテーマ変更時に borderLeft が消えるのを回避
      borderTop: `1px ${isOnHold ? 'dashed' : 'solid'} ${t.BORDER}`,
      borderRight: `1px ${isOnHold ? 'dashed' : 'solid'} ${t.BORDER}`,
      borderBottom: `1px ${isOnHold ? 'dashed' : 'solid'} ${t.BORDER}`,
      borderLeft: `3px ${isOnHold ? 'dashed' : 'solid'} ${ty ? typeColor(ty) : t.ACCENT}`,
      borderRadius: 7,
      cursor: 'grab', display: 'flex', flexDirection: 'column', gap: 5,
      transition: 'all 0.15s',
      opacity: isOnHold ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {ty && (() => {
          const tc = typeColor(ty);
          return (
            <span style={{
              padding: '1px 6px', borderRadius: 3,
              background: `${tc}20`, color: tc,
              fontSize: 9, fontWeight: 600, letterSpacing: 0.2,
            }}>{ty.name}</span>
          );
        })()}
        {isOnHold && (
          <span style={{
            padding: '1px 5px', borderRadius: 3,
            background: t.SUBTLE, color: t.MUTED,
            fontSize: 9, fontWeight: 600, letterSpacing: 0.2,
          }}>保留中</span>
        )}
        {(isUrgent || isOverdue) && (
          <span style={{ fontSize: 9 }}>🔥</span>
        )}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, color: t.TEXT, lineHeight: 1.3,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{store?.displayName ? store.displayName(project) : project.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{
          fontSize: 10, color: dlColor, fontWeight: isUrgent || isOverdue ? 600 : 500,
          fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
        }}>
          {dlDate
            ? `${dlDate.getMonth()+1}/${dlDate.getDate()}${isOverdue ? ' 超過' : ''}`
            : (project.client || '締切未設定')}
        </span>
      </div>
    </div>
  );
}
window.V5KanbanCardSmall = V5KanbanCardSmall;

function V5ProjectDetail({ t, store, project, onClose, onEdit }) {
  // 詳細モーダル表示中に store.updateProject が走っても即時反映できるよう
  // 毎 render で最新プロジェクトを引き直す（親 state の参照は古いまま）。
  const live = store.projects.find(p => p.id === project.id) || project;
  project = live;
  const s = projectStats(project);
  const type = store.types[project.typeId] || PROJECT_TYPES[project.typeId];
  const today = TODAY;
  const dlDate = project.deadline
    ? (project.deadline instanceof Date ? project.deadline : new Date(project.deadline))
    : null;
  const dl = dlDate ? Math.round((dlDate - today) / 86400000) : null;
  const isDone = (project.boardStatus || computedBoardStatus(project)) === 'done';

  return (
    <ModalShell t={t} title={store?.displayName ? store.displayName(project) : project.name} onClose={onClose} width={620}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {type && (() => {
          const tc = typeColor(type);
          return (
            <div style={{
              padding: '3px 8px', borderRadius: 4,
              background: `${tc}20`, color: tc,
              fontSize: 10, fontWeight: 600,
            }}>{type.name}</div>
          );
        })()}
        {dlDate ? (
          <div style={{
            padding: '3px 8px', borderRadius: 4, background: t.SUBTLE,
            color: t.TEXT, fontSize: 10, fontWeight: 500,
          }}>
            締切 {dlDate.getMonth()+1}/{dlDate.getDate()}
            {isDone ? (
              <span style={{ color: t.MUTED, marginLeft: 6, fontWeight: 600 }}>完了</span>
            ) : (
              <span style={{
                color: dl <= 7 ? (t.dark ? '#f87171' : '#dc2626') : t.MUTED,
                marginLeft: 6, fontWeight: 600,
              }}>{dl >= 0 ? `残${dl}日` : `${-dl}日超過`}</span>
            )}
          </div>
        ) : project.client ? (
          <div style={{
            padding: '3px 8px', borderRadius: 4, background: t.SUBTLE,
            color: t.TEXT, fontSize: 10, fontWeight: 500,
          }}>締切 {project.client}</div>
        ) : null}
        {dlDate && project.client && (
          <div style={{
            padding: '3px 8px', borderRadius: 4, background: t.SUBTLE,
            color: t.MUTED, fontSize: 10,
          }}>{project.client}</div>
        )}
      </div>
      {/* 進捗 */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
          <span style={{ color: t.MUTED, fontWeight: 600 }}>全体進捗</span>
          <span style={{ color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', fontWeight: 700 }}>
            {s.totalActual.toFixed(1)} / {s.totalPlanned}h · {s.pct}%
          </span>
        </div>
        <div style={{ height: 4, background: `${t.BORDER}66`, borderRadius: 2, overflow: 'hidden' }}>
          {(() => {
            const tc = type ? typeColor(type) : t.ACCENT;
            return (
              <div style={{
                height: '100%', width: `${s.pct}%`,
                background: `linear-gradient(90deg, ${tc}, ${tc}cc)`,
              }} />
            );
          })()}
        </div>
      </div>
      {/* 工程 */}
      <div style={{ fontSize: 11, fontWeight: 600, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>工程内訳</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
        {project.processes.map(pr => {
          const pct = pr.plannedH > 0 ? Math.min(100, Math.round(pr.actualH / pr.plannedH * 100)) : 0;
          const col = processColor(pr.type, 'solid', t.dark ? 'dark' : 'light');
          return (
            <div key={pr.id} style={{
              padding: '8px 10px', background: t.SUBTLE, borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: col, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: t.TEXT, fontWeight: 500 }}>
                {PROCESS_COLORS[pr.type].name}
              </div>
              <div style={{ width: 120, height: 4, background: t.CARD, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: col }} />
              </div>
              <div style={{ fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', minWidth: 70, textAlign: 'right' }}>
                {pr.actualH.toFixed(1)}/{pr.plannedH}h
              </div>
            </div>
          );
        })}
      </div>
      <V5ChecklistFull t={t} project={project} store={store} />
      <V5DetailNoteEditor t={t} project={project} store={store} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        {onEdit && (
          <button onClick={onEdit} style={{ ...buttonStyle(t, 'secondary'), display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            編集
          </button>
        )}
        <button onClick={onClose} style={buttonStyle(t, 'primary')}>閉じる</button>
      </div>
    </ModalShell>
  );
}

function V5DetailNoteEditor({ t, project, store }) {
  const [draft, setDraft] = React.useState(project.note || '');
  const [focused, setFocused] = React.useState(false);
  // 別案件に切り替わったら下書きを同期
  React.useEffect(() => { setDraft(project.note || ''); }, [project.id]);
  // 外部更新（例: 編集モーダルからの保存）とも同期（フォーカス中は上書きしない）
  React.useEffect(() => {
    if (!focused) setDraft(project.note || '');
  }, [project.note, focused]);

  const save = () => {
    const next = draft.trim();
    const current = (project.note || '').trim();
    if (next !== current) store.updateProject(project.id, { note: next });
  };

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 18 }}>メモ</div>
      <textarea
        value={draft}
        placeholder="メモを追加..."
        onChange={e => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); save(); }}
        rows={3}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: 10, borderRadius: 6,
          background: `${t.ACCENT}10`,
          border: `1px dashed ${t.ACCENT}44`,
          fontSize: 12, lineHeight: 1.6, color: t.TEXT,
          fontFamily: 'inherit', resize: 'vertical', outline: 'none',
        }}
      />
    </>
  );
}

window.V5DetailNoteEditor = V5DetailNoteEditor;
window.V5ProjectDetail = V5ProjectDetail;

// ============ 8. 案件編集モーダル ============
function V5ProjectEditor({ t, store, project, onClose, onEditSub }) {
  const [name, setName] = React.useState(project.name);
  const [client, setClient] = React.useState(project.client || '');
  const [deadlineDate, setDeadlineDate] = React.useState(() => {
    if (!project.deadline) return '';
    const d = project.deadline instanceof Date ? project.deadline : new Date(project.deadline);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [note, setNote] = React.useState(project.note || '');
  const [typeId, setTypeId] = React.useState(project.typeId);
  const [processes, setProcesses] = React.useState(() => project.processes.map(p => ({ ...p })));
  const [status, setStatus] = React.useState(project.boardStatus || computedBoardStatus(project));
  const [addOpen, setAddOpen] = React.useState(false);
  const [dragIdx, setDragIdx] = React.useState(null);
  const [newProcName, setNewProcName] = React.useState('');

  const save = () => {
    let deadline = null;
    if (deadlineDate) {
      const [y, m, d] = deadlineDate.split('-').map(Number);
      if (y && m && d) deadline = new Date(y, m - 1, d);
    }
    store.updateProject(project.id, {
      name: name.trim() || project.name,
      client,
      deadline,
      note,
      typeId,
      processes,
      boardStatus: status,
    });
    onClose();
  };

  const addProcess = (type) => {
    const allDays = processes.flatMap(pr => pr.days);
    const start = allDays.length > 0 ? Math.max(...allDays) + 1 : 0;
    const days = [start, start + 1, start + 2, start + 3, start + 4];
    // 自動算出モードで登録（plannedH は保存時にストア側で days × workHours から再計算される）
    const plannedH = store?.computePlannedH ? store.computePlannedH(days) : 0;
    setProcesses([...processes, {
      id: 'pr' + Date.now(),
      type,
      plannedH,
      actualH: 0,
      days,
      autoPlanned: true,
    }]);
    setAddOpen(false);
  };

  const updateProc = (idx, patch) => {
    setProcesses(processes.map((pr, i) => i === idx ? { ...pr, ...patch } : pr));
  };
  const deleteProcAt = (idx) => setProcesses(processes.filter((_, i) => i !== idx));
  const moveProc = (from, to) => {
    if (from === to) return;
    const next = [...processes];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setProcesses(next);
  };

  const typeObj = store.types[typeId] || PROJECT_TYPES[typeId];

  return (
    <ModalShell t={t} title={`案件を編集 · ${store?.displayName ? store.displayName(project) : project.name}`} onClose={onClose} width={640}>
      <Field t={t} label="案件名" required hint={store?.dummyMode ? 'プライバシーモード中は案件名を編集できません（解除すると元の名前を編集可能）' : undefined}>
        {store?.dummyMode ? (
          <input
            value={store.displayName ? store.displayName(project) : project.name}
            disabled
            style={{ ...inputStyle(t), opacity: 0.6, cursor: 'not-allowed' }} />
        ) : (
          <input autoFocus value={name} onChange={e => setName(e.target.value)} style={inputStyle(t)} />
        )}
      </Field>
      <Field t={t} label="締め切り" hint="日付を指定するとタイムラインにハイライト / フリーテキストも可">
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8, alignItems: 'center' }}>
          <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
            style={inputStyle(t)} />
          <input value={client} onChange={e => setClient(e.target.value)}
            placeholder="例: 5月末まで / GW明け"
            style={inputStyle(t)} />
        </div>
      </Field>
      <Field t={t} label="案件タイプ">
        <select value={typeId} onChange={e => setTypeId(e.target.value)} style={inputStyle(t)}>
          {Object.values(store.types).map(ty => (
            <option key={ty.id} value={ty.id}>{ty.name}</option>
          ))}
        </select>
      </Field>
      <Field t={t} label="ステータス" hint="完了にするとカードの「完了」列に移動。保留中は元の列に薄表示で残し、締切煽りや今日の予定集計から除外します">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['todo','未着手'],['progress','進行中'],['review','レビュー待ち'],['done','完了'],['onhold','保留中']].map(([k, l]) => {
            const active = status === k;
            const isDone = k === 'done';
            const isOnHold = k === 'onhold';
            const c = isDone ? (t.dark ? '#5ee1a9' : '#059669')
              : isOnHold ? t.MUTED
              : t.ACCENT;
            return (
              <button key={k} onClick={() => setStatus(k)} style={{
                padding: '5px 12px', borderRadius: 6,
                border: `1px ${isOnHold ? 'dashed' : 'solid'} ${active ? c : t.BORDER}`,
                background: active ? `${c}18` : t.CARD,
                color: active ? c : t.MUTED,
                fontSize: 11, fontWeight: active ? 600 : 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>{l}</button>
            );
          })}
        </div>
      </Field>
      <Field t={t} label="メモ" hint="案件に関する自由メモ">
        <V5AutoGrowTextarea value={note} onChange={setNote}
          t={t} placeholder="案件に関するメモ" maxHeight={500} />
      </Field>
      <Field t={t} label="工程" hint="ドラッグで並べ替え · 左のチェックで完了マーク · 予定/実績時間を入力 · 鉛筆で予定の手動上書き · ×で削除">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6,
          border: `1px solid ${t.BORDER}`, borderRadius: 8, background: t.SUBTLE }}>
          {processes.length === 0 && (
            <div style={{ padding: 10, textAlign: 'center', fontSize: 11, color: t.MUTED }}>
              工程はまだありません
            </div>
          )}
          {processes.map((pr, i) => {
            const col = processColor(pr.type, 'solid', t.dark ? 'dark' : 'light');
            return (
              <div key={pr.id}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); if (dragIdx != null && dragIdx !== i) moveProc(dragIdx, i); setDragIdx(null); }}
                onDragEnd={() => setDragIdx(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', background: t.CARD, border: `1px solid ${t.BORDER}`,
                  borderRadius: 6, cursor: 'grab', opacity: dragIdx === i ? 0.4 : 1,
                }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                {/* 工程完了の手動トグル: チェックを付けると進捗％・カードの ✓ アイコン・boardStatus に反映 */}
                {(() => {
                  const colBorder = processColor(pr.type, 'border', t.dark ? 'dark' : 'light');
                  return (
                    <button onClick={() => updateProc(i, { completed: !pr.completed })}
                      title={pr.completed ? 'クリックで未完了に戻す' : 'クリックで完了マーク'}
                      style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        // 未チェックは border モードの薄い色枠、チェックは solid を背景＆枠
                        border: `1.5px solid ${pr.completed ? col : colBorder}`,
                        background: pr.completed ? col : 'transparent',
                        color: '#fff', cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      {pr.completed && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                      )}
                    </button>
                  );
                })()}
                <select value={pr.type} onChange={e => updateProc(i, { type: e.target.value })}
                  style={{ flex: 1, padding: '4px 6px', border: `1px solid ${t.BORDER}`, borderRadius: 5,
                    background: t.CARD, color: t.TEXT, fontSize: 12, fontFamily: 'inherit', minWidth: 120 }}>
                  {Object.entries(PROCESS_COLORS).map(([key, p]) => (
                    <option key={key} value={key}>{p.name}</option>
                  ))}
                </select>
                {/* 提出日はタイムラインのセルクリックから設定する仕様。モーダルからは編集不可 */}
                {(() => {
                  const isAuto = pr.autoPlanned !== false;
                  // 自動モード時はセル数×平日/休日時間から算出したライブ値を表示
                  const autoValue = store?.computePlannedH ? store.computePlannedH(pr.days) : pr.plannedH;
                  const displayValue = isAuto ? autoValue : pr.plannedH;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: t.MUTED }}>
                      予定
                      <input type="number" min={0} step={0.5} value={displayValue} disabled={isAuto}
                        onChange={e => updateProc(i, { plannedH: Number(e.target.value) || 0, autoPlanned: false })}
                        title={isAuto ? `自動算出（${pr.days.length}セル × 平日/休日目安）` : '手動設定中'}
                        style={{
                          width: 56, padding: '3px 6px', border: `1px solid ${t.BORDER}`, borderRadius: 5,
                          background: isAuto ? t.SUBTLE : t.CARD,
                          color: t.TEXT, fontSize: 11,
                          fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                          opacity: isAuto ? 0.85 : 1,
                        }} />
                      h
                      {isAuto ? (
                        <button onClick={() => updateProc(i, { autoPlanned: false, plannedH: autoValue })}
                          title="手動で上書き" style={{
                            width: 22, height: 22, border: `1px solid ${t.BORDER}`, background: t.CARD,
                            color: t.MUTED, cursor: 'pointer', borderRadius: 4,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                          </svg>
                        </button>
                      ) : (
                        <button onClick={() => updateProc(i, { autoPlanned: true })}
                          title="自動算出に戻す" style={{
                            width: 22, height: 22, border: `1px solid ${t.ACCENT}44`, background: `${t.ACCENT}12`,
                            color: t.ACCENT, cursor: 'pointer', borderRadius: 4,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })()}
                {/* 実績時間（手入力 + ポモドーロ自動加算） */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: t.MUTED }}>
                  実績
                  <input type="number" min={0} step={0.1} value={pr.actualH || 0}
                    onChange={e => updateProc(i, { actualH: Math.max(0, Number(e.target.value) || 0) })}
                    title="これまでの実作業時間。アプリ移行時に過去分をまとめて入力可。ポモドーロ稼働時は自動で加算される"
                    style={{
                      width: 56, padding: '3px 6px', border: `1px solid ${t.BORDER}`, borderRadius: 5,
                      background: t.CARD, color: t.TEXT, fontSize: 11,
                      fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                    }} />
                  h
                </div>
                <button onClick={() => deleteProcAt(i)} title="工程を削除" style={{
                  width: 24, height: 24, border: `1px solid ${t.BORDER}`, background: t.CARD,
                  color: t.MUTED, cursor: 'pointer', borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            );
          })}
          {addOpen ? (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6, padding: 6,
              border: `1px dashed ${t.ACCENT}66`, borderRadius: 6, background: `${t.ACCENT}08`,
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Object.keys(PROCESS_COLORS).map(k => {
                  const col = processColor(k, 'solid', t.dark ? 'dark' : 'light');
                  return (
                    <button key={k} onClick={() => addProcess(k)} style={{
                      padding: '3px 8px', borderRadius: 10, border: `1px solid ${t.BORDER}`,
                      background: t.CARD, color: col, fontSize: 10, cursor: 'pointer',
                      fontFamily: 'inherit', fontWeight: 500,
                    }}>＋{PROCESS_COLORS[k].name}</button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input value={newProcName} onChange={e => setNewProcName(e.target.value)}
                  placeholder="新しい工程名 (例: ラフ)"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const key = window.v5AddCustomProcess && window.v5AddCustomProcess(newProcName);
                      if (key) { addProcess(key); setNewProcName(''); }
                    } else if (e.key === 'Escape') {
                      setNewProcName(''); setAddOpen(false);
                    }
                  }}
                  style={{ ...inputStyle(t), padding: '4px 8px', fontSize: 11, flex: 1, borderRadius: 10 }} />
                <button onClick={() => {
                  const key = window.v5AddCustomProcess && window.v5AddCustomProcess(newProcName);
                  if (key) { addProcess(key); setNewProcName(''); }
                }} title="新しい工程を追加" disabled={!newProcName.trim()} style={{
                  width: 24, height: 24, border: 'none',
                  background: newProcName.trim() ? t.ACCENT : t.SUBTLE,
                  color: newProcName.trim() ? 'white' : t.MUTED,
                  borderRadius: '50%', cursor: newProcName.trim() ? 'pointer' : 'default',
                  fontSize: 11, fontFamily: 'inherit',
                }}>✓</button>
                <button onClick={() => { setNewProcName(''); setAddOpen(false); }} style={{
                  padding: '3px 8px', fontSize: 10, border: 'none', background: 'transparent',
                  color: t.MUTED, cursor: 'pointer',
                }}>キャンセル</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddOpen(true)} style={{
              width: '100%', padding: 6, border: `1px dashed ${t.BORDER}`, background: 'transparent',
              color: t.MUTED, fontSize: 11, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            }}>＋ 工程を追加</button>
          )}
        </div>
      </Field>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
        <button onClick={() => {
          const dn = store?.displayName ? store.displayName(project) : project.name;
          if (confirm(`「${dn}」を削除しますか？（取り消せません）`)) {
            store.deleteProject(project.id);
            onClose();
          }
        }} style={{
          padding: '8px 12px', fontSize: 11, fontWeight: 500,
          border: `1px solid ${t.dark ? '#f87171' : '#dc2626'}`,
          background: 'transparent', color: t.dark ? '#f87171' : '#dc2626',
          borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
        }}>案件を削除</button>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={buttonStyle(t, 'ghost')}>キャンセル</button>
        <button onClick={save} style={buttonStyle(t, 'primary')}>保存</button>
      </div>
    </ModalShell>
  );
}

window.V5ProjectEditor = V5ProjectEditor;

// ============ V3TopBar 上書き: 編集可能タイトル / ワークスペース削除 / 検索バー機能化 ============
const _origTopBar = window.V3TopBar;
// 文字サイズ切替: ブラウザの Ctrl++ 相当の挙動を CSS zoom で実装。
// 数百箇所の fontSize: px を書き換えずに全体スケーリングできるのが採用理由。
// 倍率は 1.0 / 1.12 / 1.25 (ブラウザで 125% まで動作確認済み)。
const FONT_SCALE_KEY = 'v5.fontScale';
const FONT_SCALE_MAP = { sm: 1.0, md: 1.12, lg: 1.25 };
const FONT_SCALE_LABELS = { sm: '小', md: '中', lg: '大' };
// CSS zoom は viewport 単位を不変にするため、maxHeight: 85vh が zoom 1.25 で見た目 106vh まで膨らむ。
// 「見た目で 85vh」を維持するため、zoom 倍率の逆数で maxHeight を縮める CSS 変数を併せて公開する。
const MODAL_MAX_VH_MAP = { sm: '85vh', md: '76vh', lg: '68vh' };
function applyFontScale(scale) {
  const z = FONT_SCALE_MAP[scale] || 1.0;
  try {
    document.documentElement.style.zoom = z === 1 ? '' : String(z);
    document.documentElement.style.setProperty('--modal-max-h', MODAL_MAX_VH_MAP[scale] || '85vh');
  } catch (e) {}
}
// 初回描画の前にも適用してチラつき防止（React マウント前にスクリプトが読み込まれた段階で実行）
try {
  const _initScale = localStorage.getItem(FONT_SCALE_KEY);
  if (_initScale === 'md' || _initScale === 'lg') applyFontScale(_initScale);
} catch (e) {}

window.V3TopBar = function V3TopBarV5({ t, themeId, setThemeId, onFocus, searchQuery, setSearchQuery, pomo, store }) {
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [themeCreatorOpen, setThemeCreatorOpen] = React.useState(false);
  const [settingsSection, setSettingsSection] = React.useState(null);
  const [title, setTitle] = React.useState(() => localStorage.getItem('appTitle') || 'scheduler');
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(title);
  const [fontScale, setFontScale] = React.useState(() => {
    try {
      const v = localStorage.getItem(FONT_SCALE_KEY);
      if (v === 'sm' || v === 'md' || v === 'lg') return v;
    } catch (e) {}
    return 'sm';
  });
  React.useEffect(() => {
    applyFontScale(fontScale);
    try { localStorage.setItem(FONT_SCALE_KEY, fontScale); } catch (e) {}
  }, [fontScale]);

  // Ctrl+Z / Ctrl+Shift+Z (Mac は Meta) を document レベルでキャプチャ
  // input/textarea/contentEditable にフォーカス中はブラウザのネイティブ undo を優先
  const storeRef = React.useRef(store);
  storeRef.current = store;
  React.useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;
      const el = e.target;
      const tag = el && el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (el && el.isContentEditable)) return;
      const s = storeRef.current;
      if (!s) return;
      e.preventDefault();
      if (e.shiftKey) { if (s.canRedo) s.redo && s.redo(); }
      else { if (s.canUndo) s.undo && s.undo(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const saveTitle = () => {
    const next = draftTitle.trim() || title;
    setTitle(next);
    localStorage.setItem('appTitle', next);
    setEditingTitle(false);
  };
  const cancelTitle = () => { setDraftTitle(title); setEditingTitle(false); };

  return (
    <div style={{
      height: 52, background: t.CARD, borderBottom: `1px solid ${t.BORDER}`,
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0,
      position: 'relative',
    }}>
      {editingTitle ? (
        <input autoFocus value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') cancelTitle(); }}
          style={{
            fontSize: 13, fontWeight: 600, color: t.TEXT,
            padding: '4px 8px', border: `1px solid ${t.ACCENT}`, borderRadius: 5,
            background: t.BG, outline: 'none', fontFamily: 'inherit', minWidth: 220,
          }} />
      ) : (
        <div onClick={() => { setDraftTitle(title); setEditingTitle(true); }}
          title="クリックでタイトルを編集"
          style={{
            fontSize: 13, fontWeight: 600, color: t.TEXT, cursor: 'pointer',
            padding: '4px 8px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.background = t.SUBTLE}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {title}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2" style={{ opacity: 0.6 }}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </div>
      )}
      <div style={{ flex: 1 }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
        border: `1px solid ${searchQuery ? t.ACCENT : t.BORDER}`, borderRadius: 6, fontSize: 11,
        width: 260, background: t.BG,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={searchQuery || ''} onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
          placeholder="案件名、メモ、工程で検索"
          style={{
            flex: 1, border: 'none', background: 'transparent', color: t.TEXT,
            outline: 'none', fontSize: 11, fontFamily: 'inherit',
          }} />
        {searchQuery && (
          <button onClick={() => setSearchQuery && setSearchQuery('')} title="クリア" style={{
            width: 16, height: 16, border: 'none', background: 'transparent',
            color: t.MUTED, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {/* プライバシーモード ON 中のインジケーター: 切り忘れ防止のため常に視認できる場所に置く。クリックで OFF */}
      {store?.dummyMode && (
        <button
          onClick={() => store.setDummyMode && store.setDummyMode(false)}
          title="プライバシーモードを解除"
          style={{
            padding: '5px 10px', borderRadius: 6,
            border: `1px solid ${t.ACCENT}`, background: `${t.ACCENT}14`,
            color: t.ACCENT, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
          }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
          </svg>
          プライバシーモード
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ opacity: 0.6 }}><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      )}

      {/* 文字サイズ切替 (小 / 中 / 大) - 老眼レビュー対応。CSS zoom で全体スケーリング */}
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1px solid ${t.BORDER}`, borderRadius: 6, overflow: 'hidden',
        background: t.CARD,
      }} title="文字サイズ">
        {(['sm', 'md', 'lg']).map((s, i) => {
          const active = fontScale === s;
          const charSize = s === 'sm' ? 10 : s === 'md' ? 12 : 14;
          return (
            <button key={s} onClick={() => setFontScale(s)} title={`文字サイズ: ${FONT_SCALE_LABELS[s]}`} style={{
              padding: '4px 8px', minWidth: 26, height: 24, border: 'none',
              borderLeft: i === 0 ? 'none' : `1px solid ${t.BORDER}`,
              background: active ? `${t.ACCENT}18` : 'transparent',
              color: active ? t.ACCENT : t.MUTED,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: active ? 700 : 500,
            }}>
              <span style={{ fontSize: charSize, lineHeight: 1 }}>A</span>
            </button>
          );
        })}
      </div>

      <div style={{ position: 'relative' }}>
        <button onClick={() => setThemeOpen(!themeOpen)} style={{
          padding: '5px 8px', border: `1px solid ${t.BORDER}`, borderRadius: 6,
          background: t.CARD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'inherit', color: t.TEXT, fontSize: 11,
        }}>
          <div style={{ display: 'flex' }}>
            {t.swatch.map((c, i) => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: 3, background: c,
                border: `1px solid ${t.BORDER}`, marginLeft: i === 0 ? 0 : -4,
              }} />
            ))}
          </div>
          <span>{t.name.split(' ')[0]}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        {themeOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
            background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 8,
            padding: 6, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}>
            {Object.values(THEMES).map(th => (
              <button key={th.id} onClick={() => { setThemeId(th.id); setThemeOpen(false); }} style={{
                width: '100%', padding: '7px 8px', border: 'none', background: themeId === th.id ? t.SUBTLE : 'transparent',
                borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                fontFamily: 'inherit', fontSize: 12, color: t.TEXT, textAlign: 'left',
              }}>
                <div style={{ display: 'flex' }}>
                  {th.swatch.map((c, i) => (
                    <div key={i} style={{
                      width: 14, height: 14, borderRadius: 3, background: c,
                      border: `1px solid ${t.BORDER}`, marginLeft: i === 0 ? 0 : -4,
                    }} />
                  ))}
                </div>
                <span style={{ flex: 1 }}>{th.name}</span>
                {themeId === th.id && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.ACCENT} strokeWidth="3"><path d="m5 12 5 5L20 7"/></svg>}
              </button>
            ))}
            <div style={{ height: 1, background: t.BORDER, margin: '4px 0' }} />
            <button onClick={() => {
              setThemeOpen(false);
              setThemeCreatorOpen(true);
            }} style={{
              width: '100%', padding: '7px 8px', border: 'none', background: 'transparent',
              borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'inherit', fontSize: 12, color: t.ACCENT, textAlign: 'left', fontWeight: 600,
            }}>
              <div style={{
                width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: 2,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <span style={{ flex: 1 }}>新しいテーマを作成</span>
            </button>
          </div>
        )}
      </div>

      {(() => {
        const active = !!pomo;
        const phaseLabel = active ? (pomo.phase === 'work' ? '集中' : pomo.phase === 'break' ? '休憩' : pomo.phase === 'longBreak' ? '長休憩' : '完了') : '集中モード';
        const mm = active ? String(Math.floor(pomo.sec / 60)).padStart(2, '0') : '25';
        const ss = active ? String(pomo.sec % 60).padStart(2, '0') : '00';
        const pct = active && pomo.phaseSec > 0 ? (1 - pomo.sec / pomo.phaseSec) * 100 : 0;
        return (
          <button onClick={onFocus} title={active ? 'クリックで集中モードを再表示' : 'クリックで集中モードを開始'} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px',
            border: `1px solid ${t.ACCENT}${active ? '88' : '44'}`, borderRadius: 20,
            background: active ? (t.dark ? `${t.ACCENT}28` : `${t.ACCENT}15`) : 'transparent',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: `conic-gradient(${t.ACCENT} ${pct}%, ${t.ACCENT}22 ${pct}%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.ACCENT }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', color: t.ACCENT }}>{mm}:{ss}</span>
              <span style={{ fontSize: 9, color: t.MUTED, marginTop: 1 }}>
                {active ? `${phaseLabel} · ${pomo.setIdx}/${pomo.sets}` : '集中モード'}
              </span>
            </div>
          </button>
        );
      })()}
      <button onClick={() => setSettingsOpen(true)} title="設定" style={{
        width: 30, height: 30, borderRadius: 7, border: `1px solid ${t.BORDER}`, padding: 0,
        background: t.CARD, color: t.TEXT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = t.SUBTLE; }}
        onMouseLeave={e => { e.currentTarget.style.background = t.CARD; }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
      {settingsOpen && <V5SettingsModal t={t} store={store} themeId={themeId} setThemeId={setThemeId}
        initialSection={settingsSection}
        onClose={() => { setSettingsOpen(false); setSettingsSection(null); }} />}
      {themeCreatorOpen && <V5ThemeCreatorModal t={t} themeId={themeId} setThemeId={setThemeId}
        onClose={() => setThemeCreatorOpen(false)} />}
    </div>
  );
};

// ============ V3SubHeader 上書き: 進行中/完了/ドラフト タブで page 切替 ============
const _origSubHeader = window.V3SubHeader;
window.V3SubHeader = function V3SubHeaderV5({ t, onNewProject, store, page, setPage }) {
  const projects = (store && store.projects) || PROJECTS;
  const stat = (p) => p.boardStatus || computedBoardStatus(p);
  const doneCount = projects.filter(p => stat(p) === 'done').length;
  const progressCount = projects.length - doneCount;

  const Tab = ({ label, count, tabKey, targetPage }) => {
    const active = page === targetPage;
    return (
      <button onClick={() => setPage && setPage(targetPage)} style={{
        padding: '5px 10px', borderRadius: 6, border: 'none',
        background: active ? t.TEXT : t.SUBTLE,
        color: active ? (t.dark ? t.BG : 'white') : t.MUTED,
        fontSize: 11, fontWeight: 500, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
      }}>
        {label}
        <span style={{
          background: active ? 'rgba(255,255,255,0.2)' : t.CARD,
          padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 600,
        }}>{count}</span>
      </button>
    );
  };

  return (
    <div style={{
      padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: `1px solid ${t.BORDER}`, background: t.CARD,
    }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3, color: t.TEXT }}>
          {page === 'done' ? '完了案件' : 'ダッシュボード'}
        </div>
        <div style={{ fontSize: 11, color: t.MUTED, marginTop: 2 }}>2026年4月21日 火曜日 · Week 17</div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 4 }}>
        <Tab label="進行中" count={progressCount} targetPage="timeline" />
        <Tab label="完了" count={doneCount} targetPage="done" />
      </div>
      <div style={{ width: 1, height: 20, background: t.BORDER, margin: '0 4px' }} />
      <button onClick={onNewProject} style={{
        padding: '6px 12px', border: 'none', cursor: 'pointer',
        background: t.ACCENT, color: 'white', borderRadius: 6,
        fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        新しい案件
      </button>
    </div>
  );
};

// ============ 10. 完了案件タイムライン ============
function V4CompletedView({ t, store, dayW, monthOffset, setMonthOffset, expanded, setExpanded, onEditSub, onEditProject }) {
  const completed = store.projects.filter(p => (p.boardStatus || computedBoardStatus(p)) === 'done');
  const filteredStore = { ...store, projects: completed };
  const totalActual = completed.reduce((s, p) => s + p.processes.reduce((a, pr) => a + pr.actualH, 0), 0);
  const totalPlanned = completed.reduce((s, p) => s + p.processes.reduce((a, pr) => a + pr.plannedH, 0), 0);

  return (
    <div>
      <div style={{
        margin: '14px 20px 0', padding: '12px 16px',
        background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${t.dark ? '#5ee1a9' : '#059669'}20`,
          color: t.dark ? '#5ee1a9' : '#059669',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.TEXT, letterSpacing: -0.2 }}>完了案件</div>
          <div style={{ fontSize: 11, color: t.MUTED, marginTop: 1 }}>
            これまでに完了した案件のタイムライン。案件編集のステータスで変更できます。
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            padding: '6px 12px', background: t.SUBTLE, borderRadius: 6,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>件数</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
              {completed.length}<span style={{ fontSize: 10, color: t.MUTED, fontWeight: 400, marginLeft: 2 }}>件</span>
            </div>
          </div>
          <div style={{
            padding: '6px 12px', background: t.SUBTLE, borderRadius: 6,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>実績合計</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
              {totalActual.toFixed(1)}<span style={{ fontSize: 10, color: t.MUTED, fontWeight: 400, marginLeft: 2 }}>h</span>
            </div>
          </div>
          <div style={{
            padding: '6px 12px', background: t.SUBTLE, borderRadius: 6,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>予定合計</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
              {totalPlanned.toFixed(0)}<span style={{ fontSize: 10, color: t.MUTED, fontWeight: 400, marginLeft: 2 }}>h</span>
            </div>
          </div>
        </div>
      </div>
      {completed.length === 0 ? (
        <div style={{
          margin: '14px 20px', padding: '60px 20px', textAlign: 'center',
          background: t.CARD, border: `1px dashed ${t.BORDER}`, borderRadius: 10,
          color: t.MUTED, fontSize: 12,
        }}>
          完了案件はまだありません。<br/>
          <span style={{ fontSize: 11 }}>案件名横のゴミ箱アイコン → 「完了にする」、または案件編集のステータスから変更できます。</span>
        </div>
      ) : (
        <V4Timeline t={t} store={filteredStore} dayW={dayW}
          monthOffset={monthOffset} setMonthOffset={setMonthOffset}
          expanded={expanded} setExpanded={setExpanded}
          onEditSub={onEditSub} onEditProject={onEditProject} />
      )}
    </div>
  );
}

window.V4CompletedView = V4CompletedView;

// ============ 11. ToDo / ルーティン タブ切替と入力 ============
function loadTodoLists() {
  try {
    const raw = localStorage.getItem('todoLists');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return {
    todos: TODOS.map(t => ({ ...t })),
    routines: ROUTINES.map(r => ({ ...r })),
  };
}
function saveTodoLists(lists) {
  localStorage.setItem('todoLists', JSON.stringify(lists));
}

const _origTodos = window.V3Todos;
window.V3Todos = function V3TodosV5({ t }) {
  const [lists, setLists] = React.useState(loadTodoLists);
  const [tab, setTab] = React.useState('todos');
  const [input, setInput] = React.useState('');
  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);
  // Wクリックで編集する項目の id とドラフトテキスト
  const [editingId, setEditingId] = React.useState(null);
  const [editingText, setEditingText] = React.useState('');
  const items = lists[tab] || [];

  const persist = (next) => {
    setLists(next);
    saveTodoLists(next);
  };

  const addItem = () => {
    const text = input.trim();
    if (!text) return;
    const id = (tab === 'todos' ? 't' : 'r') + Date.now();
    const next = { ...lists, [tab]: [...items, { id, text, done: false }] };
    persist(next);
    setInput('');
  };

  const toggleItem = (id) => {
    const next = { ...lists, [tab]: items.map(i => i.id === id ? { ...i, done: !i.done } : i) };
    persist(next);
  };

  const deleteItem = (id) => {
    const next = { ...lists, [tab]: items.filter(i => i.id !== id) };
    persist(next);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };
  const commitEdit = () => {
    if (editingId == null) return;
    const text = editingText.trim();
    if (text) {
      persist({ ...lists, [tab]: items.map(i => i.id === editingId ? { ...i, text } : i) });
    }
    setEditingId(null);
    setEditingText('');
  };
  const cancelEdit = () => { setEditingId(null); setEditingText(''); };

  const reorder = (from, to) => {
    if (from === to) return;
    const arr = [...items];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    persist({ ...lists, [tab]: arr });
  };

  const Tab = ({ id, label, count }) => {
    const active = tab === id;
    return (
      <button onClick={() => setTab(id)} style={{
        padding: '4px 10px', borderRadius: 6, border: 'none',
        background: active ? t.TEXT : 'transparent',
        color: active ? (t.dark ? t.BG : 'white') : t.MUTED,
        fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {label}
        <span style={{
          background: active ? 'rgba(255,255,255,0.2)' : t.SUBTLE,
          color: active ? 'inherit' : t.MUTED,
          padding: '0px 5px', borderRadius: 3, fontSize: 9, fontWeight: 600,
        }}>{count}</span>
      </button>
    );
  };

  return (
    <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <Tab id="todos" label="ToDos" count={lists.todos.length} />
        <Tab id="routines" label="ルーティン" count={lists.routines.length} />
      </div>
      <div style={{ flex: 1 }}>
        {items.length === 0 ? (
          <div style={{
            padding: '18px 10px', textAlign: 'center', fontSize: 11, color: t.MUTED,
            border: `1px dashed ${t.BORDER}`, borderRadius: 6, marginBottom: 8,
          }}>
            {tab === 'todos' ? 'ToDoはまだありません' : 'ルーティンはまだありません'}
          </div>
        ) : items.map((item, i) => {
          const isEditing = editingId === item.id;
          return (
          <div key={item.id}
            draggable={!isEditing}
            onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
            onDragLeave={() => { if (overIdx === i) setOverIdx(null); }}
            onDrop={(e) => { e.preventDefault(); if (dragIdx != null) reorder(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 2px', fontSize: 12,
              color: item.done ? t.MUTED : t.TEXT,
              opacity: dragIdx === i ? 0.4 : 1,
              borderTop: overIdx === i && dragIdx != null && dragIdx !== i ? `2px solid ${t.ACCENT}` : '2px solid transparent',
              cursor: isEditing ? 'text' : 'grab',
            }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
              <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
            </svg>
            <button onClick={() => toggleItem(item.id)} style={{
              width: 14, height: 14, borderRadius: 4,
              border: `1.5px solid ${item.done ? t.ACCENT : t.BORDER}`,
              background: item.done ? t.ACCENT : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0, flexShrink: 0,
            }}>
              {item.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="m5 12 5 5L20 7"/></svg>}
            </button>
            {isEditing ? (
              <input autoFocus value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                  else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                }}
                style={{
                  flex: 1, padding: '2px 6px', border: `1px solid ${t.ACCENT}`, borderRadius: 4,
                  background: t.BG, color: t.TEXT, fontSize: 12, fontFamily: 'inherit', outline: 'none',
                }} />
            ) : (
              <span
                onDoubleClick={() => startEdit(item)}
                title="ダブルクリックで編集"
                style={{
                  flex: 1, textDecoration: item.done ? 'line-through' : 'none',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  userSelect: 'none',
                }}>{item.text}</span>
            )}
            <button onClick={() => deleteItem(item.id)} title="削除" style={{
              width: 18, height: 18, border: 'none', background: 'transparent',
              color: t.MUTED, cursor: 'pointer', borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0.5,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${t.BORDER}` }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
          placeholder={tab === 'todos' ? '新しいToDo (Enter で追加)' : '新しいルーティン (Enter で追加)'}
          style={{
            flex: 1, padding: '6px 10px', border: `1px solid ${t.BORDER}`, borderRadius: 6,
            background: t.SUBTLE, color: t.TEXT, fontSize: 11,
            fontFamily: 'inherit', outline: 'none',
          }} />
        <button onClick={addItem} disabled={!input.trim()} style={{
          padding: '6px 10px', border: 'none', borderRadius: 6,
          background: input.trim() ? t.ACCENT : t.SUBTLE,
          color: input.trim() ? 'white' : t.MUTED,
          fontSize: 11, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default',
          fontFamily: 'inherit',
        }}>追加</button>
      </div>
    </div>
  );
};

// ============ 9. V3TypeAverages を完了案件ベースで算出 ============
const _origTypeAverages = window.V3TypeAverages;
window.V3TypeAverages = function V3TypeAveragesV5({ t, store, selectedType, setSelectedType, logs }) {
  const typesStore = (store && store.types) || PROJECT_TYPES;
  const projectsAll = (store && store.projects) || PROJECTS;
  const completedAll = projectsAll.filter(p => (p.boardStatus || computedBoardStatus(p)) === 'done');
  const completedOfType = completedAll.filter(p => p.typeId === selectedType);
  const projectsOfType = projectsAll.filter(p => p.typeId === selectedType);

  // 集計の取り方
  // - logs (期間フィルタ済み) があれば: 期間内に作業ログがある対象タイプの案件 ×工程ごとに sum/count → 平均
  // - 無ければ従来通り: 完了案件のみ pr.actualH ベース
  const useLogs = Array.isArray(logs);
  const sumByType = {};
  const countByType = {};
  if (useLogs) {
    const projIdsInRange = new Set();
    const projIdsHasType = {}; // procType -> Set(projectId)
    const typeIdSet = new Set(projectsOfType.map(p => p.id));
    logs.forEach(l => {
      if (!typeIdSet.has(l.projectId)) return;
      projIdsInRange.add(l.projectId);
      if (!projIdsHasType[l.type]) projIdsHasType[l.type] = new Set();
      projIdsHasType[l.type].add(l.projectId);
      sumByType[l.type] = (sumByType[l.type] || 0) + (Number(l.hours) || 0);
    });
    Object.keys(projIdsHasType).forEach(k => {
      countByType[k] = projIdsHasType[k].size;
    });
  } else {
    completedOfType.forEach(p => {
      p.processes.forEach(pr => {
        sumByType[pr.type] = (sumByType[pr.type] || 0) + pr.actualH;
        countByType[pr.type] = (countByType[pr.type] || 0) + 1;
      });
    });
  }
  const avg = {};
  Object.keys(sumByType).forEach(k => {
    avg[k] = countByType[k] > 0 ? sumByType[k] / countByType[k] : 0;
  });

  // データが無ければ参考用デフォルト
  const hasData = Object.keys(avg).length > 0;
  const displayAvg = hasData ? avg : (TYPE_PROCESS_AVG[selectedType] || {});
  const types = Object.keys(displayAvg);
  const maxV = Math.max(...types.map(k => displayAvg[k]), 0.01);
  const total = types.reduce((s, k) => s + displayAvg[k], 0);
  const typeInfo = typesStore[selectedType] || PROJECT_TYPES[selectedType];

  return (
    <div style={{
      margin: '0 20px 14px', background: t.CARD,
      border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>案件タイプ別 · 工程平均作業時間</div>
          <div style={{ fontSize: 11, color: t.MUTED, marginTop: 2 }}>
            {hasData
              ? `完了案件 ${completedOfType.length} 件の実績から算出。見積もり時の参考に。`
              : '完了案件が未登録のため参考値を表示中（案件編集からステータスを「完了」にすると実績ベースに切り替わります）。'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.values(typesStore).map(ty => {
            const active = ty.id === selectedType;
            const tc = typeColor(ty);
            return (
              <button key={ty.id} onClick={() => setSelectedType(ty.id)} style={{
                padding: '5px 10px', borderRadius: 6,
                border: `1px solid ${active ? tc : t.BORDER}`,
                background: active ? `${tc}15` : t.CARD,
                color: active ? tc : t.MUTED,
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: tc }} />
                {ty.name}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 24 }}>
        <div>
          {types.length === 0 && (
            <div style={{
              padding: '20px 14px', textAlign: 'center', fontSize: 11, color: t.MUTED,
              border: `1px dashed ${t.BORDER}`, borderRadius: 6,
            }}>データなし</div>
          )}
          {types.map(k => {
            const v = displayAvg[k];
            const pct = (v / maxV) * 100;
            const hue = PROCESS_COLORS[k]?.hue ?? 220;
            const tone = window._v5Tone || 'pastel';
            // 工程平均バー: トーン別に優しめの配色をべた塗りで（旧: グラデーションの濃い側の値を採用）
            let barColor;
            if (tone === 'mono') {
              barColor = t.dark ? `hsl(${hue} 8% 52%)` : `hsl(${hue} 12% 72%)`;
            } else if (tone === 'vivid') {
              barColor = t.dark ? `hsl(${hue} 80% 58%)` : `hsl(${hue} 70% 62%)`;
            } else {
              barColor = t.dark ? `hsl(${hue} 40% 55%)` : `hsl(${hue} 45% 76%)`;
            }
            return (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: processColor(k, 'solid', t.dark ? 'dark' : 'light') }} />
                    <span style={{ fontSize: 11.5, color: t.TEXT, fontWeight: 500 }}>{PROCESS_COLORS[k]?.name || k}</span>
                  </div>
                  <span style={{ fontSize: 11, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', fontWeight: 600 }}>
                    {v.toFixed(1)}<span style={{ fontSize: 9, color: t.MUTED, fontWeight: 400 }}>h / 案件</span>
                  </span>
                </div>
                <div style={{ height: 8, background: t.SUBTLE, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: barColor,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '12px 14px', background: t.SUBTLE, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: typeInfo ? typeColor(typeInfo) : t.ACCENT }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT }}>{typeInfo?.name || selectedType}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.MUTED, marginBottom: 2 }}>
              {useLogs ? '平均合計（期間内）' : (hasData ? '平均合計（完了案件）' : '平均合計（参考値）')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', letterSpacing: 0 }}>
              {total.toFixed(1)}<span style={{ fontSize: 11, color: t.MUTED, marginLeft: 3 }}>h / 件</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.MUTED, marginBottom: 2 }}>{useLogs ? '期間内に作業 / 該当案件' : '完了 / 該当案件'}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.TEXT }}>
              {useLogs
                ? (Math.max(...Object.values(countByType), 0))
                : completedOfType.length}
              <span style={{ fontSize: 10, color: t.MUTED, fontWeight: 400 }}> / {projectsOfType.length}件</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ 12. アプリ設定 (サイドバーラベル切替など) ============
function loadAppSettings() {
  try { return JSON.parse(localStorage.getItem('appSettings') || '{}'); }
  catch (e) { return {}; }
}
function saveAppSettings(next) {
  localStorage.setItem('appSettings', JSON.stringify(next));
  window.dispatchEvent(new Event('appsettings-change'));
}
function useAppSettings() {
  const [s, setS] = React.useState(() => ({ sidebarLabelMode: 'type', ...loadAppSettings() }));
  React.useEffect(() => {
    const h = () => setS({ sidebarLabelMode: 'type', ...loadAppSettings() });
    window.addEventListener('appsettings-change', h);
    return () => window.removeEventListener('appsettings-change', h);
  }, []);
  return s;
}

// ===== データ管理セクション (エクスポート / インポート / リセット) =====
// 設定 > プライバシー: 画面共有時に案件名をダミーへ置換するモード
function V5PrivacyBody({ t, store }) {
  const on = !!store?.dummyMode;
  const toggle = () => store?.setDummyMode && store.setDummyMode(!on);
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT, marginBottom: 4 }}>プライバシー</div>
      <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 14 }}>
        画面共有や配信のときに、表示上の案件名を一時的に置き換えるモードです。
      </div>
      <div style={{
        border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: 14,
        background: t.CARD,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>プライバシーモード</div>
            <div style={{ fontSize: 11, color: t.MUTED, lineHeight: 1.55 }}>
              ON にすると、すべての案件名を「案件サンプル1〜」に置き換えて表示します。<br />
              <span style={{ color: t.TEXT, fontWeight: 500 }}>実データは変更されません。</span>OFF にすると元の案件名に戻ります。
            </div>
          </div>
          <button onClick={toggle}
            title={on ? 'OFF にする' : 'ON にする'}
            style={{
              flexShrink: 0, width: 44, height: 24, borderRadius: 12, border: 'none',
              background: on ? t.ACCENT : t.SUBTLE,
              cursor: 'pointer', position: 'relative', transition: 'background 0.15s',
            }}>
            <div style={{
              position: 'absolute', top: 2, left: on ? 22 : 2,
              width: 20, height: 20, borderRadius: '50%', background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s',
            }} />
          </button>
        </div>
        {on && (
          <div style={{
            marginTop: 12, padding: '8px 10px', borderRadius: 6,
            background: `${t.ACCENT}10`, border: `1px solid ${t.ACCENT}33`,
            fontSize: 11, color: t.TEXT, lineHeight: 1.5,
          }}>
            🔒 現在 <strong>プライバシーモード ON</strong>。画面上の案件名はダミー表示になっています。
          </div>
        )}
      </div>
    </div>
  );
}
window.V5PrivacyBody = V5PrivacyBody;

// グリーティングアイコン: localStorage に Base64 データURL + 背景色モードを保存
const GREETING_ICON_KEY = 'v5.greetingIcon';
const GREETING_ICON_BG_KEY = 'v5.greetingIconBg';
function loadGreetingIcon() {
  try { return localStorage.getItem(GREETING_ICON_KEY) || null; }
  catch (e) { return null; }
}
function loadGreetingIconBg() {
  try { return localStorage.getItem(GREETING_ICON_BG_KEY) || 'accent'; }
  catch (e) { return 'accent'; }
}
function saveGreetingIcon(dataUrl, bg) {
  try {
    if (dataUrl) localStorage.setItem(GREETING_ICON_KEY, dataUrl);
    else localStorage.removeItem(GREETING_ICON_KEY);
    if (bg) localStorage.setItem(GREETING_ICON_BG_KEY, bg);
    window.dispatchEvent(new Event('greetingicon-change'));
  } catch (e) { /* quota etc */ }
}
// グリーティングアイコンの背景色を解決して返す
window.resolveGreetingIconBg = function resolveGreetingIconBg(t, bg) {
  if (bg === 'white') return '#ffffff';
  // 'accent' or default
  return `linear-gradient(135deg, ${t.ACCENT}, ${t.ACCENT}cc)`;
};
window.useGreetingIcon = function useGreetingIcon() {
  const [icon, setIcon] = React.useState(() => ({ url: loadGreetingIcon(), bg: loadGreetingIconBg() }));
  React.useEffect(() => {
    const h = () => setIcon({ url: loadGreetingIcon(), bg: loadGreetingIconBg() });
    window.addEventListener('greetingicon-change', h);
    return () => window.removeEventListener('greetingicon-change', h);
  }, []);
  return icon;
};

// ホーム画面アイコンのアップロード + トリミング エディタ。
// 200x200 の正方フレーム内で画像をドラッグ移動 + ズームスライダーで調整、保存時に 96x96 PNG へ書き出す。
function V5GreetingIconEditor({ t, onClose, onSaved }) {
  const FRAME = 200;
  const OUTPUT = 96;
  const PREVIEW = 60;
  const fileRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const [imgSrc, setImgSrc] = React.useState(null); // ファイルから読み込んだ data URL
  const [imgDim, setImgDim] = React.useState({ w: 0, h: 0 }); // 元画像のピクセル
  // 画像の表示状態: scale (倍率) と translate (フレーム左上から見た画像左上の位置)
  const [scale, setScale] = React.useState(1);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const [bg, setBg] = React.useState(() => loadGreetingIconBg()); // 'accent' | 'white'

  // 画像が小さくフレーム内に収まる場合は自由配置、フレームを覆っている場合はカバーを保つ
  const clamp = (nx, ny, sc, dim) => {
    if (!dim.w) return [nx, ny];
    const dispW = dim.w * sc;
    const dispH = dim.h * sc;
    let cx, cy;
    if (dispW >= FRAME) {
      // 横方向: フレームを覆うようクランプ (tx は負か 0)
      cx = Math.min(0, Math.max(FRAME - dispW, nx));
    } else {
      // 横方向: フレーム内に収まる範囲で自由配置 (tx は 0 〜 FRAME-dispW)
      cx = Math.max(0, Math.min(FRAME - dispW, nx));
    }
    if (dispH >= FRAME) {
      cy = Math.min(0, Math.max(FRAME - dispH, ny));
    } else {
      cy = Math.max(0, Math.min(FRAME - dispH, ny));
    }
    return [cx, cy];
  };

  const pickFile = () => fileRef.current?.click();
  const onPickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const url = r.result;
      const im = new Image();
      im.onload = () => {
        setImgSrc(url);
        const dim = { w: im.naturalWidth, h: im.naturalHeight };
        setImgDim(dim);
        // 初期スケール: 画像全体がフレームに収まる「フィット」サイズ (Math.min)
        // 透過 PNG で余白を取りたいケースに優しくする
        const fitScale = Math.min(FRAME / dim.w, FRAME / dim.h);
        setScale(fitScale);
        // 中央寄せ
        setTx((FRAME - dim.w * fitScale) / 2);
        setTy((FRAME - dim.h * fitScale) / 2);
      };
      im.src = url;
    };
    r.readAsDataURL(f);
    e.target.value = '';
  };

  const onMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startTx = tx, startTy = ty;
    const onMove = (ev) => {
      const nx = startTx + (ev.clientX - startX);
      const ny = startTy + (ev.clientY - startY);
      const [cx, cy] = clamp(nx, ny, scale, imgDim);
      setTx(cx); setTy(cy);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // 縮小範囲を広げる: フィットの 30% まで小さくできる (透過 PNG に余白を作りたいケース)
  const fitScale = imgDim.w > 0 ? Math.min(FRAME / imgDim.w, FRAME / imgDim.h) : 1;
  const minScale = fitScale * 0.3;
  const maxScale = Math.max(fitScale * 4, fitScale + 0.01);

  const onScale = (next) => {
    if (!imgDim.w) return;
    // 中心保持でスケール変更
    const cx = (FRAME / 2 - tx) / scale;
    const cy = (FRAME / 2 - ty) / scale;
    const nx = FRAME / 2 - cx * next;
    const ny = FRAME / 2 - cy * next;
    const [ex, ey] = clamp(nx, ny, next, imgDim);
    setScale(next); setTx(ex); setTy(ey);
  };

  const save = () => {
    if (!imgSrc) return;
    const im = new Image();
    im.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT; canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d');
      // 出力時も背景色を焼き込む (transparent PNG + 白 / accent 背景の場合に正しく見せる)
      if (bg === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      } else if (bg === 'accent') {
        // accent はテーマ依存なので、ここでは描画せず表示時に CSS で適用する。
        // (画像を保存したテーマと表示するテーマが違う場合に追従するため)
      }
      // 表示状態に応じて画像を OUTPUT に書き出す
      const ratio = OUTPUT / FRAME;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(im,
        0, 0, im.naturalWidth, im.naturalHeight,
        tx * ratio, ty * ratio, im.naturalWidth * scale * ratio, im.naturalHeight * scale * ratio
      );
      const dataUrl = canvas.toDataURL('image/png');
      saveGreetingIcon(dataUrl, bg);
      onSaved && onSaved();
      onClose();
    };
    im.src = imgSrc;
  };

  // 背景色のプレビュー用 CSS
  const bgStyle = bg === 'white'
    ? '#ffffff'
    : `linear-gradient(135deg, ${t.ACCENT}, ${t.ACCENT}cc)`;

  return (
    <ModalShell t={t} title="ホーム画面アイコンの編集" onClose={onClose} width={520}>
      <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 14, lineHeight: 1.55 }}>
        画像をアップロードし、フレーム内をドラッグして位置を、スライダーでサイズを調整してください。
      </div>

      {!imgSrc ? (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          border: `1.5px dashed ${t.BORDER}`, borderRadius: 8, background: t.SUBTLE,
        }}>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onPickFile} style={{ display: 'none' }} />
          <button onClick={pickFile} style={buttonStyle(t, 'primary')}>画像を選択...</button>
          <div style={{ fontSize: 10, color: t.MUTED, marginTop: 10 }}>
            PNG / JPG / WebP / GIF
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* 編集フレーム: 背景色も適用してプレビュー */}
            <div ref={containerRef}
              onMouseDown={onMouseDown}
              style={{
                width: FRAME, height: FRAME, position: 'relative', overflow: 'hidden',
                borderRadius: 12, background: bgStyle, cursor: 'grab',
                border: `1px solid ${t.BORDER}`, flexShrink: 0,
                userSelect: 'none',
              }}>
              <img src={imgSrc} alt=""
                draggable={false}
                style={{
                  position: 'absolute', left: 0, top: 0,
                  width: imgDim.w, height: imgDim.h,
                  transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                  transformOrigin: '0 0',
                  pointerEvents: 'none',
                }} />
            </div>

            {/* 横の操作 + プレビュー */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: t.MUTED, marginBottom: 6, fontWeight: 600 }}>サイズ</div>
                <input type="range" min={minScale} max={maxScale} step={0.01} value={scale}
                  onChange={(e) => onScale(Number(e.target.value))}
                  style={{ width: '100%', accentColor: t.ACCENT }} />
                <div style={{ fontSize: 9, color: t.MUTED, marginTop: 4, lineHeight: 1.5 }}>
                  最小まで縮めると画像の周りに余白ができます（透過 PNG 用）
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.MUTED, marginBottom: 6, fontWeight: 600 }}>背景色</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { id: 'accent', label: 'アクセント' },
                    { id: 'white',  label: '白' },
                  ].map(opt => {
                    const active = bg === opt.id;
                    const previewBg = opt.id === 'white'
                      ? '#ffffff'
                      : `linear-gradient(135deg, ${t.ACCENT}, ${t.ACCENT}cc)`;
                    return (
                      <button key={opt.id} onClick={() => setBg(opt.id)} style={{
                        flex: 1, padding: '6px 10px', fontSize: 11, fontWeight: 600,
                        border: `1px solid ${active ? t.ACCENT : t.BORDER}`,
                        background: active ? `${t.ACCENT}14` : t.CARD,
                        color: active ? t.ACCENT : t.TEXT,
                        borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{
                          width: 14, height: 14, borderRadius: 4,
                          background: previewBg, border: `1px solid ${t.BORDER}`, flexShrink: 0,
                        }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.MUTED, marginBottom: 6, fontWeight: 600 }}>プレビュー</div>
                <div style={{
                  width: PREVIEW, height: PREVIEW, borderRadius: 14, overflow: 'hidden',
                  background: bgStyle, border: `1px solid ${t.BORDER}`,
                }}>
                  <div style={{ position: 'relative', width: PREVIEW, height: PREVIEW, overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0,
                      width: FRAME, height: FRAME, transform: `scale(${PREVIEW / FRAME})`, transformOrigin: '0 0',
                    }}>
                      <img src={imgSrc} alt="" draggable={false} style={{
                        position: 'absolute', left: 0, top: 0,
                        width: imgDim.w, height: imgDim.h,
                        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                        transformOrigin: '0 0',
                        pointerEvents: 'none',
                      }} />
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={pickFile} style={{
                padding: '6px 12px', fontSize: 11, fontWeight: 500,
                border: `1px dashed ${t.BORDER}`, background: 'transparent',
                color: t.MUTED, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              }}>別の画像を選択...</button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onPickFile} style={{ display: 'none' }} />
            </div>
          </div>
        </>
      )}

      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        marginTop: 18, paddingTop: 14, borderTop: `1px solid ${t.BORDER}`,
      }}>
        <button onClick={onClose} style={buttonStyle(t, 'ghost')}>キャンセル</button>
        <button onClick={save} disabled={!imgSrc} style={{
          ...buttonStyle(t, 'primary'),
          opacity: imgSrc ? 1 : 0.4,
          cursor: imgSrc ? 'pointer' : 'default',
        }}>保存</button>
      </div>
    </ModalShell>
  );
}
window.V5GreetingIconEditor = V5GreetingIconEditor;

// 設定 → ホーム画面: グリーティングアイコンの管理
function V5HomeSettingsBody({ t }) {
  const greeting = window.useGreetingIcon ? window.useGreetingIcon() : { url: null, bg: 'accent' };
  const icon = greeting.url;
  const [editorOpen, setEditorOpen] = React.useState(false);
  const clear = () => {
    if (confirm('アップロードした画像を削除してデフォルト (☕) に戻しますか？')) {
      saveGreetingIcon(null, 'accent');
    }
  };
  const bgValue = window.resolveGreetingIconBg
    ? window.resolveGreetingIconBg(t, greeting.bg)
    : `linear-gradient(135deg, ${t.ACCENT}, ${t.ACCENT}cc)`;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT, marginBottom: 4 }}>ホーム画面</div>
      <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 14 }}>
        ダッシュボード上部のグリーティングに表示するアイコンを設定します。
        <span style={{ display: 'block', marginTop: 4, fontSize: 10 }}>
          ※ グリーティングのアイコンを<strong>ダブルクリック</strong>でも編集モーダルを開けます。
        </span>
      </div>

      <div style={{
        border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: 14,
        background: t.CARD, display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 14,
          background: bgValue,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 30, overflow: 'hidden', flexShrink: 0,
          border: greeting.bg === 'white' ? `1px solid ${t.BORDER}` : 'none',
        }}>
          {icon
            ? <img src={icon} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '☕'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT, marginBottom: 2 }}>
            グリーティングアイコン
          </div>
          <div style={{ fontSize: 10, color: t.MUTED }}>
            {icon ? `カスタム画像 (背景: ${greeting.bg === 'white' ? '白' : 'アクセント'})` : 'デフォルト (☕)'}
          </div>
        </div>
        <button onClick={() => setEditorOpen(true)} style={buttonStyle(t, 'primary')}>
          {icon ? '変更...' : 'アップロード...'}
        </button>
        {icon && (
          <button onClick={clear} style={{
            padding: '6px 10px', fontSize: 11, fontWeight: 500,
            border: `1px solid ${t.BORDER}`, background: 'transparent',
            color: t.MUTED, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
          }}>クリア</button>
        )}
      </div>

      {editorOpen && <V5GreetingIconEditor t={t} onClose={() => setEditorOpen(false)} />}
    </div>
  );
}
window.V5HomeSettingsBody = V5HomeSettingsBody;

function V5DataManageBody({ t, store }) {
  const [msg, setMsg] = React.useState(null);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const fileRef = React.useRef(null);

  const exportNow = () => {
    try {
      const data = window.v5Migration.exportV5Data();
      const text = JSON.stringify(data, null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const today = new Date();
      const ymd = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `scheduler-v5-backup-${ymd}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: 'エクスポートしました' });
    } catch (e) {
      setMsg({ ok: false, text: 'エクスポート失敗: ' + e.message });
    }
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        const result = window.v5Migration.importAnyFormat(json);
        if (result.mode === 'old') {
          const s = result.stats;
          setMsg({
            ok: true,
            text: `旧形式から変換しました (案件:${s.projectCount} / 作業記録:${s.logCount || 0} / カスタム工程:${s.customProcessCount} / 休日:${s.holidayCount} / ToDo:${s.todoCount} / ルーティン:${s.routineCount})。リロードします...`,
          });
        } else {
          setMsg({ ok: true, text: 'v5 形式でインポートしました。リロードします...' });
        }
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setMsg({ ok: false, text: 'インポート失敗: ' + err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const doReset = () => {
    // v5 系の localStorage をすべて削除してデモデータへ戻す
    const keys = [
      'v5.store', 'v5.colorSettings', 'v5.customProcesses', 'v5.checklistTemplate',
      'v5.userThemes', 'v5.cardSize', 'v5.cardChecklistExpandAll', 'v5.summaryFilter',
      'v5.workHours', 'v5.projectExpanded', 'v5.themeId', 'customHolidays', 'pomoSettings',
      'v5.pomoPresets', 'v5.pomoPresetId', 'v5.kanbanOrder', 'v5.dummyMode',
      'v5.greetingIcon', 'v5.greetingIconBg', 'v5.demoSeed',
      'appTitle', 'appSettings', 'todoLists', 'cellMemos', 'subLabels',
    ];
    keys.forEach(k => localStorage.removeItem(k));
    setMsg({ ok: true, text: 'リセットしました。リロードします...' });
    setTimeout(() => window.location.reload(), 800);
  };

  const box = {
    border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: 14, marginBottom: 12,
    background: t.CARD,
  };
  const btn = (variant = 'default') => ({
    padding: '8px 14px', borderRadius: 7, border: `1px solid ${t.BORDER}`,
    background: variant === 'danger' ? '#ef4444' : variant === 'primary' ? t.ACCENT : t.CARD,
    color: variant === 'default' ? t.TEXT : 'white',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT, marginBottom: 4 }}>データ管理</div>
      <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 14 }}>
        アプリ内のデータをファイルに書き出したり、バックアップから復元します。旧アプリ (scheduler-electron) のバックアップ JSON も自動で変換して取り込めます。
      </div>

      <div style={box}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>エクスポート</div>
        <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 10 }}>
          すべての案件・設定・ToDo を JSON ファイルとしてダウンロードします。
        </div>
        <button onClick={exportNow} style={btn('primary')}>JSON をダウンロード</button>
      </div>

      <div style={box}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>インポート</div>
        <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 10 }}>
          バックアップ JSON を読み込みます。v5 / 旧形式のどちらも自動判定して取り込みます。<br />
          <span style={{ color: '#ef4444' }}>※ 現在のデータは上書きされます。先にエクスポートで退避することを推奨します。</span>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onPickFile} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} style={btn('default')}>ファイルを選択...</button>
      </div>

      <div style={box}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#dc2626' }}>全データをリセット</div>
        <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 10, lineHeight: 1.55 }}>
          案件・作業記録・各種設定をすべて消去します。<br />
          事前にエクスポートで退避することをおすすめします。
        </div>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} style={{
            padding: '8px 14px', borderRadius: 7,
            border: `1px solid ${t.dark ? '#f87171' : '#dc2626'}`,
            background: 'transparent',
            color: t.dark ? '#f87171' : '#dc2626',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>リセット...</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>本当にリセットしますか？（取り消せません）</span>
            <button onClick={doReset} style={btn('danger')}>はい、消去する</button>
            <button onClick={() => setConfirmReset(false)} style={btn('default')}>キャンセル</button>
          </div>
        )}
      </div>

      {msg && (
        <div style={{
          marginTop: 8, padding: '10px 12px', borderRadius: 6,
          background: msg.ok ? '#d1fae5' : '#fee2e2',
          color: msg.ok ? '#065f46' : '#991b1b',
          fontSize: 11,
        }}>{msg.text}</div>
      )}
    </div>
  );
}

function V5SettingsModal({ t, store, themeId, setThemeId, onClose, initialSection }) {
  const [section, setSection] = React.useState(initialSection || 'types');

  // セクションを意味でグループ化して sidebar に区切り線 + 小ラベルで表示
  // 旧: 案件の表示形式（タイプchip + 末尾締切で固定したため設定削除）
  //     テーマ作成（テーマピッカーの「+ 新しいテーマを作成」から専用モーダルへ移動）
  const sectionGroups = [
    {
      label: '案件・工程',
      items: [
        { id: 'types',     label: '案件タイプ設定', hint: 'タイプ名と工程セット' },
        { id: 'colors',    label: '案件・工程カラー', hint: '全体の色調と個別色相' },
        { id: 'checklist', label: '事務チェック',   hint: '新規案件テンプレート' },
      ],
    },
    {
      label: '作業',
      items: [
        { id: 'hours', label: '作業時間', hint: '平日/休日の1日の目安' },
      ],
    },
    {
      label: 'その他',
      items: [
        { id: 'home',    label: 'ホーム画面',   hint: 'グリーティングアイコン' },
        { id: 'privacy', label: 'プライバシー', hint: '画面共有時の表示切替' },
        { id: 'data',    label: 'データ管理',   hint: 'エクスポート / インポート' },
      ],
    },
  ];

  const TypesBody = window.V4TypeEditorBody;
  const ColorsBody = window.V5ColorCustomizerBody;
  const ChecklistTemplateBody = window.V5ChecklistTemplateEditor;

  return (
    <ModalShell
      t={t}
      title="設定"
      onClose={onClose}
      width={820}
      height={620}
      bodyScroll={false}
      footer={<button onClick={onClose} style={buttonStyle(t, 'primary')}>閉じる</button>}
    >
      {/* card に確定高さを与え (height=620, ただし --modal-max-h でクランプ)、
          bodyScroll=false で body wrapper を overflow hidden + flex column 化。
          グリッドは flex: 1 で body の確定高さを完全に受け取り、
          gridTemplateRows: minmax(0, 1fr) で行をその高さに固定 → カラム内 overflowY が機能。
          左右カラム独立スクロール: 文字拡大時に閉じるボタンや左ナビへの導線を保つ */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '170px 1fr', gridTemplateRows: 'minmax(0, 1fr)',
        gap: 16,
      }}>
        {/* 左: セクションナビ（グループ化）- 枠線は廃し、選択時のみ淡いアクセント塗り */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
          {sectionGroups.map((g, gi) => (
            <React.Fragment key={g.label}>
              <div style={{
                fontSize: 9.5, fontWeight: 600, color: t.MUTED,
                letterSpacing: 0.6, textTransform: 'uppercase',
                padding: gi === 0 ? '2px 10px 6px' : '14px 10px 6px', userSelect: 'none',
              }}>{g.label}</div>
              {g.items.map(sec => {
                const active = section === sec.id;
                return (
                  <button key={sec.id} onClick={() => setSection(sec.id)} style={{
                    padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                    border: 'none',
                    background: active ? `${t.ACCENT}15` : 'transparent',
                    color: active ? t.ACCENT : t.TEXT,
                    borderRadius: 7, fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = t.SUBTLE; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ fontSize: 12, fontWeight: active ? 600 : 500 }}>{sec.label}</span>
                    <span style={{ fontSize: 10, color: active ? t.ACCENT : t.MUTED, fontWeight: 400, opacity: active ? 0.85 : 1 }}>{sec.hint}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* 右: 選択されたセクションの内容（固定高内でスクロール） */}
        <div style={{ overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 }}>
          {section === 'hours' && store && (
            <V5WorkHoursBody t={t} store={store} />
          )}
          {section === 'types' && TypesBody && store && (
            <TypesBody t={t} store={store} />
          )}
          {section === 'types' && (!TypesBody || !store) && (
            <div style={{ padding: 20, fontSize: 11, color: t.MUTED }}>案件タイプ設定を読み込めませんでした。</div>
          )}
          {section === 'colors' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT, marginBottom: 4 }}>
                案件・工程カラー
              </div>
              <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 12 }}>
                全体の彩度・明度（共通）と、案件タイプ・工程ごとの色相を設定します。変更は全画面に即時反映されます。
              </div>
              {ColorsBody && <ColorsBody t={t} store={store} />}
            </div>
          )}
          {section === 'checklist' && ChecklistTemplateBody && <ChecklistTemplateBody t={t} />}
          {section === 'home' && <V5HomeSettingsBody t={t} />}
          {section === 'privacy' && <V5PrivacyBody t={t} store={store} />}
          {section === 'data' && <V5DataManageBody t={t} store={store} />}
        </div>
      </div>
    </ModalShell>
  );
}

window.loadAppSettings = loadAppSettings;
window.saveAppSettings = saveAppSettings;
window.useAppSettings = useAppSettings;
window.V5SettingsModal = V5SettingsModal;

// テーマ作成専用モーダル: V5ThemeCustomizerBody を ModalShell でラップ
// アクセス導線はテーマピッカードロップダウンの「+ 新しいテーマを作成」のみ
function V5ThemeCreatorModal({ t, themeId, setThemeId, onClose }) {
  const ThemesBody = window.V5ThemeCustomizerBody;
  return (
    <ModalShell t={t} title="テーマ作成" onClose={onClose} width={780}>
      {ThemesBody
        ? <ThemesBody t={t} themeId={themeId} setThemeId={setThemeId} />
        : <div style={{ padding: 20, fontSize: 11, color: t.MUTED }}>テーマ作成を読み込めませんでした。</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={buttonStyle(t, 'primary')}>閉じる</button>
      </div>
    </ModalShell>
  );
}
window.V5ThemeCreatorModal = V5ThemeCreatorModal;

// 設定モーダル: 作業時間セクション
function V5WorkHoursBody({ t, store }) {
  const wh = store.workHours || { weekdayHours: 4, holidayHours: 8 };
  const update = (patch) => store.setWorkHours && store.setWorkHours(patch);

  const HourInput = ({ label, field, value, hint }) => (
    <div style={{
      flex: 1, padding: 14, border: `1px solid ${t.BORDER}`, borderRadius: 10,
      background: t.CARD, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 11, color: t.MUTED, fontWeight: 600, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <input type="number" min={0} step={0.5} value={value}
          onChange={e => update({ [field]: Math.max(0, Number(e.target.value) || 0) })}
          style={{
            width: 72, padding: '6px 8px', border: `1px solid ${t.BORDER}`, borderRadius: 6,
            background: t.BG, color: t.TEXT, fontSize: 18, fontWeight: 600,
            fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
            textAlign: 'right',
          }} />
        <span style={{ fontSize: 11, color: t.MUTED }}>時間 / 日</span>
      </div>
      <div style={{ fontSize: 10, color: t.MUTED, lineHeight: 1.5 }}>{hint}</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT, marginBottom: 4 }}>
        作業時間の目安
      </div>
      <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 14, lineHeight: 1.6 }}>
        タイムラインのセルに工程を入れたとき、1セル分の予定作業時間を算出するための目安です。
        土日 + カレンダーで休日指定した日は「休日」扱いで計算されます。
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <HourInput label="平日" field="weekdayHours" value={wh.weekdayHours}
          hint="月〜金の、通常時の作業見込み時間" />
        <HourInput label="休日" field="holidayHours" value={wh.holidayHours}
          hint="土日 / カレンダーで休日指定した日の作業見込み時間" />
      </div>
      <div style={{
        padding: 12, background: t.SUBTLE, borderRadius: 8,
        fontSize: 11, color: t.MUTED, lineHeight: 1.7,
      }}>
        <div style={{ fontWeight: 600, color: t.TEXT, marginBottom: 4 }}>自動算出のしくみ</div>
        各工程の「予定時間」は、タイムラインに入力したセルごとに平日/休日の目安を足し合わせて計算されます。<br/>
        個別の工程で違う値を使いたい場合は、案件の詳細画面で予定時間欄の <b>鉛筆アイコン</b> を押すと手動上書きできます。
        <br/>手動値を解除すると、自動算出に戻ります。
      </div>
    </div>
  );
}
window.V5WorkHoursBody = V5WorkHoursBody;

// ============ 13. 案件別サマリー（工程を階層表示） ============
const SUMMARY_FILTER_KEY = 'v5.summary.filter';
function loadSummaryFilter() {
  try {
    const raw = JSON.parse(localStorage.getItem(SUMMARY_FILTER_KEY) || '{}');
    return { includeDone: false, includeTodo: true, ...raw };
  } catch (e) { return { includeDone: false, includeTodo: true }; }
}
function saveSummaryFilter(f) {
  localStorage.setItem(SUMMARY_FILTER_KEY, JSON.stringify(f));
}

function V5ProjectSummary({ t, store, maxHeight, logs }) {
  const [expanded, setExpanded] = React.useState({});
  const [filter, setFilter] = React.useState(loadSummaryFilter);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const filterRef = React.useRef(null);
  React.useEffect(() => {
    if (!filterOpen) return;
    const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [filterOpen]);
  const updateFilter = (patch) => {
    const next = { ...filter, ...patch };
    setFilter(next);
    saveSummaryFilter(next);
  };

  const projects = (store && store.projects) || PROJECTS;
  const statusOf = (p) => p.boardStatus || computedBoardStatus(p);
  // logs が渡されればログから集計 (期間フィルタ前提)、無ければ pr.actualH を使う
  const useLogs = Array.isArray(logs);
  const byProj = {};
  const byProjType = {};
  if (useLogs) {
    logs.forEach(l => {
      if (!l.projectId) return;
      const h = Number(l.hours) || 0;
      byProj[l.projectId] = (byProj[l.projectId] || 0) + h;
      const k = l.projectId + '::' + l.type;
      byProjType[k] = (byProjType[k] || 0) + h;
    });
  }
  const getProjectHours = (p) =>
    useLogs ? (byProj[p.id] || 0) : p.processes.reduce((s, pr) => s + pr.actualH, 0);
  const getProcessHours = (p, pr) =>
    useLogs ? (byProjType[p.id + '::' + pr.type] || 0) : pr.actualH;
  // 期間フィルタ時は「期間内に実績ゼロの案件」を非表示にする（さもないとリストが膨らむ）
  const visible = projects.filter(p => {
    const st = statusOf(p);
    if (st === 'done' && !filter.includeDone) return false;
    if (st === 'todo' && !filter.includeTodo) return false;
    if (useLogs && getProjectHours(p) <= 0) return false;
    return true;
  });
  const rows = visible.map(p => {
    const actual = getProjectHours(p);
    const planned = p.processes.reduce((s, pr) => s + pr.plannedH, 0);
    return { project: p, actual, planned };
  });
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const ff = '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif';

  return (
    <div style={{
      background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px',
      height: maxHeight || undefined,
      boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>案件別サマリー</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }} ref={filterRef}>
          <div style={{ fontSize: 10, color: t.MUTED }}>累計作業時間</div>
          <button onClick={() => setFilterOpen(v => !v)}
            title="表示する案件を絞り込む"
            style={{
              width: 22, height: 22, border: `1px solid ${filterOpen ? t.ACCENT : t.BORDER}`,
              background: filterOpen ? `${t.ACCENT}14` : t.CARD, borderRadius: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: filterOpen ? t.ACCENT : t.MUTED,
            }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
          </button>
          {filterOpen && (
            <div style={{
              position: 'absolute', top: 28, right: 0, zIndex: 10,
              background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 8,
              boxShadow: '0 8px 20px rgba(0,0,0,0.15)', padding: '10px 12px', minWidth: 180,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>表示する案件</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11, color: t.TEXT, cursor: 'pointer' }}>
                <input type="checkbox" checked={filter.includeDone}
                  onChange={e => updateFilter({ includeDone: e.target.checked })}
                  style={{ width: 14, height: 14, accentColor: t.ACCENT, flexShrink: 0, margin: 0 }} />
                完了済みを含む
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11, color: t.TEXT, cursor: 'pointer' }}>
                <input type="checkbox" checked={filter.includeTodo}
                  onChange={e => updateFilter({ includeTodo: e.target.checked })}
                  style={{ width: 14, height: 14, accentColor: t.ACCENT, flexShrink: 0, margin: 0 }} />
                未着手を含む
              </label>
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${t.BORDER}`, fontSize: 9.5, color: t.MUTED, lineHeight: 1.4 }}>
                進行中・レビュー待ちは常に表示
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginRight: -6, paddingRight: 4 }}>
      {rows.length === 0 && (
        <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 11, color: t.MUTED }}>
          条件に一致する案件がありません
        </div>
      )}
      {rows.map(({ project: p, actual, planned }) => {
        const pct = totalActual > 0 ? (actual / totalActual) * 100 : 0;
        // カードビューと揃えて案件タイプの色を使う（旧: 最上位工程の色）
        const ty = (store?.types?.[p.typeId]) || PROJECT_TYPES[p.typeId];
        const firstCol = ty ? typeColor(ty) : t.ACCENT;
        const isExp = !!expanded[p.id];
        return (
          <div key={p.id} style={{ marginBottom: 8 }}>
            <div onClick={() => setExpanded(x => ({ ...x, [p.id]: !x[p.id] }))}
              style={{ cursor: 'pointer', padding: '2px 0', userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, marginBottom: 4 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2.5" style={{
                  transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0,
                }}><path d="m9 18 6-6-6-6"/></svg>
                <span style={{ color: t.TEXT, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store?.displayName ? store.displayName(p) : p.name}</span>
                <span style={{ color: t.MUTED, fontFamily: ff, flexShrink: 0 }}>
                  {actual.toFixed(1)}<span style={{ fontSize: 9 }}>h</span>
                </span>
              </div>
              <div style={{ height: 5, background: t.SUBTLE, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: firstCol }} />
              </div>
            </div>
            {isExp && (
              <div style={{ paddingLeft: 13, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {p.processes.map(pr => {
                  const col = processColor(pr.type, 'solid', t.dark ? 'dark' : 'light');
                  const procActual = getProcessHours(p, pr);
                  const procPct = pr.plannedH > 0 ? Math.min(100, (procActual / pr.plannedH) * 100) : 0;
                  return (
                    <div key={pr.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px',
                      background: t.SUBTLE, borderRadius: 4,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: 2, background: col, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 10.5, color: t.TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {PROCESS_COLORS[pr.type]?.name || pr.type}
                      </span>
                      <div style={{ width: 40, height: 3, background: t.CARD, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${procPct}%`, background: col }} />
                      </div>
                      <span style={{ fontSize: 10, color: t.MUTED, fontFamily: ff, minWidth: 52, textAlign: 'right' }}>
                        {procActual.toFixed(1)}/{pr.plannedH}h
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// 案件別サマリー + 案件タイプ別・工程平均 を横並びで描画するラッパー
// V3TypeAverages 自身が `margin: '0 20px 14px'` を持つためネストでマージン相殺
function V5DashboardRow({ t, store, selectedType, setSelectedType, logs }) {
  const TypeAverages = window.V3TypeAverages;
  const rightRef = React.useRef(null);
  const [rightH, setRightH] = React.useState(null);
  React.useLayoutEffect(() => {
    if (!rightRef.current) return;
    // TypeAverages 本体（ラッパーの最初の子要素）の border-box を測る。
    // ラッパーの contentRect だと TypeAverages の margin-bottom が混じって +14px ズレる
    const measure = () => {
      const el = rightRef.current?.firstElementChild;
      if (el) setRightH(el.getBoundingClientRect().height);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rightRef.current);
    if (rightRef.current.firstElementChild) {
      ro.observe(rightRef.current.firstElementChild);
    }
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return (
    <div style={{
      margin: '0 20px 14px',
      display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12,
      alignItems: 'start',
    }}>
      <V5ProjectSummary t={t} store={store} maxHeight={rightH} logs={logs} />
      <div ref={rightRef} style={{ margin: '0 -20px -14px -20px' }}>
        <TypeAverages t={t} store={store} selectedType={selectedType} setSelectedType={setSelectedType} logs={logs} />
      </div>
    </div>
  );
}

window.V5ProjectSummary = V5ProjectSummary;
window.V5DashboardRow = V5DashboardRow;

// ============ 13.5 日別作業時間チャート（今週 月-日 / store.logs から実データ集計） ============
function V5DailyHoursChart({ t, store }) {
  const FF = '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif';
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  // render 時に再計算（モジュールロード時の TODAY が日付をまたいで stale になるのを防ぐ）
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  // 月曜起点でその週の月曜を求める（getDay: 0=日, 1=月, ..., 6=土）
  const dow = today.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysFromMon);
  const labels = ['月', '火', '水', '木', '金', '土', '日'];
  const todayKey = dateKey(today);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    return { date: d, key: dateKey(d), isToday: dateKey(d) === todayKey };
  });
  // 各ログの該当日付を求めて合算
  const logs = store?.logs || [];
  const sums = days.map(() => 0);
  logs.forEach(l => {
    let lk = l.date;
    if (!lk && l.createdAt) {
      const d = new Date(l.createdAt);
      if (!isNaN(d.getTime())) lk = dateKey(d);
    }
    if (!lk) return;
    const idx = days.findIndex(x => x.key === lk);
    if (idx >= 0) sums[idx] += Number(l.hours) || 0;
  });
  const weekData = sums.map(v => Math.round(v * 10) / 10);
  const totalWeek = weekData.reduce((a, b) => a + b, 0);
  const maxDay = Math.max(...weekData, 0.01);
  const fmtMD = (d) => `${d.getMonth()+1}/${pad(d.getDate())}`;
  const rangeLabel = `${weekStart.getFullYear()}/${pad(weekStart.getMonth()+1)}/${pad(weekStart.getDate())} - ${pad(days[6].date.getMonth()+1)}/${pad(days[6].date.getDate())}`;

  return (
    <div style={{ margin: '0 20px 14px', background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>日別作業時間</div>
          <div style={{ fontSize: 11, color: t.MUTED }}>
            今週合計 <span style={{ color: t.ACCENT, fontWeight: 700, fontFamily: FF }}>{totalWeek.toFixed(1)}<span style={{ fontSize: 9, marginLeft: 2 }}>h</span></span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: t.MUTED, fontFamily: FF }}>{rangeLabel}</div>
      </div>
      {/* バー高さ: 親に明示的な高さを与えて %を解決させる */}
      <div style={{ display: 'flex', gap: 10, height: 200, padding: '0 6px' }}>
        {weekData.map((v, i) => {
          const pct = (v / maxDay) * 100;
          const isToday = days[i].isToday;
          const minH = v > 0 ? 8 : 2;
          return (
            <div key={i} style={{
              flex: 1, height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'flex-end', gap: 6,
            }}>
              <div style={{
                width: '100%', height: `${pct}%`, minHeight: minH,
                background: v === 0 ? t.SUBTLE : isToday ? t.ACCENT : `${t.ACCENT}88`,
                borderRadius: '4px 4px 0 0',
                border: isToday ? `1px solid ${t.ACCENT}` : 'none',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: -18, left: 0, right: 0,
                  textAlign: 'center', fontSize: 10, fontWeight: 600,
                  color: v > 0 ? t.TEXT : t.MUTED, fontFamily: FF,
                }}>
                  {v > 0 ? `${v.toFixed(1)}h` : '-'}
                </div>
              </div>
              <div style={{ fontSize: 10, color: isToday ? t.ACCENT : t.MUTED, fontWeight: isToday ? 700 : 500 }}>
                {labels[i]}<span style={{ fontSize: 9, opacity: 0.55, marginLeft: 3, fontFamily: FF }}>{fmtMD(days[i].date)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
window.V5DailyHoursChart = V5DailyHoursChart;

// ============ 14. ToDo / ルーティンを個別ブロック化 ============
function useTodoLists() {
  const [lists, setLists] = React.useState(loadTodoLists);
  React.useEffect(() => {
    const h = () => setLists(loadTodoLists());
    window.addEventListener('todolists-change', h);
    return () => window.removeEventListener('todolists-change', h);
  }, []);
  const persist = (next) => {
    setLists(next);
    saveTodoLists(next);
    window.dispatchEvent(new Event('todolists-change'));
  };
  return [lists, persist];
}

function V5TodoListBlock({ t, mode, title, placeholder }) {
  const [lists, persist] = useTodoLists();
  const [input, setInput] = React.useState('');
  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);
  // Wクリックで編集する項目の id とドラフトテキスト
  const [editingId, setEditingId] = React.useState(null);
  const [editingText, setEditingText] = React.useState('');
  const items = lists[mode] || [];

  const addItem = () => {
    const text = input.trim();
    if (!text) return;
    const id = (mode === 'todos' ? 't' : 'r') + Date.now();
    persist({ ...lists, [mode]: [...items, { id, text, done: false }] });
    setInput('');
  };
  const toggleItem = (id) => {
    persist({ ...lists, [mode]: items.map(i => i.id === id ? { ...i, done: !i.done } : i) });
  };
  const deleteItem = (id) => {
    persist({ ...lists, [mode]: items.filter(i => i.id !== id) });
  };
  const reorder = (from, to) => {
    if (from === to) return;
    const arr = [...items];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    persist({ ...lists, [mode]: arr });
  };
  const startEdit = (item) => { setEditingId(item.id); setEditingText(item.text); };
  const commitEdit = () => {
    if (editingId == null) return;
    const text = editingText.trim();
    if (text) {
      persist({ ...lists, [mode]: items.map(i => i.id === editingId ? { ...i, text } : i) });
    }
    setEditingId(null); setEditingText('');
  };
  const cancelEdit = () => { setEditingId(null); setEditingText(''); };

  const doneCount = items.filter(i => i.done).length;

  return (
    <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>{title}</div>
        <div style={{ fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
          {doneCount}/{items.length}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {items.length === 0 ? (
          <div style={{
            padding: '18px 10px', textAlign: 'center', fontSize: 11, color: t.MUTED,
            border: `1px dashed ${t.BORDER}`, borderRadius: 6, marginBottom: 8,
          }}>{placeholder.empty}</div>
        ) : items.map((item, i) => {
          const isEditing = editingId === item.id;
          return (
          <div key={item.id}
            draggable={!isEditing}
            onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
            onDragLeave={() => { if (overIdx === i) setOverIdx(null); }}
            onDrop={(e) => { e.preventDefault(); if (dragIdx != null) reorder(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 2px', fontSize: 12,
              color: item.done ? t.MUTED : t.TEXT,
              opacity: dragIdx === i ? 0.4 : 1,
              borderTop: overIdx === i && dragIdx != null && dragIdx !== i ? `2px solid ${t.ACCENT}` : '2px solid transparent',
              cursor: isEditing ? 'text' : 'grab',
            }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
              <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
            </svg>
            <button onClick={() => toggleItem(item.id)} style={{
              width: 14, height: 14, borderRadius: 4,
              border: `1.5px solid ${item.done ? t.ACCENT : t.BORDER}`,
              background: item.done ? t.ACCENT : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0, flexShrink: 0,
            }}>
              {item.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="m5 12 5 5L20 7"/></svg>}
            </button>
            {isEditing ? (
              <input autoFocus value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                  else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                }}
                style={{
                  flex: 1, padding: '2px 6px', border: `1px solid ${t.ACCENT}`, borderRadius: 4,
                  background: t.BG, color: t.TEXT, fontSize: 12, fontFamily: 'inherit', outline: 'none',
                }} />
            ) : (
              <span
                onDoubleClick={() => startEdit(item)}
                title="ダブルクリックで編集"
                style={{
                  flex: 1, textDecoration: item.done ? 'line-through' : 'none',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  userSelect: 'none',
                }}>{item.text}</span>
            )}
            <button onClick={() => deleteItem(item.id)} title="削除" style={{
              width: 18, height: 18, border: 'none', background: 'transparent',
              color: t.MUTED, cursor: 'pointer', borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${t.BORDER}` }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
          placeholder={placeholder.input}
          style={{
            flex: 1, padding: '6px 10px', border: `1px solid ${t.BORDER}`, borderRadius: 6,
            background: t.SUBTLE, color: t.TEXT, fontSize: 11,
            fontFamily: 'inherit', outline: 'none',
          }} />
        <button onClick={addItem} disabled={!input.trim()} style={{
          padding: '6px 10px', border: 'none', borderRadius: 6,
          background: input.trim() ? t.ACCENT : t.SUBTLE,
          color: input.trim() ? 'white' : t.MUTED,
          fontSize: 11, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default',
          fontFamily: 'inherit',
        }}>追加</button>
      </div>
    </div>
  );
}

function V5TodosOnly({ t }) {
  return <V5TodoListBlock t={t} mode="todos" title="ToDo"
    placeholder={{ empty: 'ToDoはまだありません', input: '新しいToDo (Enter で追加)' }} />;
}
function V5RoutinesOnly({ t }) {
  return <V5TodoListBlock t={t} mode="routines" title="ルーティン"
    placeholder={{ empty: 'ルーティンはまだありません', input: '新しいルーティン (Enter で追加)' }} />;
}

window.V5TodosOnly = V5TodosOnly;
window.V5RoutinesOnly = V5RoutinesOnly;

// ============ 15. V4MiddleRow を [TodayLog | ToDo | ルーティン] に差し替え ============
// V4TodayLog は v4-report.jsx で定義され classic script のグローバルに存在する想定
const _origMiddleRow = window.V4MiddleRow;
window.V4MiddleRow = function V4MiddleRowV5({ t, store }) {
  const TodayLog = window.V4TodayLog || (typeof V4TodayLog !== 'undefined' ? V4TodayLog : null);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 12, padding: '0 20px 14px' }}>
      {TodayLog && <TodayLog t={t} store={store} />}
      <V5TodosOnly t={t} />
      <V5RoutinesOnly t={t} />
    </div>
  );
};

// ============ 17. 案件タイプ・工程カラー: 色相 (個別) + 全体彩度・明度 ============
const DEFAULT_HUES = { kozu: 50, color: 30, line: 350, seisho: 220, bg: 150, shiage: 280, jinbutsu: 10, design: 260, pers: 190 };
// 全体の彩度・明度のデフォルト。旧 'pastel' プリセット相当の値からスタート
const DEFAULT_GLOBAL_SAT = 60;
const DEFAULT_GLOBAL_LIGHT = 60;
function loadColorSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem('v5.colorSettings') || '{}');
    // 旧 tone プリセット → globalSat / globalLight にマッピングしてマイグレーション
    let gsat = (typeof raw.globalSat === 'number') ? raw.globalSat : null;
    let glit = (typeof raw.globalLight === 'number') ? raw.globalLight : null;
    if (gsat == null || glit == null) {
      const tone = raw.tone || 'pastel';
      if (tone === 'vivid') { gsat = gsat ?? 80; glit = glit ?? 55; }
      else if (tone === 'mono' || tone === 'one') {
        // 旧ワンカラーは raw.one.sat/light があればそれを採用
        const o = raw.one || {};
        gsat = gsat ?? (typeof o.sat === 'number' ? o.sat : 12);
        glit = glit ?? (typeof o.light === 'number' ? o.light : 55);
      } else {
        gsat = gsat ?? DEFAULT_GLOBAL_SAT;
        glit = glit ?? DEFAULT_GLOBAL_LIGHT;
      }
    }
    return {
      hues: { ...DEFAULT_HUES, ...(raw.hues || {}) },
      globalSat: gsat,
      globalLight: glit,
    };
  } catch (e) {
    return { hues: { ...DEFAULT_HUES }, globalSat: DEFAULT_GLOBAL_SAT, globalLight: DEFAULT_GLOBAL_LIGHT };
  }
}
function applyColorSettings(s) {
  Object.keys(s.hues).forEach(k => {
    if (PROCESS_COLORS[k]) PROCESS_COLORS[k].hue = s.hues[k];
  });
  window._v5GlobalSat = s.globalSat;
  window._v5GlobalLight = s.globalLight;
}
function saveColorSettings(next) {
  localStorage.setItem('v5.colorSettings', JSON.stringify(next));
  applyColorSettings(next);
  window.dispatchEvent(new Event('colorsettings-change'));
}
// 初期化時に保存値を反映
applyColorSettings(loadColorSettings());

// Paper テーマ: ネイティブ checkbox だと ON 時チェックマークがアクセントに対して黒描画になる (#e87a3e)
// appearance:none でカスタムスタイル → OFF 白背景 + ON 時 SVG で白チェックを描画。
(function injectPaperCheckboxStyle() {
  if (document.getElementById('v5-paper-checkbox-style')) return;
  const style = document.createElement('style');
  style.id = 'v5-paper-checkbox-style';
  style.textContent = `
html[data-theme="paper"] input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  border: 1.5px solid #c7c0b3;
  border-radius: 3px;
  background-color: #ffffff;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.12s, border-color 0.12s;
}
html[data-theme="paper"] input[type="checkbox"]:hover {
  border-color: #e87a3e;
}
html[data-theme="paper"] input[type="checkbox"]:checked {
  background-color: #e87a3e;
  border-color: #e87a3e;
  background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M13 4.5 6.5 11 3 7.5' stroke='white' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
}
html[data-theme="paper"] input[type="checkbox"]:focus-visible {
  outline: 2px solid #e87a3e66;
  outline-offset: 1px;
}
`;
  document.head.appendChild(style);
})();

// ===== カスタム工程 (ユーザー追加) =====
function loadCustomProcesses() {
  try { return JSON.parse(localStorage.getItem('v5.customProcesses') || '{}') || {}; }
  catch (e) { return {}; }
}
function saveCustomProcesses(obj) {
  localStorage.setItem('v5.customProcesses', JSON.stringify(obj));
}
// 起動時にカスタム工程を PROCESS_COLORS にマージ
Object.entries(loadCustomProcesses()).forEach(([k, v]) => {
  if (!PROCESS_COLORS[k]) PROCESS_COLORS[k] = v;
});
window.v5AddCustomProcess = function(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const key = 'custom_' + Date.now();
  // 既存色の hue を避けて未使用の色相を優先
  const hueCandidates = [50, 30, 350, 220, 150, 280, 10, 260, 190, 100, 330, 60, 200, 320, 170, 240];
  const used = new Set(Object.values(PROCESS_COLORS).map(p => p.hue));
  const hue = hueCandidates.find(h => !used.has(h)) ?? Math.floor(Math.random() * 360);
  const def = { name: trimmed, hue, label: key };
  PROCESS_COLORS[key] = def;
  const cur = loadCustomProcesses();
  cur[key] = def;
  saveCustomProcesses(cur);
  window.dispatchEvent(new Event('colorsettings-change'));
  return key;
};

// 全体彩度・明度から各モード (fill/border/solid/soft) の HSL 文字列を組み立てる共通関数
// hue: 0-359, baseSat: 0-100 (全体彩度), baseLight: 0-100 (全体明度)
// mode: 'fill' (薄い塗り) / 'border' (枠線) / 'solid' (代表色) / 'soft' (極薄背景)
function buildHslFromGlobal(hue, baseSat, baseLight, mode, theme) {
  // ライト/ダークそれぞれで baseLight からの相対オフセットでモードごとに段階差を作る
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const s = clamp(baseSat, 0, 100);
  const l = clamp(baseLight, 0, 100);
  if (theme === 'dark') {
    // ダークテーマ: 背景が暗いので fill は半透明、ボーダー/solid は明るめ
    if (mode === 'fill')   return `hsl(${hue} ${s}% ${clamp(l, 35, 65)}% / 0.28)`;
    if (mode === 'border') return `hsl(${hue} ${s}% ${clamp(l + 10, 30, 80)}%)`;
    if (mode === 'solid')  return `hsl(${hue} ${s}% ${clamp(l + 7, 30, 78)}%)`;
    if (mode === 'soft')   return `hsl(${hue} ${clamp(s - 20, 0, 100)}% ${clamp(l - 25, 8, 50)}%)`;
    return `hsl(${hue} ${s}% ${l}%)`;
  }
  // ライトテーマ: fill は十分薄い背景塗り、solid は代表色、soft は極薄
  if (mode === 'fill')   return `hsl(${hue} ${clamp(s + 10, 0, 100)}% ${clamp(l + 28, 60, 95)}%)`;
  if (mode === 'border') return `hsl(${hue} ${clamp(s - 10, 0, 100)}% ${clamp(l, 35, 70)}%)`;
  if (mode === 'solid')  return `hsl(${hue} ${s}% ${clamp(l, 30, 70)}%)`;
  if (mode === 'soft')   return `hsl(${hue} ${clamp(s + 20, 0, 100)}% ${clamp(l + 36, 80, 99)}%)`;
  return `hsl(${hue} ${s}% ${l}%)`;
}
window.buildHslFromGlobal = buildHslFromGlobal;

// 工程カラーを取得（旧 tone プリセットは廃止、全体彩度・明度ベースに統一）
window.processColor = function processColorV5(typeKey, mode = 'fill', theme = 'light') {
  const p = PROCESS_COLORS[typeKey];
  if (!p) return '#ccc';
  const baseSat = (typeof window._v5GlobalSat === 'number') ? window._v5GlobalSat : DEFAULT_GLOBAL_SAT;
  const baseLight = (typeof window._v5GlobalLight === 'number') ? window._v5GlobalLight : DEFAULT_GLOBAL_LIGHT;
  return buildHslFromGlobal(p.hue, baseSat, baseLight, mode, theme);
};

// HSL → hex 変換 (典型的な MDN レシピ)。type chip の背景で `${typeColor(ty)}20` のような alpha 表記を使うため hex 形式で返す
function hslToHex(h, s, l) {
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1)      [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else             [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to2 = (v) => ('0' + Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16)).slice(-2);
  return '#' + to2(r) + to2(g) + to2(b);
}

// 案件タイプの代表色を hex で返す。type.hue + 全体彩度・明度 から導出（旧 type.color hex はフォールバック）
// 既存の `${typeColor(ty)}20` のような alpha hex 連結との互換のため hex 形式
window.typeColor = function typeColorV5(type) {
  if (!type) return '#999';
  if (typeof type.hue === 'number') {
    const baseSat = (typeof window._v5GlobalSat === 'number') ? window._v5GlobalSat : DEFAULT_GLOBAL_SAT;
    const baseLight = (typeof window._v5GlobalLight === 'number') ? window._v5GlobalLight : DEFAULT_GLOBAL_LIGHT;
    return hslToHex(type.hue, baseSat, baseLight);
  }
  return type.color || '#999';
};

// 「カラー」設定の本体。全体彩度・明度 (常時表示) + [案件タイプ | 工程] タブで色相編集。
// 旧プリセット (パステル/ビビッド/ワンカラー) は廃止し、全体彩度・明度の連続スライダーで代替。
function V5ColorCustomizerBody({ t, store }) {
  const [cfg, setCfg] = React.useState(loadColorSettings);
  const [tab, setTab] = React.useState('types'); // 'types' | 'processes'
  const update = (next) => { setCfg(next); saveColorSettings(next); };
  const setHue = (k, v) => update({ ...cfg, hues: { ...cfg.hues, [k]: v } });
  const setGlobalSat = (v) => update({ ...cfg, globalSat: v });
  const setGlobalLight = (v) => update({ ...cfg, globalLight: v });
  const resetAll = () => update({
    hues: { ...DEFAULT_HUES },
    globalSat: DEFAULT_GLOBAL_SAT,
    globalLight: DEFAULT_GLOBAL_LIGHT,
  });

  // 案件タイプの hue を更新（store.types を直接書き換える）
  const setTypeHue = (typeId, hue) => {
    if (!store?.saveType) return;
    store.saveType(typeId, { hue });
  };

  const rowStyle = {
    display: 'grid', gridTemplateColumns: '110px 18px 1fr 40px', alignItems: 'center',
    gap: 10, padding: '6px 0',
  };

  // 共通: スライダー行のレンダラ
  const sliderRow = (label, value, min, max, suffix, onChange, gradient, swatch) => (
    <div style={rowStyle}>
      <span style={{ fontSize: 11, color: t.TEXT, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{
        width: 14, height: 14, borderRadius: 4, background: swatch,
        border: `1px solid ${t.BORDER}`,
      }} />
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%', accentColor: swatch,
          background: gradient,
          borderRadius: 3, height: 4, appearance: 'none',
        }} />
      <span style={{ fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', textAlign: 'right' }}>
        {value}{suffix}
      </span>
    </div>
  );

  const types = store?.types ? Object.values(store.types) : [];
  const baseSat = (typeof cfg.globalSat === 'number') ? cfg.globalSat : DEFAULT_GLOBAL_SAT;
  const baseLight = (typeof cfg.globalLight === 'number') ? cfg.globalLight : DEFAULT_GLOBAL_LIGHT;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 全体の彩度・明度（案件タイプ色 + 全工程色 に共通適用）*/}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            全体の色調
          </div>
          <button onClick={resetAll} style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 500,
            border: `1px dashed ${t.BORDER}`, background: 'transparent',
            color: t.MUTED, borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
          }}>デフォルトに戻す</button>
        </div>
        <div style={{ background: t.SUBTLE, borderRadius: 8, padding: '8px 14px' }}>
          {sliderRow(
            '彩度 (全体)', baseSat, 0, 100, '%',
            setGlobalSat,
            `linear-gradient(90deg, hsl(220 0% ${baseLight}%), hsl(220 100% ${baseLight}%))`,
            `hsl(220 ${baseSat}% ${baseLight}%)`,
          )}
          {sliderRow(
            '明度 (全体)', baseLight, 20, 90, '%',
            setGlobalLight,
            `linear-gradient(90deg, hsl(220 ${baseSat}% 20%), hsl(220 ${baseSat}% 55%), hsl(220 ${baseSat}% 90%))`,
            `hsl(220 ${baseSat}% ${baseLight}%)`,
          )}
        </div>
        <div style={{ fontSize: 10, color: t.MUTED, marginTop: 6, lineHeight: 1.5 }}>
          案件タイプ色・工程色すべてに共通で適用されます。「ビビッドすぎる」と感じたら彩度を下げる、「淡すぎる」と感じたら明度を下げると落ち着きます。
        </div>
      </div>

      {/* タブ: 案件タイプ / 工程 */}
      <div>
        <div style={{ display: 'flex', gap: 4, background: t.SUBTLE, borderRadius: 7, padding: 3, marginBottom: 8 }}>
          {[
            { id: 'types',     label: '案件タイプ', count: types.length },
            { id: 'processes', label: '工程',       count: Object.keys(DEFAULT_HUES).length },
          ].map(tb => {
            const active = tab === tb.id;
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                flex: 1, padding: '6px 12px', border: 'none', borderRadius: 5,
                background: active ? t.CARD : 'transparent',
                color: active ? t.ACCENT : t.MUTED,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'background 0.15s, color 0.15s',
              }}>
                {tb.label}
                <span style={{
                  fontSize: 10, fontWeight: 500,
                  color: active ? t.ACCENT : t.MUTED, opacity: 0.7,
                }}>{tb.count}</span>
              </button>
            );
          })}
        </div>

        {/* 案件タイプ タブ */}
        {tab === 'types' && (
          <div style={{ background: t.SUBTLE, borderRadius: 8, padding: '8px 12px' }}>
            {types.length === 0 ? (
              <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 11, color: t.MUTED }}>
                案件タイプがまだありません。設定 → 案件タイプ設定から追加できます。
              </div>
            ) : (
              types.map(ty => {
                const hue = (typeof ty.hue === 'number') ? ty.hue : 220;
                const swatch = `hsl(${hue} ${baseSat}% ${baseLight}%)`;
                return (
                  <div key={ty.id} style={rowStyle}>
                    <span style={{ fontSize: 11, color: t.TEXT, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ty.name}>{ty.name}</span>
                    <span style={{
                      width: 14, height: 14, borderRadius: 4, background: swatch,
                      border: `1px solid ${t.BORDER}`,
                    }} />
                    <input type="range" min="0" max="359" value={hue}
                      onChange={e => setTypeHue(ty.id, Number(e.target.value))}
                      style={{
                        width: '100%', accentColor: swatch,
                        background: `linear-gradient(90deg, hsl(0 ${baseSat}% ${baseLight}%), hsl(60 ${baseSat}% ${baseLight}%), hsl(120 ${baseSat}% ${baseLight}%), hsl(180 ${baseSat}% ${baseLight}%), hsl(240 ${baseSat}% ${baseLight}%), hsl(300 ${baseSat}% ${baseLight}%), hsl(359 ${baseSat}% ${baseLight}%))`,
                        borderRadius: 3, height: 4, appearance: 'none',
                      }} />
                    <span style={{ fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', textAlign: 'right' }}>
                      {hue}°
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 工程 タブ */}
        {tab === 'processes' && (
          <div style={{ background: t.SUBTLE, borderRadius: 8, padding: '8px 12px' }}>
            {Object.keys(DEFAULT_HUES).map(k => {
              const info = PROCESS_COLORS[k];
              if (!info) return null;
              const hue = cfg.hues[k];
              const swatch = `hsl(${hue} ${baseSat}% ${baseLight}%)`;
              return (
                <div key={k} style={rowStyle}>
                  <span style={{ fontSize: 11, color: t.TEXT, fontWeight: 500 }}>{info.name}</span>
                  <span style={{
                    width: 14, height: 14, borderRadius: 4, background: swatch,
                    border: `1px solid ${t.BORDER}`,
                  }} />
                  <input type="range" min="0" max="359" value={hue}
                    onChange={e => setHue(k, Number(e.target.value))}
                    style={{
                      width: '100%', accentColor: swatch,
                      background: `linear-gradient(90deg, hsl(0 ${baseSat}% ${baseLight}%), hsl(60 ${baseSat}% ${baseLight}%), hsl(120 ${baseSat}% ${baseLight}%), hsl(180 ${baseSat}% ${baseLight}%), hsl(240 ${baseSat}% ${baseLight}%), hsl(300 ${baseSat}% ${baseLight}%), hsl(359 ${baseSat}% ${baseLight}%))`,
                      borderRadius: 3, height: 4, appearance: 'none',
                    }} />
                  <span style={{ fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', textAlign: 'right' }}>
                    {hue}°
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
window.V5ColorCustomizerBody = V5ColorCustomizerBody;

// ============ 16. KPI「次の締切」を store 連携 ============
const _origKPICards = window.V3KPICards;
window.V3KPICards = function V3KPICardsV5({ t, store }) {
  const projects = (store && store.projects) || PROJECTS;
  const logs = (store && store.logs) || [];
  const statusOf = (p) => p.boardStatus || (typeof computedBoardStatus === 'function' ? computedBoardStatus(p) : 'todo');

  // 「今日」は render 時に再計算（モジュールロード時の TODAY を使うと日付をまたいで stale になる）
  const realToday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  // 日付キー算出ヘルパー
  const pad = (n) => String(n).padStart(2, '0');
  const dKey = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const logDk = (l) => {
    if (l.date) return l.date;
    if (l.createdAt) {
      const d = new Date(l.createdAt);
      if (!isNaN(d.getTime())) return dKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    return null;
  };
  // 1日あたり時間集計
  const sumHoursOnDay = (k) => logs.reduce((s, l) => logDk(l) === k ? s + (Number(l.hours) || 0) : s, 0);
  const distinctProjectsOnDay = (k) => {
    const set = new Set();
    logs.forEach(l => { if (logDk(l) === k && l.projectId) set.add(l.projectId); });
    return set.size;
  };

  // 今日含む 過去 7 日 (index 6 = today)
  const last7Hours = [];
  const last7Active = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate() - i);
    const k = dKey(d);
    last7Hours.push(Math.round(sumHoursOnDay(k) * 10) / 10);
    last7Active.push(distinctProjectsOnDay(k));
  }
  const todayHours = last7Hours[6];

  // 今週 月-日 の日別合計
  const dow = realToday.getDay();
  const off = dow === 0 ? 6 : dow - 1;
  const todayIdxInWeek = off; // 月=0 ... 日=6
  const thisWeek = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate() - off + i);
    thisWeek.push(Math.round(sumHoursOnDay(dKey(d)) * 10) / 10);
  }
  const weekTotal = Math.round(thisWeek.reduce((s, v) => s + v, 0) * 10) / 10;
  // 先週 月-日 の日別と合計
  const lastWeek = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate() - off - 7 + i);
    lastWeek.push(Math.round(sumHoursOnDay(dKey(d)) * 10) / 10);
  }
  const lastWeekTotal = Math.round(lastWeek.reduce((s, v) => s + v, 0) * 10) / 10;
  const weekDelta = Math.round((weekTotal - lastWeekTotal) * 10) / 10;
  const weekDeltaPct = lastWeekTotal > 0 ? Math.round((weekDelta / lastWeekTotal) * 100) : null;

  // 締切系
  const upcoming = projects
    .filter(p => p.deadline && statusOf(p) !== 'done' && statusOf(p) !== 'onhold')
    .map(p => {
      const d = p.deadline instanceof Date ? p.deadline : new Date(p.deadline);
      return { p, d, daysLeft: Math.round((d - TODAY) / 86400000) };
    })
    .filter(x => !isNaN(x.d.getTime()))
    .sort((a, b) => a.d - b.d);
  const next = upcoming[0] || null;
  const deadlineValue = next ? (next.daysLeft >= 0 ? String(next.daysLeft) : String(-next.daysLeft)) : '-';
  const deadlineUnit  = next ? (next.daysLeft >= 0 ? '日' : '日超過') : '';
  const deadlineSub   = next ? (store?.displayName ? store.displayName(next.p) : next.p.name) : '締切未設定';
  const deadlineTrend = next ? `${next.d.getMonth() + 1}/${next.d.getDate()}` : '—';
  const deadlineAlarm = next ? next.daysLeft <= 7 : false;
  const deadlineHue = next ? (next.daysLeft < 0 ? 0 : next.daysLeft <= 7 ? 10 : 150) : 220;

  // 完了案件の効率指標 (実績合計 / 予定合計、低いほど短縮達成)
  const doneProjects = projects.filter(p => statusOf(p) === 'done');
  const effActualSum = doneProjects.reduce((s, p) => s + p.processes.reduce((a, x) => a + (Number(x.actualH) || 0), 0), 0);
  const effPlannedSum = doneProjects.reduce((s, p) => s + p.processes.reduce((a, x) => a + (Number(x.plannedH) || 0), 0), 0);
  const effPct = effPlannedSum > 0 ? Math.round((effActualSum / effPlannedSum) * 100) : null;
  const effSavedH = Math.round((effPlannedSum - effActualSum) * 10) / 10;

  const goalH = 3.0;
  const todayPct = goalH > 0 ? Math.round((todayHours / goalH) * 100) : 0;

  // 今週 vs 先週 の日別ペア（Mon-Sun の各曜日に [先週, 今週] の 2 本）
  const weekPairs = lastWeek.map((lw, i) => ({ last: lw, this: thisWeek[i] }));

  const cards = [
    {
      label: '今日の作業時間', value: todayHours.toFixed(1), unit: 'h',
      sub: `目標 ${goalH}h / ${todayPct}%`,
      trend: todayHours >= goalH ? '達成' : (todayHours > 0 ? '進行中' : '—'),
      good: todayHours >= goalH,
      progress: { current: todayHours, target: goalH },
      hue: 30,
    },
    {
      label: '先週との比較', value: weekTotal.toFixed(1), unit: 'h',
      sub: lastWeekTotal > 0
        ? `先週比 ${weekDelta >= 0 ? '+' : ''}${weekDelta.toFixed(1)}h`
        : '先週データなし',
      trend: weekDeltaPct !== null ? `${weekDeltaPct >= 0 ? '+' : ''}${weekDeltaPct}%` : '—',
      good: weekDeltaPct !== null && weekDelta > 0,
      chartPairs: weekPairs, chartTodayIdx: todayIdxInWeek, hue: 150,
    },
    {
      label: '完了案件の効率',
      value: effPct !== null ? String(effPct) : '—',
      unit: effPct !== null ? '%' : '',
      sub: effPlannedSum > 0
        ? `実績 ${effActualSum.toFixed(1)}h / 予定 ${effPlannedSum.toFixed(1)}h`
        : '完了案件がまだありません',
      trend: effPct !== null
        ? (effSavedH >= 0 ? `短縮 -${effSavedH.toFixed(1)}h` : `延長 +${(-effSavedH).toFixed(1)}h`)
        : `完了 ${doneProjects.length}件`,
      good: effPct !== null && effPct < 100,
      alarm: effPct !== null && effPct > 110,
      progress: effPct !== null ? { current: Math.min(effActualSum, effPlannedSum), target: effPlannedSum, overflow: effActualSum > effPlannedSum } : null,
      hue: 280,
    },
    { label: '次の締切', value: deadlineValue, unit: deadlineUnit, sub: deadlineSub, trend: deadlineTrend, alarm: deadlineAlarm, chart: [], hue: deadlineHue },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '0 20px 20px' }}>
      {cards.map((c, i) => (
        <div key={i} style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: t.MUTED, fontWeight: 500 }}>{c.label}</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: c.good ? (t.dark ? '#5ee1a9' : '#059669') : c.alarm ? (t.dark ? '#fbbf24' : '#d97706') : t.MUTED,
              background: c.good ? (t.dark ? 'rgba(94,225,169,0.15)' : '#d1fae5') : c.alarm ? (t.dark ? 'rgba(251,191,36,0.15)' : '#fef3c7') : t.SUBTLE,
              padding: '2px 6px', borderRadius: 4,
            }}>{c.trend}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
            <NumberPop value={c.value} style={{ fontSize: 26, fontWeight: 700, color: t.TEXT, letterSpacing: -1 }} />
            <span style={{ fontSize: 13, color: t.MUTED, fontWeight: 500 }}>{c.unit}</span>
          </div>
          <div style={{
            fontSize: 11, color: t.MUTED, marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{c.sub}</div>
          {c.progress ? (
            <div style={{ marginTop: 10, height: 24, display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '100%', height: 6, background: t.SUBTLE, borderRadius: 3, overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, c.progress.target > 0 ? (c.progress.current / c.progress.target) * 100 : 0)}%`,
                  background: c.progress.overflow
                    ? `hsl(0 70% ${t.dark ? 60 : 55}%)`
                    : `hsl(${c.hue} 60% ${t.dark ? 60 : 55}%)`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ) : c.chartPairs ? (() => {
            // 今週 vs 先週: 各曜日に [先週=薄, 今週=濃] の2本ペア。Mon-Sun 順
            // 棒は固定幅、曜日間に余白を取って日ごとのグループを明確化
            const allVals = c.chartPairs.flatMap(p => [p.last, p.this]);
            const max = Math.max(...allVals, 0.01);
            const labels = ['月','火','水','木','金','土','日'];
            const BAR_W = 13;
            return (
              <div style={{
                marginTop: 8, display: 'flex', alignItems: 'flex-end',
                justifyContent: 'space-between', height: 24,
              }}>
                {c.chartPairs.map((p, j) => {
                  const isToday = typeof c.chartTodayIdx === 'number' && j === c.chartTodayIdx;
                  // 今日のバーは色を一段濃く（outline は使わない: 0.5px ぶれる原因）
                  const thisBg = isToday
                    ? `hsl(${c.hue} 75% ${t.dark ? 52 : 42}%)`
                    : `hsl(${c.hue} 60% ${t.dark ? 60 : 55}%)`;
                  return (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'flex-end', gap: 1.5,
                      height: '100%', flex: 'none',
                    }} title={`${labels[j]} 先週 ${p.last.toFixed(1)}h / 今週 ${p.this.toFixed(1)}h`}>
                      {/* 先週: 薄いグレー寄り */}
                      <div style={{
                        width: BAR_W,
                        height: `${(p.last / max) * 100}%`,
                        background: `hsl(${c.hue} 25% ${t.dark ? 50 : 72}%)`,
                        borderRadius: 1.5, minHeight: p.last > 0 ? 2 : 0,
                        opacity: p.last > 0 ? 0.9 : 0.18,
                      }} />
                      {/* 今週: アクセント色。今日のバーは色を濃く */}
                      <div style={{
                        width: BAR_W,
                        height: `${(p.this / max) * 100}%`,
                        background: thisBg,
                        borderRadius: 1.5, minHeight: p.this > 0 ? 2 : 0,
                        opacity: p.this === 0 ? 0.15 : 1,
                      }} />
                    </div>
                  );
                })}
              </div>
            );
          })() : c.chart && c.chart.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginTop: 8, height: 24 }}>
              {c.chart.map((v, j) => {
                // chartTodayIdx が指定されているときは未来日を dim、今日を強調
                const hasToday = typeof c.chartTodayIdx === 'number';
                const isFuture = hasToday && j > c.chartTodayIdx;
                const isToday = hasToday && j === c.chartTodayIdx;
                const baseOpacity = v === 0 ? 0.15
                  : isFuture ? 0.18
                  : isToday ? 1
                  : (!hasToday && j === c.chart.length - 1) ? 1
                  : 0.5;
                return (
                  <div key={j} style={{
                    flex: 1, height: `${(v / Math.max(...c.chart, 0.01)) * 100}%`,
                    background: `hsl(${c.hue} 60% ${t.dark ? 60 : 55}%)`,
                    borderRadius: 2, opacity: baseOpacity,
                    minHeight: 2,
                  }} />
                );
              })}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

// ============ 18. 案件別チェックリスト（事務タスク） ============
function loadChecklistTemplate() {
  try {
    const raw = JSON.parse(localStorage.getItem('v5.checklistTemplate') || 'null');
    if (Array.isArray(raw)) return raw;
  } catch (e) {}
  return ['着手連絡', '請求書送付', '記帳'];
}
function saveChecklistTemplate(arr) {
  localStorage.setItem('v5.checklistTemplate', JSON.stringify(arr));
  window.dispatchEvent(new Event('checklisttemplate-change'));
}
function makeChecklistFromTemplate() {
  return loadChecklistTemplate().map((text, i) => ({
    id: 'c' + Date.now() + '_' + i, text, done: false,
  }));
}
window.loadChecklistTemplate = loadChecklistTemplate;
window.saveChecklistTemplate = saveChecklistTemplate;
window.makeChecklistFromTemplate = makeChecklistFromTemplate;

// カードビューの小型チェックリスト
// 未完了を優先して先頭から最大 3 件表示。未完了が足りなければ完了済みも含めて埋める。
// → チェック直後の項目も残るため、取り消しがカードから直接できる。
function V5ChecklistCompact({ t, project, store, expandAll }) {
  const items = project.checklist || [];
  const [expanded, setExpanded] = React.useState(() => !!expandAll);
  // カンバン側の「全展開/全折り畳み」トグルに追従: 切替直後は各カードをそれに合わせる
  React.useEffect(() => {
    if (typeof expandAll === 'boolean') setExpanded(expandAll);
  }, [expandAll]);
  const toggle = (e, id) => {
    e.stopPropagation();
    const next = items.map(i => i.id === id ? { ...i, done: !i.done } : i);
    store.updateProject(project.id, { checklist: next });
  };
  if (items.length === 0) return null;

  const doneCount = items.filter(i => i.done).length;
  const MAX = 3;
  const undone = items.filter(i => !i.done);
  const done = items.filter(i => i.done);
  const visible = undone.slice(0, MAX);
  if (visible.length < MAX) visible.push(...done.slice(0, MAX - visible.length));
  const moreCount = items.length - visible.length;
  const allDone = doneCount === items.length;
  const doneColor = allDone ? (t.dark ? '#5ee1a9' : '#059669') : t.MUTED;

  const stop = (e) => e.stopPropagation();

  return (
    <div draggable={false}
      onMouseDown={stop}
      onDragStart={e => { e.preventDefault(); e.stopPropagation(); }}
      style={{
        marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${t.BORDER}`,
      }}>
      {/* 折りたたみ/展開エリア全体に常時サブtle背景を敷く */}
      <div style={{
        background: t.SUBTLE, borderRadius: 6,
        padding: expanded ? '3px 6px 6px' : '3px 6px',
        display: 'flex', flexDirection: 'column', gap: 3,
      }}>
        {/* 折りたたみヘッダ: クリックで展開/格納。ドラッグ開始やダブルクリック詳細を阻害しない */}
        <button onClick={e => { stop(e); setExpanded(x => !x); }}
          onMouseDown={stop}
          title={expanded ? '折りたたむ' : '展開'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 0,
            border: 'none', background: 'transparent',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="3"
              style={{ transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              <path d="m9 6 6 6-6 6"/>
            </svg>
            <span style={{ fontSize: 9, color: t.MUTED, fontWeight: 600, letterSpacing: 0.3 }}>
              事務チェック
            </span>
          </span>
          <span style={{
            fontSize: 9, color: doneColor,
            fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', fontWeight: 600,
          }}>{doneCount}/{items.length}{allDone ? ' ✓' : ''}</span>
        </button>
        {expanded && (
          <>
            {visible.map(i => (
              <label key={i.id} onClick={e => e.stopPropagation()} style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, cursor: 'pointer',
                color: i.done ? t.MUTED : t.TEXT, lineHeight: 1.3,
              }}>
                <input type="checkbox" checked={i.done}
                  onChange={e => toggle(e, i.id)}
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: 11, height: 11, accentColor: t.ACCENT, cursor: 'pointer',
                    flexShrink: 0, margin: 0,
                  }} />
                <span style={{
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  textDecoration: i.done ? 'line-through' : 'none',
                }}>{i.text}</span>
              </label>
            ))}
            {moreCount > 0 && (
              <span style={{ fontSize: 9, color: t.MUTED, paddingLeft: 16 }}>
                +{moreCount} 件（ダブルクリックで詳細）
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// 詳細モーダル用の編集可能チェックリスト
function V5ChecklistFull({ t, project, store }) {
  const [input, setInput] = React.useState('');
  const items = project.checklist || [];
  const save = (next) => store.updateProject(project.id, { checklist: next });
  const toggle = (id) => save(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const del = (id) => save(items.filter(i => i.id !== id));
  const addItem = () => {
    const text = input.trim();
    if (!text) return;
    save([...items, { id: 'c' + Date.now(), text, done: false }]);
    setInput('');
  };
  const seedFromTemplate = () => {
    if (items.length > 0 && !confirm('現在のチェック項目をテンプレートで置き換えますか？')) return;
    save(makeChecklistFromTemplate());
  };

  const twoCol = items.length >= 6;
  const doneCount = items.filter(i => i.done).length;

  return (
    <div style={{
      marginBottom: 18,
      padding: 14,
      background: t.SUBTLE,
      border: `1px solid ${t.BORDER}`,
      borderRadius: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.TEXT, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            事務チェック
          </div>
          {items.length > 0 && (
            <div style={{ fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', fontWeight: 600 }}>
              {doneCount}/{items.length}
            </div>
          )}
        </div>
        <button onClick={seedFromTemplate} title="テンプレートから読み込む" style={{
          padding: '3px 8px', fontSize: 10, border: `1px dashed ${t.BORDER}`,
          background: 'transparent', color: t.MUTED, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
        }}>テンプレート適用</button>
      </div>
      {items.length === 0 && (
        <div style={{
          padding: '10px 8px', fontSize: 11, color: t.MUTED, textAlign: 'center',
          border: `1px dashed ${t.BORDER}`, borderRadius: 6, marginBottom: 8,
        }}>チェック項目はありません</div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr',
        columnGap: 14, rowGap: 0,
        marginBottom: items.length > 0 ? 10 : 0,
      }}>
        {items.map(i => (
          <div key={i.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px',
            minWidth: 0,
          }}>
            <input type="checkbox" checked={i.done} onChange={() => toggle(i.id)}
              style={{ width: 13, height: 13, accentColor: t.ACCENT, cursor: 'pointer', flexShrink: 0, margin: 0 }} />
            <span style={{
              flex: 1, fontSize: 11.5, color: i.done ? t.MUTED : t.TEXT,
              textDecoration: i.done ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={i.text}>{i.text}</span>
            <button onClick={() => del(i.id)} title="削除" style={{
              width: 18, height: 18, border: 'none', background: 'transparent',
              color: t.MUTED, cursor: 'pointer', borderRadius: 3, opacity: 0.6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="新しいチェック項目 (Enter で追加)"
          style={{ ...inputStyle(t), flex: 1, padding: '6px 10px', fontSize: 11.5, background: t.CARD }} />
        <button onClick={addItem} disabled={!input.trim()} style={{
          padding: '6px 12px', border: 'none', borderRadius: 6,
          background: input.trim() ? t.ACCENT : t.CARD,
          color: input.trim() ? 'white' : t.MUTED,
          fontSize: 11, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default',
          fontFamily: 'inherit', flexShrink: 0,
        }}>追加</button>
      </div>
    </div>
  );
}

// 設定モーダル用: テンプレート編集
function V5ChecklistTemplateEditor({ t }) {
  const [tpl, setTpl] = React.useState(loadChecklistTemplate);
  const [input, setInput] = React.useState('');
  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);
  const commit = (next) => { setTpl(next); saveChecklistTemplate(next); };
  const addItem = () => {
    const text = input.trim();
    if (!text) return;
    commit([...tpl, text]);
    setInput('');
  };
  const del = (i) => commit(tpl.filter((_, idx) => idx !== i));
  const edit = (i, v) => commit(tpl.map((t, idx) => idx === i ? v : t));
  const reorder = (from, to) => {
    if (from === to) return;
    const next = [...tpl];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    commit(next);
  };
  const resetDefault = () => {
    localStorage.removeItem('v5.checklistTemplate');
    setTpl(loadChecklistTemplate());
    window.dispatchEvent(new Event('checklisttemplate-change'));
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT, marginBottom: 4 }}>
        事務チェックテンプレート
      </div>
      <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 10, lineHeight: 1.5 }}>
        新しい案件を作成した時に自動で入るチェック項目です（案件側で個別に追加・削除可能）。
        <br />
        <span style={{ color: t.ACCENT, fontWeight: 500 }}>※ カードビュー（カード画面）でのみ表示される機能です。タイムラインには表示されません。</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {tpl.map((text, i) => (
          <div key={i}
            draggable
            onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
            onDragLeave={() => { if (overIdx === i) setOverIdx(null); }}
            onDrop={(e) => { e.preventDefault(); if (dragIdx != null) reorder(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
              background: t.SUBTLE, borderRadius: 5,
              opacity: dragIdx === i ? 0.4 : 1,
              borderTop: overIdx === i && dragIdx != null && dragIdx !== i ? `2px solid ${t.ACCENT}` : '2px solid transparent',
              cursor: 'grab',
            }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2" style={{ opacity: 0.5, flexShrink: 0 }}>
              <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
            </svg>
            <input value={text} onChange={e => edit(i, e.target.value)}
              style={{
                flex: 1, fontSize: 12, color: t.TEXT, background: 'transparent',
                border: 'none', outline: 'none', fontFamily: 'inherit', padding: 0,
              }} />
            <button onClick={() => del(i)} title="削除" style={{
              width: 20, height: 20, border: 'none', background: 'transparent',
              color: t.MUTED, cursor: 'pointer', borderRadius: 3, opacity: 0.6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="新しい項目 (Enter で追加)"
          style={{ ...inputStyle(t), flex: 1, padding: '6px 10px', fontSize: 11.5 }} />
        <button onClick={addItem} disabled={!input.trim()} style={{
          padding: '6px 12px', border: 'none', borderRadius: 6,
          background: input.trim() ? t.ACCENT : t.SUBTLE,
          color: input.trim() ? 'white' : t.MUTED,
          fontSize: 11, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default',
          fontFamily: 'inherit', flexShrink: 0,
        }}>追加</button>
      </div>
      <button onClick={resetDefault} style={{
        padding: '5px 10px', fontSize: 11, border: `1px dashed ${t.BORDER}`,
        background: 'transparent', color: t.MUTED, borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
      }}>デフォルトに戻す</button>
    </div>
  );
}
window.V5ChecklistCompact = V5ChecklistCompact;
window.V5ChecklistFull = V5ChecklistFull;
window.V5ChecklistTemplateEditor = V5ChecklistTemplateEditor;

// V4KanbanCard にチェックリストを追加（store 経由でトグル可）
window.V4KanbanCard = function V4KanbanCardV5({ t, project, store, expandAll }) {
  const s = projectStats(project);
  const ty = (store?.types?.[project.typeId]) || PROJECT_TYPES[project.typeId];
  const dlDate = project.deadline
    ? (project.deadline instanceof Date ? project.deadline : new Date(project.deadline))
    : null;
  const deadlineDays = dlDate ? Math.round((dlDate - TODAY) / 86400000) : null;
  // 完了案件・保留案件は緊急/期限超過の強調を外す
  const isDone = (project.boardStatus || computedBoardStatus(project)) === 'done';
  const isOnHold = project.boardStatus === 'onhold';
  const isUrgent = !isDone && !isOnHold && deadlineDays !== null && deadlineDays <= 7 && deadlineDays >= 0;
  const isOverdue = !isDone && !isOnHold && deadlineDays !== null && deadlineDays < 0;

  return (
    <div style={{
      padding: '10px 12px', background: t.CARD,
      // border shorthand を使うと borderLeft（後段で 3px の色付きライン）が
      // テーマ変更時の再 set で上書きされ消えるバグになるため、3辺を個別指定する
      borderTop: `1px ${isOnHold ? 'dashed' : 'solid'} ${t.BORDER}`,
      borderRight: `1px ${isOnHold ? 'dashed' : 'solid'} ${t.BORDER}`,
      borderBottom: `1px ${isOnHold ? 'dashed' : 'solid'} ${t.BORDER}`,
      borderLeft: `3px ${isOnHold ? 'dashed' : 'solid'} ${ty ? typeColor(ty) : t.ACCENT}`,
      borderRadius: 8,
      cursor: 'grab', transition: 'all 0.15s',
      opacity: isOnHold ? 0.55 : 1,
    }}>
      {/* 上部: 左=案件タイプチップ、右=締切バッジ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 6, marginBottom: 6,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {ty ? (() => {
            const tc = typeColor(ty);
            return (
              <div style={{
                display: 'inline-block', padding: '1px 6px', borderRadius: 3,
                background: `${tc}20`, color: tc, fontSize: 9, fontWeight: 600,
              }}>{ty.name}</div>
            );
          })() : <span />}
          {isOnHold && (
            <div style={{
              display: 'inline-block', padding: '1px 6px', borderRadius: 3,
              background: t.SUBTLE, color: t.MUTED, fontSize: 9, fontWeight: 600,
            }}>保留中</div>
          )}
        </div>
        {dlDate ? (
          <div title={isOverdue ? `期限超過 (${dlDate.getMonth()+1}/${dlDate.getDate()})` : `締切 ${dlDate.getMonth()+1}/${dlDate.getDate()}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: (isUrgent || isOverdue) ? '1px 7px' : '0 4px',
              borderRadius: (isUrgent || isOverdue) ? 10 : 3,
              background: (isUrgent || isOverdue) ? (t.dark ? '#f8717122' : '#dc262612') : 'transparent',
              color: (isUrgent || isOverdue) ? (t.dark ? '#f87171' : '#dc2626') : t.MUTED,
              fontSize: 9, fontWeight: (isUrgent || isOverdue) ? 700 : 600,
              fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
              letterSpacing: 0.2, flexShrink: 0,
            }}>
            {(isUrgent || isOverdue) && <span style={{ fontSize: 9 }}>🔥</span>}
            {dlDate.getMonth()+1}/{dlDate.getDate()}
          </div>
        ) : project.client ? (
          <div title={`締切 ${project.client}`} style={{
            display: 'inline-flex', alignItems: 'center', padding: '0 4px',
            fontSize: 9, color: t.MUTED, fontWeight: 600, maxWidth: 100,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{project.client}</div>
        ) : (
          <div style={{ fontSize: 9, color: t.MUTED, fontWeight: 500 }}>締切未設定</div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT, marginBottom: 6, lineHeight: 1.35 }}>
        {store?.displayName ? store.displayName(project) : project.name}
      </div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
          <span style={{ color: t.MUTED }}>進捗 <span style={{ fontSize: 9, opacity: 0.7 }}>(経過作業日)</span></span>
          <span style={{ color: t.TEXT, fontWeight: 600, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>{s.pct}%</span>
        </div>
        <div style={{ height: 4, background: t.SUBTLE, borderRadius: 2, overflow: 'hidden' }}>
          {(() => {
            // カード上部チップ・左ボーダーと揃えて案件タイプ色を使う
            const tc = ty ? typeColor(ty) : t.ACCENT;
            return (
              <div style={{
                height: '100%', width: `${s.pct}%`,
                background: `linear-gradient(90deg, ${tc}, ${tc}cc)`,
              }} />
            );
          })()}
        </div>
      </div>
      {/* 時間情報: 控えめに数値表示のみ。超過しても警告色は出さず、+/- だけで状態を示す */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8,
        fontSize: 10, color: t.MUTED, marginBottom: 8,
        fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
      }}>
        <span title="実績 / 予定">
          実 <span style={{ color: t.TEXT }}>{s.totalActual.toFixed(1)}</span>
          <span style={{ opacity: 0.5 }}> / 予 {s.totalPlanned.toFixed(1)}h</span>
        </span>
        {s.totalPlanned > 0 && (
          <span title={s.timeBudget >= 0 ? '残予算' : 'オーバー'} style={{ opacity: 0.85 }}>
            {s.timeBudget >= 0 ? '+' : ''}{s.timeBudget.toFixed(1)}h
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
        {project.processes.slice(0, 5).map(pr => {
          const themeKey = t.dark ? 'dark' : 'light';
          const colSolid  = processColor(pr.type, 'solid',  themeKey);
          const colBorder = processColor(pr.type, 'border', themeKey);
          const done = !!pr.completed;
          const firstChar = PROCESS_COLORS[pr.type]?.name?.charAt(0) || '·';
          return (
            <div key={pr.id}
              role="button"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (store?.setProcessCompleted) {
                  store.setProcessCompleted(project.id, pr.id, !done);
                }
              }}
              title={`${PROCESS_COLORS[pr.type]?.name}${done ? ' · 完了 (クリックで未完了に戻す)' : ' (クリックで完了マーク)'}`}
              style={{
                width: 18, height: 18, borderRadius: 4,
                background: 'transparent',
                border: `1px ${done ? 'solid' : 'dashed'} ${colBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, color: colSolid,
                cursor: 'pointer',
                userSelect: 'none',
                pointerEvents: 'auto',
                transition: 'border-style 0.12s ease',
              }}>
              <TextSwap triggerKey={done ? 'on' : 'off'} anim="icon">{done ? '✓' : firstChar}</TextSwap>
            </div>
          );
        })}
      </div>
      {store && <V5ChecklistCompact t={t} project={project} store={store} expandAll={expandAll} />}
    </div>
  );
};

// ============ 19. 全体カラーテンプレート（ユーザー定義テーマ） ============
const USER_THEMES_KEY = 'v5.userThemes';
const THEME_FIELDS = [
  { key: 'BG',     label: '背景',       hint: '画面全体のベース背景' },
  { key: 'CARD',   label: 'カード',     hint: 'パネル・カードの背景' },
  { key: 'SUBTLE', label: 'サブ背景',   hint: '薄い背景 (タグ等)' },
  { key: 'BORDER', label: '枠線',       hint: '区切り線' },
  { key: 'TEXT',   label: 'テキスト',   hint: '本文の文字色' },
  { key: 'MUTED',  label: '補助テキスト', hint: 'キャプション・ラベル' },
  { key: 'ACCENT', label: 'アクセント', hint: 'ボタン・リンク・強調' },
];

function loadUserThemes() {
  try {
    const raw = JSON.parse(localStorage.getItem(USER_THEMES_KEY) || '{}');
    return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  } catch (e) { return {}; }
}
function applyUserThemes(obj) {
  // 既存のユーザーテーマを一度除去して、保存値で再構築
  Object.keys(window.THEMES).forEach(k => {
    if (window.THEMES[k]._user) delete window.THEMES[k];
  });
  Object.entries(obj).forEach(([k, v]) => {
    window.THEMES[k] = completeTheme({ ...v, _user: true });
  });
}
function saveUserThemes(obj) {
  localStorage.setItem(USER_THEMES_KEY, JSON.stringify(obj));
  applyUserThemes(obj);
  window.dispatchEvent(new Event('usertheme-change'));
}
function completeTheme(th) {
  const swatch = [th.BG, th.ACCENT, th.TEXT];
  const greet = `linear-gradient(135deg, ${th.ACCENT}22, ${th.ACCENT}14)`;
  return { ...th, swatch, GREET_BG: th.GREET_BG || greet };
}
applyUserThemes(loadUserThemes());

function makeDefaultUserTheme(baseThemeId) {
  const base = window.THEMES[baseThemeId] || window.THEMES.paper;
  const n = Object.keys(loadUserThemes()).length + 1;
  return {
    id: 'user_' + Date.now(),
    name: `マイテーマ ${n}`,
    dark: !!base.dark,
    BG: base.BG, CARD: base.CARD, SUBTLE: base.SUBTLE,
    BORDER: base.BORDER, TEXT: base.TEXT, MUTED: base.MUTED,
    ACCENT: base.ACCENT,
  };
}

function V5ThemeCustomizerBody({ t, themeId, setThemeId }) {
  const [themes, setThemes] = React.useState(loadUserThemes);
  const [editingId, setEditingId] = React.useState(null);
  const editing = editingId ? themes[editingId] : null;

  const commit = (next) => { setThemes(next); saveUserThemes(next); };
  const createNew = () => {
    const nt = makeDefaultUserTheme(themeId);
    commit({ ...themes, [nt.id]: nt });
    setEditingId(nt.id);
  };
  const update = (patch) => {
    const next = { ...themes, [editingId]: { ...themes[editingId], ...patch } };
    commit(next);
  };
  const del = (id) => {
    if (!confirm(`「${themes[id].name}」を削除しますか？`)) return;
    const next = { ...themes };
    delete next[id];
    commit(next);
    if (themeId === id) setThemeId('paper');
    if (editingId === id) setEditingId(null);
  };
  const duplicate = (id) => {
    const src = themes[id];
    const nt = { ...src, id: 'user_' + Date.now(), name: src.name + ' コピー' };
    commit({ ...themes, [nt.id]: nt });
    setEditingId(nt.id);
  };

  if (editing) {
    const preview = completeTheme(editing);
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <button onClick={() => setEditingId(null)} style={{
            padding: '4px 8px', fontSize: 11, border: `1px solid ${t.BORDER}`,
            background: t.CARD, color: t.TEXT, borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
            一覧
          </button>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT }}>テーマを編集</div>
          <div style={{ flex: 1 }} />
          <button onClick={() => duplicate(editingId)} style={{
            padding: '4px 8px', fontSize: 11, border: `1px solid ${t.BORDER}`,
            background: t.CARD, color: t.MUTED, borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
          }}>複製</button>
          <button onClick={() => del(editingId)} style={{
            padding: '4px 8px', fontSize: 11, border: `1px solid ${t.dark ? '#f87171' : '#dc2626'}`,
            background: 'transparent', color: t.dark ? '#f87171' : '#dc2626',
            borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
          }}>削除</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 14 }}>
          {/* 左: 編集フォーム */}
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>名前</div>
              <input value={editing.name} onChange={e => update({ name: e.target.value })}
                style={inputStyle(t)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 11.5, color: t.TEXT, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!editing.dark}
                onChange={e => update({ dark: e.target.checked })}
                style={{ accentColor: t.ACCENT }} />
              ダークモード（文字・UI の明度反転ロジックを有効化）
            </label>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>色</div>
            <div style={{ background: t.SUBTLE, borderRadius: 8, padding: '10px 12px' }}>
              {THEME_FIELDS.map(f => (
                <div key={f.key} style={{
                  display: 'grid', gridTemplateColumns: '90px 36px 90px 1fr', alignItems: 'center',
                  gap: 8, padding: '5px 0',
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: t.TEXT, fontWeight: 500 }}>{f.label}</div>
                    <div style={{ fontSize: 9.5, color: t.MUTED }}>{f.hint}</div>
                  </div>
                  <input type="color" value={editing[f.key]}
                    onChange={e => update({ [f.key]: e.target.value })}
                    style={{
                      width: 36, height: 28, padding: 0, border: `1px solid ${t.BORDER}`,
                      borderRadius: 5, cursor: 'pointer', background: 'transparent',
                    }} />
                  <input value={editing[f.key]}
                    onChange={e => update({ [f.key]: e.target.value })}
                    style={{ ...inputStyle(t), padding: '4px 8px', fontSize: 11, fontFamily: '"Futura", monospace' }} />
                  <div style={{ fontSize: 9.5, color: t.MUTED, fontFamily: 'monospace' }}>
                    {f.key}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右: プレビュー */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>プレビュー</div>
            <div style={{
              padding: 10, background: preview.BG, border: `1px solid ${preview.BORDER}`, borderRadius: 8,
              color: preview.TEXT, fontSize: 11,
            }}>
              <div style={{
                padding: 10, background: preview.CARD, border: `1px solid ${preview.BORDER}`, borderRadius: 6,
                marginBottom: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>案件サンプル</div>
                <div style={{ fontSize: 10, color: preview.MUTED, marginBottom: 6 }}>キャラクターデザイン · 4/30</div>
                <div style={{ height: 4, background: preview.SUBTLE, borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: '60%', background: preview.ACCENT }} />
                </div>
                <span style={{
                  display: 'inline-block', padding: '1px 6px', borderRadius: 3,
                  background: `${preview.ACCENT}22`, color: preview.ACCENT, fontSize: 9, fontWeight: 600,
                }}>進行中</span>
              </div>
              <button style={{
                padding: '6px 12px', border: 'none', background: preview.ACCENT, color: preview.dark ? preview.BG : 'white',
                borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                width: '100%',
              }}>プライマリボタン</button>
              <div style={{ marginTop: 6, padding: 6, background: preview.SUBTLE, borderRadius: 4, fontSize: 10, color: preview.MUTED }}>
                サブ背景 + 補助テキスト
              </div>
            </div>
            <button onClick={() => setThemeId(editing.id)}
              disabled={themeId === editing.id} style={{
                marginTop: 8, width: '100%',
                padding: '6px 10px', fontSize: 11, fontWeight: 600,
                border: `1px solid ${themeId === editing.id ? t.BORDER : t.ACCENT}`,
                background: themeId === editing.id ? t.SUBTLE : t.ACCENT,
                color: themeId === editing.id ? t.MUTED : 'white',
                borderRadius: 6, cursor: themeId === editing.id ? 'default' : 'pointer', fontFamily: 'inherit',
              }}>{themeId === editing.id ? '現在適用中' : 'このテーマを適用'}</button>
          </div>
        </div>
      </div>
    );
  }

  // 一覧ビュー
  const userList = Object.values(themes);
  return (
    <div>
      <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 10 }}>
        自由に色を編集できるマイテーマを作成します。保存したテーマは上部のテーマ選択から切替可能です。
      </div>
      {userList.length === 0 ? (
        <div style={{
          padding: '20px 12px', textAlign: 'center', fontSize: 11, color: t.MUTED,
          border: `1px dashed ${t.BORDER}`, borderRadius: 8, marginBottom: 10,
        }}>マイテーマはまだありません。「＋ 新規テーマ」で現在のテーマをベースに作成できます。</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {userList.map(th => {
            const active = themeId === th.id;
            const sw = completeTheme(th).swatch;
            return (
              <div key={th.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: active ? `${t.ACCENT}12` : t.SUBTLE,
                border: `1px solid ${active ? t.ACCENT : t.BORDER}`, borderRadius: 7,
              }}>
                <div style={{ display: 'flex' }}>
                  {sw.map((c, i) => (
                    <div key={i} style={{
                      width: 16, height: 16, borderRadius: 3, background: c,
                      border: `1px solid ${t.BORDER}`, marginLeft: i === 0 ? 0 : -5,
                    }} />
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT }}>{th.name}</div>
                  <div style={{ fontSize: 10, color: t.MUTED }}>
                    {th.dark ? 'ダーク' : 'ライト'} · {active ? '適用中' : 'マイテーマ'}
                  </div>
                </div>
                <button onClick={() => setThemeId(th.id)} disabled={active} style={{
                  padding: '4px 8px', fontSize: 11, border: `1px solid ${active ? t.BORDER : t.ACCENT}`,
                  background: active ? t.SUBTLE : t.CARD, color: active ? t.MUTED : t.ACCENT,
                  borderRadius: 5, cursor: active ? 'default' : 'pointer', fontFamily: 'inherit',
                }}>{active ? '適用中' : '適用'}</button>
                <button onClick={() => setEditingId(th.id)} title="編集" style={{
                  width: 26, height: 26, border: `1px solid ${t.BORDER}`, background: t.CARD,
                  color: t.MUTED, borderRadius: 5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
                <button onClick={() => del(th.id)} title="削除" style={{
                  width: 26, height: 26, border: `1px solid ${t.BORDER}`, background: t.CARD,
                  color: t.MUTED, borderRadius: 5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={createNew} style={{
        padding: '8px 14px', fontSize: 12, fontWeight: 600,
        border: `1px dashed ${t.ACCENT}`, background: `${t.ACCENT}0c`, color: t.ACCENT,
        borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        新規テーマ（現在のテーマをベースに）
      </button>
    </div>
  );
}
window.V5ThemeCustomizerBody = V5ThemeCustomizerBody;

// ============ 20. レポート画面: 案件タイプ別配分に「時間 / 件数」タブ ============
// 件数モード: 期間内に作業ログがある案件をタイプ別にカウント（logs 無しなら全期間の案件数）
function V5TypeDistribution({ t, store, logs }) {
  const [mode, setMode] = React.useState('hours'); // 'hours' | 'count'
  const useLogs = Array.isArray(logs);

  const byHours = {};
  const byCount = {};
  if (useLogs) {
    const projTypeOf = (id) => store.projects.find(p => p.id === id)?.typeId;
    const seen = {}; // typeId -> Set(projectId)
    logs.forEach(l => {
      const tid = projTypeOf(l.projectId);
      if (!tid) return;
      byHours[tid] = (byHours[tid] || 0) + (Number(l.hours) || 0);
      if (!seen[tid]) seen[tid] = new Set();
      seen[tid].add(l.projectId);
    });
    Object.keys(seen).forEach(k => { byCount[k] = seen[k].size; });
  } else {
    store.projects.forEach(p => {
      const h = p.processes.reduce((s, x) => s + x.actualH, 0);
      byHours[p.typeId] = (byHours[p.typeId] || 0) + h;
      byCount[p.typeId] = (byCount[p.typeId] || 0) + 1;
    });
  }

  const entries = mode === 'hours'
    ? Object.entries(byHours).filter(([, v]) => v > 0)
    : Object.entries(byCount).filter(([, v]) => v > 0);
  const unit = mode === 'hours' ? 'h' : '件';
  const fmt = mode === 'hours' ? (v) => v.toFixed(1) : (v) => String(v);

  const Tab = ({ value, label }) => (
    <button onClick={() => setMode(value)} style={{
      padding: '3px 10px', border: 'none', borderRadius: 4,
      background: mode === value ? t.CARD : 'transparent',
      color: mode === value ? t.ACCENT : t.MUTED,
      fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  );

  return (
    <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: 18 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>案件タイプ別配分</div>
        <div style={{ display: 'flex', gap: 2, background: t.SUBTLE, borderRadius: 5, padding: 2 }}>
          <Tab value="hours" label="時間" />
          <Tab value="count" label="件数" />
        </div>
      </div>
      <V5DonutFlex t={t} entries={entries} types={store.types} unit={unit} fmt={fmt} />
    </div>
  );
}

function V5DonutFlex({ t, entries, types, unit, fmt }) {
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const getType = (k) => (types && types[k]) || PROJECT_TYPES[k];
  let acc = 0;
  const R = 60, CX = 90, CY = 90, SW = 22;
  const C = 2 * Math.PI * R;

  if (entries.length === 0) {
    return (
      <div style={{
        padding: 30, fontSize: 11, color: t.MUTED, textAlign: 'center',
        border: `1px dashed ${t.BORDER}`, borderRadius: 6,
      }}>データがありません</div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width="180" height="180">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={t.SUBTLE} strokeWidth={SW} />
        {entries.map(([k, v]) => {
          const tp = getType(k);
          const frac = v / total;
          const dash = C * frac;
          const offset = -acc * C;
          acc += frac;
          return (
            <circle key={k} cx={CX} cy={CY} r={R} fill="none"
              stroke={tp?.color || t.ACCENT} strokeWidth={SW}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${CX} ${CY})`} />
          );
        })}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill={t.TEXT} fontFamily="JetBrains Mono">
          {fmt(total)}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" fill={t.MUTED}>{unit} 合計</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(([k, v]) => {
          const tp = getType(k);
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: tp?.color || t.ACCENT }} />
              <div style={{ flex: 1, fontSize: 11, color: t.TEXT }}>{tp?.name || k}</div>
              <div style={{ fontSize: 11, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
                {fmt(v)}{unit}
              </div>
              <div style={{ fontSize: 10, color: t.MUTED, minWidth: 32, textAlign: 'right' }}>
                {((v / total) * 100).toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
window.V5TypeDistribution = V5TypeDistribution;

// V4Report を上書きして 案件タイプ別配分セクションだけ V5TypeDistribution に差し替え
const _origV4Report = window.V4Report;
window.V4Report = function V4ReportV5({ t, store }) {
  const [range, setRange] = React.useState('year');
  const [selectedType, setSelectedType] = React.useState('oneillust');

  // 'total' は累計（全期間、pr.actualH ベース）。他は logs の期間フィルタ
  const useAllTime = range === 'total';
  const rb = useAllTime ? null : window.getRangeBoundaries(range);
  const filteredLogs = useAllTime ? null : (store?.logs || []).filter(l => {
    const d = window.logDateOnly(l);
    if (!d) return false;
    return d >= rb.start && d < rb.end;
  });

  // 工程別累計時間
  const byType = {};
  if (useAllTime) {
    store.projects.forEach(p => {
      p.processes.forEach(pr => {
        byType[pr.type] = (byType[pr.type] || 0) + pr.actualH;
      });
    });
  } else {
    filteredLogs.forEach(l => {
      byType[l.type] = (byType[l.type] || 0) + (Number(l.hours) || 0);
    });
  }
  const typeEntries = Object.entries(byType).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const maxType = Math.max(...typeEntries.map(([, v]) => v), 1);

  // 今週合計（KPI カード用、range とは独立して常に「今週」）
  const totalWeek = (() => {
    const pad = (n) => String(n).padStart(2, '0');
    const dk = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const realToday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
    const dow = realToday.getDay();
    const off = dow === 0 ? 6 : dow - 1;
    const ws = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate() - off);
    const we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 7);
    return (store?.logs || []).reduce((sum, l) => {
      let lk = l.date;
      if (!lk && l.createdAt) {
        const d = new Date(l.createdAt);
        if (!isNaN(d.getTime())) lk = dk(d);
      }
      if (!lk) return sum;
      if (lk >= dk(ws) && lk < dk(we)) return sum + (Number(l.hours) || 0);
      return sum;
    }, 0);
  })();

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: t.TEXT, letterSpacing: -0.3 }}>レポート</div>
        <div style={{ fontSize: 11, color: t.MUTED, marginTop: 2 }}>作業時間の内訳と傾向</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <ReportStat t={t} label="今週の作業時間" value={totalWeek.toFixed(1)} unit="h" sub={`目標 25h / ${Math.round((totalWeek / 25) * 100)}%`} trend="" />
        <ReportStat t={t} label="稼働日数" value="6" unit="日" sub="平均 3.9h / 日" trend="休息1日" />
        <ReportStat t={t} label="完了工程" value="3" unit="件" sub="構図ラフ × 3" trend="進行中17" />
        <ReportStat t={t} label="最長集中" value="5.0" unit="h" sub="水 · 線画・基礎塗り" trend="👑" />
      </div>

      {/* 期間別の集計（4 ブロックすべてを期間フィルタの対象にする） */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.MUTED, letterSpacing: 0.4 }}>
            期間別の集計
          </div>
          <div style={{ fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
            {useAllTime ? '累計（全期間）' : rb.label}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: t.SUBTLE, borderRadius: 6, padding: 2 }}>
          {[['month', '月'], ['year', '年'], ['total', '累計']].map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)} style={{
              padding: '5px 14px', border: 'none', borderRadius: 4,
              background: range === k ? t.CARD : 'transparent',
              color: range === k ? t.ACCENT : t.MUTED,
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* 案件別サマリー + 案件タイプ別・工程平均
          useAllTime 時は logs={undefined} で全期間 pr.actualH ベース集計に切替 */}
      <div style={{ margin: '0 -20px' }}>
        <V5DashboardRow t={t} store={store} selectedType={selectedType} setSelectedType={setSelectedType} logs={filteredLogs || undefined} />
      </div>

      {/* 期間内に完了した案件 (完了日 = 最終工程の最終提出日 || 案件締切) */}
      <V5CompletedInRange t={t} store={store} useAllTime={useAllTime} rb={rb} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT, marginBottom: 14 }}>工程別・累計時間</div>
          {typeEntries.length === 0 && (
            <div style={{ fontSize: 11, color: t.MUTED, padding: '20px 8px', textAlign: 'center' }}>
              {useAllTime ? '実績の記録がありません' : 'この期間には記録がありません'}
            </div>
          )}
          {typeEntries.map(([k, v]) => {
            const col = processColor(k, 'solid', t.dark ? 'dark' : 'light');
            const pct = (v / maxType) * 100;
            return (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: col }} />
                    <span style={{ fontSize: 11.5, color: t.TEXT, fontWeight: 500 }}>{PROCESS_COLORS[k]?.name || k}</span>
                  </div>
                  <span style={{ fontSize: 11, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', fontWeight: 600 }}>
                    {v.toFixed(1)}<span style={{ fontSize: 9, color: t.MUTED, fontWeight: 400 }}>h</span>
                  </span>
                </div>
                <div style={{ height: 7, background: t.SUBTLE, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${col}aa, ${col})` }} />
                </div>
              </div>
            );
          })}
        </div>

        <V5TypeDistribution t={t} store={store} logs={filteredLogs || undefined} />
      </div>
    </div>
  );
};

// ============ 21. 作業記録: 日付指定で入力可能に ============
// logs にオプションの date フィールド (YYYY-MM-DD) を追加。
// 今日のパネルは「date が今日 もしくは未設定」のログのみ表示。
// 他日付で追加した記録は store に保存され、レポート等で参照可能（パネルには出さず今日集計を清潔に保つ）。
const TODAY_DATE = TODAY;
const pad2 = (n) => String(n).padStart(2, '0');
const toDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const TODAY_KEY = toDateKey(TODAY_DATE);
window.TODAY_DATE = TODAY_DATE;
window.toDateKey = toDateKey;
window.TODAY_KEY = TODAY_KEY;

// レポート: 期間内に完了した案件一覧
function V5CompletedInRange({ t, store, useAllTime, rb }) {
  const projects = store?.projects || [];
  const isDoneOf = (p) => (p.boardStatus || (typeof computedBoardStatus === 'function' ? computedBoardStatus(p) : 'todo')) === 'done';
  const items = projects
    .filter(p => isDoneOf(p))
    .map(p => ({ p, d: projectCompletionDate(p) }))
    .filter(x => useAllTime ? true : (x.d && x.d >= rb.start && x.d < rb.end))
    .sort((a, b) => {
      // 完了日降順、不明は末尾
      if (!a.d && !b.d) return 0;
      if (!a.d) return 1;
      if (!b.d) return -1;
      return b.d - a.d;
    });
  const ff = '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif';
  return (
    <div style={{
      background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10,
      padding: 18, marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>
          期間内に完了した案件 <span style={{ fontSize: 11, color: t.MUTED, fontWeight: 500 }}>({items.length}件)</span>
        </div>
        <div style={{ fontSize: 10, color: t.MUTED }}>
          完了日 = 最終工程の最終提出日 ／ 未設定なら案件締切
        </div>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 11, color: t.MUTED }}>
          この期間に完了した案件はありません
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map(({ p, d }, i) => {
            const ty = store.types?.[p.typeId] || PROJECT_TYPES[p.typeId];
            const actualSum = p.processes.reduce((s, x) => s + (Number(x.actualH) || 0), 0);
            const isLast = i === items.length - 1;
            const dn = store?.displayName ? store.displayName(p) : p.name;
            return (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 90px 80px 60px', gap: 12,
                alignItems: 'center', padding: '8px 4px',
                borderBottom: !isLast ? `1px solid ${t.BORDER}` : 'none',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: t.TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dn}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 1 }}>
                    {ty && <span style={{ fontSize: 10, color: typeColor(ty), fontWeight: 600 }}>{ty.name}</span>}
                    {p.client && <span style={{ fontSize: 10, color: t.MUTED }}>· {p.client}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: t.MUTED, fontFamily: ff, textAlign: 'right' }}>
                  {d ? `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}` : '完了日不明'}
                </div>
                <div style={{ fontSize: 11, color: t.TEXT, fontWeight: 600, fontFamily: ff, textAlign: 'right' }}>
                  {actualSum.toFixed(1)}<span style={{ fontSize: 9, color: t.MUTED, fontWeight: 400 }}>h</span>
                </div>
                <div style={{ fontSize: 10, color: t.MUTED, textAlign: 'right' }}>
                  工程 {p.processes.length}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
window.V5CompletedInRange = V5CompletedInRange;

// 案件の「完了日」: 最終工程 (processes 末尾) の最後の提出日 → 案件締切 → null
// 確定申告など、年/月で完了案件を振り返るときの基準値として使う
function projectCompletionDate(p) {
  if (!p || !Array.isArray(p.processes) || p.processes.length === 0) return null;
  const lastProc = p.processes[p.processes.length - 1];
  const deadlines = (lastProc.deadlines || [])
    .map(d => d instanceof Date ? d : (d ? new Date(d) : null))
    .filter(d => d && !isNaN(d.getTime()));
  if (deadlines.length > 0) {
    const maxMs = Math.max(...deadlines.map(d => d.getTime()));
    return new Date(maxMs);
  }
  if (p.deadline) {
    const d = p.deadline instanceof Date ? p.deadline : new Date(p.deadline);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}
window.projectCompletionDate = projectCompletionDate;

// レポート期間フィルタ用の境界計算
// range: 'month' | 'year' | 'total' → { start, end (exclusive), label }
function getRangeBoundaries(range) {
  // render 時に再計算（モジュールロード時 TODAY が日付をまたいで stale になるのを避ける）
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  if (range === 'week') {
    const dow = today.getDay();
    const off = dow === 0 ? 6 : dow - 1;
    const start = new Date(y, m, d - off);
    const end = new Date(y, m, d - off + 7);
    const last = new Date(end.getTime() - 86400000);
    return {
      start, end,
      label: `${start.getFullYear()}/${pad2(start.getMonth()+1)}/${pad2(start.getDate())} - ${pad2(last.getMonth()+1)}/${pad2(last.getDate())}`,
    };
  }
  if (range === 'month') {
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);
    return { start, end, label: `${y}年 ${m + 1}月` };
  }
  if (range === 'quarter') {
    const qm = Math.floor(m / 3) * 3;
    const start = new Date(y, qm, 1);
    const end = new Date(y, qm + 3, 1);
    return { start, end, label: `${y}年 Q${Math.floor(m/3)+1}` };
  }
  // year
  const start = new Date(y, 0, 1);
  const end = new Date(y + 1, 0, 1);
  return { start, end, label: `${y}年` };
}
// log から日付（時刻無し）を取り出す。l.date 優先、無ければ l.createdAt から
function logDateOnly(l) {
  if (l.date) {
    const [y, m, dd] = l.date.split('-').map(Number);
    if (y && m && dd) return new Date(y, m - 1, dd);
    return null;
  }
  if (l.createdAt) {
    const td = new Date(l.createdAt);
    if (isNaN(td.getTime())) return null;
    return new Date(td.getFullYear(), td.getMonth(), td.getDate());
  }
  return null;
}
window.getRangeBoundaries = getRangeBoundaries;
window.logDateOnly = logDateOnly;

window.V4TodayLog = function V4TodayLogV5({ t, store }) {
  // 「今日」は render 時に再計算（アプリ起動後に日付をまたいだ場合に対応）
  const realToday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const realTodayKey = toDateKey(realToday);
  const [form, setForm] = React.useState(() => ({
    date: realTodayKey,
    projectId: '',
    type: '',
  }));
  const [flash, setFlash] = React.useState(null);

  // ログの実効日付を date / createdAt から導出（chart と一貫）
  // 双方無い超レガシーログのみ realTodayKey にフォールバック
  const effectiveDate = (l) => {
    if (l.date) return l.date;
    if (l.createdAt) {
      const d = new Date(l.createdAt);
      if (!isNaN(d.getTime())) return toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    return realTodayKey;
  };
  const viewLogs = store.logs.filter(l => effectiveDate(l) === form.date);
  const totalView = viewLogs.reduce((s, l) => s + l.hours, 0);

  const selectedProj = store.projects.find(p => p.id === form.projectId);
  const procOptions = selectedProj?.processes || [];

  // タイムラインで form.date のセルが塗られている候補 (projectId + 工程) を抽出
  // DATA_START は固定 (2026-04-15) で他のファイルと揃える
  const dateToDayIdx = React.useCallback((dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const DS = new Date(2026, 3, 15);
    return Math.round((dt - DS) / 86400000);
  }, []);

  const timelineCandidates = React.useMemo(() => {
    const dayIdx = dateToDayIdx(form.date);
    const out = [];
    const seen = new Set();
    store.projects.forEach(p => {
      p.processes.forEach(pr => {
        if ((pr.days || []).includes(dayIdx)) {
          const key = p.id + '::' + pr.type;
          if (seen.has(key)) return;
          seen.add(key);
          out.push({ projectId: p.id, projectName: p.name, type: pr.type });
        }
      });
    });
    return out;
  }, [store.projects, form.date, dateToDayIdx]);

  // 自動追加: form.date を初めて開いたタイミングで、タイムライン候補のうち
  // まだログが無い (project, type) の組を hours=0 のログとして即追加する。
  // 2回目以降の訪問 (追加済みを削除した状態) では再追加しない。
  const autoAddedDatesRef = React.useRef(new Set());
  React.useEffect(() => {
    if (autoAddedDatesRef.current.has(form.date)) return;
    autoAddedDatesRef.current.add(form.date);
    const existingKeys = new Set(
      store.logs
        .filter(l => effectiveDate(l) === form.date)
        .map(l => l.projectId + '::' + l.type)
    );
    timelineCandidates.forEach(c => {
      const key = c.projectId + '::' + c.type;
      if (existingKeys.has(key)) return;
      store.addLog({
        projectId: c.projectId,
        type: c.type,
        hours: 0,
        date: form.date,
        createdAt: Date.now(),
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, timelineCandidates]);

  const onProjectChange = (pid) => {
    const p = store.projects.find(x => x.id === pid);
    const firstType = p?.processes[0]?.type || '';
    setForm(f => ({ ...f, projectId: pid, type: firstType }));
  };

  const shiftDate = (days) => {
    const [y, mo, d] = form.date.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    dt.setDate(dt.getDate() + days);
    // 日付を変えたら案件・工程は一旦クリアして自動セットに任せる
    setForm({ date: toDateKey(dt), projectId: '', type: '' });
  };

  const canSubmit = form.projectId && form.type;
  const submit = () => {
    if (!canSubmit) return;
    store.addLog({
      projectId: form.projectId,
      type: form.type,
      hours: 0,
      date: form.date,
      createdAt: Date.now(),
    });
    if (form.date !== realTodayKey) {
      const [, mo, da] = form.date.split('-');
      setFlash(`${parseInt(mo, 10)}/${parseInt(da, 10)} に追加しました`);
      setTimeout(() => setFlash(null), 2400);
    }
    setForm(f => ({ ...f, projectId: '', type: '' }));
  };

  const selStyle = {
    padding: '6px 8px', fontSize: 11.5, border: `1px solid ${t.BORDER}`,
    borderRadius: 5, background: t.CARD, color: t.TEXT,
    fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
  };
  const arrowBtnStyle = {
    width: 26, height: 28, border: `1px solid ${t.BORDER}`, borderRadius: 5,
    background: t.CARD, color: t.MUTED, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
  const isToday = form.date === realTodayKey;
  const dateLabel = isToday ? '今日の作業記録' : '作業記録';

  return (
    <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.ACCENT} strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          {dateLabel}
        </div>
        <div style={{ fontSize: 11, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
          {viewLogs.length}件
        </div>
      </div>

      {/* ① 日付 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
        <button onClick={() => shiftDate(-1)} title="前日" style={arrowBtnStyle}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <input type="date" value={form.date} max={realTodayKey}
          onChange={e => setForm(f => ({ ...f, date: e.target.value, projectId: '', type: '' }))}
          style={{ ...selStyle, textAlign: 'center', height: 28, padding: '0 8px' }} />
        <button onClick={() => shiftDate(1)} title="翌日"
          disabled={form.date >= realTodayKey}
          style={{ ...arrowBtnStyle, opacity: form.date >= realTodayKey ? 0.3 : 1,
            cursor: form.date >= realTodayKey ? 'default' : 'pointer' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <button onClick={() => setForm({ date: realTodayKey, projectId: '', type: '' })}
          disabled={isToday}
          title="今日に戻る"
          style={{
            ...arrowBtnStyle, width: 'auto', padding: '0 10px', fontSize: 10.5, fontWeight: 600,
            fontFamily: 'inherit',
            color: isToday ? t.MUTED : t.ACCENT,
            borderColor: isToday ? t.BORDER : `${t.ACCENT}66`,
            background: isToday ? t.CARD : `${t.ACCENT}12`,
            opacity: isToday ? 0.5 : 1,
            cursor: isToday ? 'default' : 'pointer',
          }}>今日</button>
      </div>

      {/* ② 案件 + ③ 工程 + ④ 追加ボタン 一行横並び */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, marginBottom: 12,
      }}>
        <select value={form.projectId} onChange={e => onProjectChange(e.target.value)}
          style={{ ...selStyle, color: form.projectId ? t.TEXT : t.MUTED }}>
          <option value="">案件…</option>
          {store.projects.map(p => (
            <option key={p.id} value={p.id}>{store.displayName ? store.displayName(p) : p.name}</option>
          ))}
        </select>
        <select value={form.type}
          disabled={!form.projectId}
          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          style={{
            ...selStyle,
            color: form.type ? t.TEXT : t.MUTED,
            opacity: form.projectId ? 1 : 0.5,
            cursor: form.projectId ? 'pointer' : 'default',
          }}>
          <option value="">工程…</option>
          {procOptions.map(pr => (
            <option key={pr.id} value={pr.type}>{PROCESS_COLORS[pr.type]?.name || pr.type}</option>
          ))}
        </select>
        <button onClick={submit} disabled={!canSubmit} title="作業を追加" style={{
          padding: '0 12px', fontSize: 11.5, fontWeight: 600, border: 'none', borderRadius: 5,
          background: canSubmit ? t.ACCENT : t.SUBTLE,
          color: canSubmit ? 'white' : t.MUTED,
          cursor: canSubmit ? 'pointer' : 'default', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          追加
        </button>
      </div>

      {flash && (
        <div style={{
          padding: '6px 10px', background: `${t.ACCENT}18`, border: `1px solid ${t.ACCENT}44`,
          borderRadius: 5, fontSize: 10.5, color: t.ACCENT, marginBottom: 8, textAlign: 'center',
        }}>{flash}</div>
      )}

      {viewLogs.length === 0 && (
        <div style={{
          padding: 12, fontSize: 11, color: t.MUTED, textAlign: 'center',
          border: `1px dashed ${t.BORDER}`, borderRadius: 6, marginBottom: 10,
        }}>この日の記録はまだありません</div>
      )}

      {viewLogs.map(log => {
        const p = store.projects.find(x => x.id === log.projectId);
        const col = processColor(log.type, 'solid', t.dark ? 'dark' : 'light');
        return (
          <div key={log.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 6, marginBottom: 4, background: t.SUBTLE,
          }}>
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, minHeight: 24, background: col }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p ? (store.displayName ? store.displayName(p) : p.name) : ''}</div>
              <div style={{ fontSize: 10, color: t.MUTED }}>{PROCESS_COLORS[log.type]?.name}</div>
            </div>
            {/* 時間インライン入力（行背景より一段薄いBG色）*/}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px',
              background: t.BG, border: `1px solid ${t.BORDER}`, borderRadius: 5,
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
              onFocus={e => { e.currentTarget.style.borderColor = t.ACCENT; e.currentTarget.style.boxShadow = `0 0 0 2px ${t.ACCENT}22`; }}
              onBlur={e => { e.currentTarget.style.borderColor = t.BORDER; e.currentTarget.style.boxShadow = 'none'; }}>
              <input type="number" step="0.25" min="0"
                value={log.hours === 0 ? '' : log.hours}
                placeholder="0"
                onChange={e => store.updateLog(log.id, {
                  hours: parseFloat(e.target.value) || 0,
                  // date が無い古いログは表示中の日付に固定（チャートと整合させる）
                  date: log.date || form.date,
                })}
                style={{
                  width: 42, fontSize: 13, fontWeight: 700, border: 'none',
                  background: 'transparent', color: t.TEXT, outline: 'none',
                  fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                  textAlign: 'right', padding: 0, letterSpacing: -0.5,
                }} />
              <span style={{ fontSize: 10, color: t.MUTED, fontWeight: 500 }}>h</span>
            </div>
            <button onClick={() => store.deleteLog(log.id)} title="削除" style={{
              width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer',
              color: t.MUTED, borderRadius: 3,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        );
      })}

      <div style={{
        marginTop: 10, padding: '10px 12px',
        border: `1px solid ${t.ACCENT}33`, background: `${t.ACCENT}12`, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 10, color: t.MUTED }}>{isToday ? '本日合計' : '合計'}</div>
          {isToday && (
            <div style={{ fontSize: 10, color: t.MUTED, marginTop: 2 }}>目標 3.0h / {Math.round(totalView / 3 * 100)}%</div>
          )}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.ACCENT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', letterSpacing: 0 }}>
          {totalView.toFixed(1)}<span style={{ fontSize: 12, marginLeft: 3 }}>h</span>
        </div>
      </div>
    </div>
  );
};

// ============ 22. 新規案件モーダルを store に保存するよう接続 ============
window.V3NewProjectModal = function V3NewProjectModalV5({ t, store, onClose }) {
  const [name, setName] = React.useState('');
  const [deadlineDate, setDeadlineDate] = React.useState('');
  const [deadlineText, setDeadlineText] = React.useState('');
  const [note, setNote] = React.useState('');
  const [selectedProcesses, setSelectedProcesses] = React.useState([]);
  const [selectedTypeId, setSelectedTypeId] = React.useState(null);
  const [newProcName, setNewProcName] = React.useState('');
  const [newTypeName, setNewTypeName] = React.useState('');
  const [showNewProc, setShowNewProc] = React.useState(false);
  const [showNewType, setShowNewType] = React.useState(false);
  const [checklist, setChecklist] = React.useState(() => makeChecklistFromTemplate());
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  const [checklistInput, setChecklistInput] = React.useState('');

  const allTypes = (store && store.types) || PROJECT_TYPES;

  const toggleProc = (key) => {
    setSelectedProcesses(selectedProcesses.includes(key)
      ? selectedProcesses.filter(x => x !== key)
      : [...selectedProcesses, key]);
  };
  const applyTypeTemplate = (typeId) => {
    setSelectedTypeId(typeId);
    const tp = allTypes[typeId];
    if (tp?.typicalProcesses) setSelectedProcesses(tp.typicalProcesses);
  };

  const toggleChk = (id) => setChecklist(cs => cs.map(c => c.id === id ? { ...c, done: !c.done } : c));
  const delChk = (id) => setChecklist(cs => cs.filter(c => c.id !== id));
  const addChk = () => {
    const txt = checklistInput.trim();
    if (!txt) return;
    setChecklist(cs => [...cs, { id: 'c' + Date.now(), text: txt, done: false }]);
    setChecklistInput('');
  };

  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave || !store) return;
    // 既存案件の最大 day を基準に、新規案件の工程は以降から 5 日ずつ割り当て
    const allDays = store.projects.flatMap(p => p.processes.flatMap(pr => pr.days));
    let startDay = allDays.length > 0 ? Math.max(...allDays) + 1 : 6;

    const processes = selectedProcesses.map((type, i) => {
      const avgH = selectedTypeId && TYPE_PROCESS_AVG[selectedTypeId]?.[type];
      const plannedH = avgH ? Math.round(avgH * 10) / 10 : 8;
      const dayCount = Math.max(1, Math.round(plannedH / 3));
      const days = Array.from({ length: dayCount }, (_, k) => startDay + k);
      startDay += dayCount;
      return {
        id: 'pr' + Date.now() + '_' + i,
        type, plannedH, actualH: 0, days,
      };
    });

    let deadline = null;
    if (deadlineDate) {
      const [y, mo, d] = deadlineDate.split('-').map(Number);
      if (y && mo && d) deadline = new Date(y, mo - 1, d);
    }

    store.addProject({
      name: name.trim(),
      typeId: selectedTypeId || Object.keys(allTypes)[0],
      deadline,
      client: deadlineText.trim() || undefined,
      note: note.trim() || undefined,
      processes,
      checklist,
    });
    onClose();
  };

  return (
    <ModalShell t={t} title="新しい案件を作成" onClose={onClose} width={620}>
      <Field t={t} label="① 案件名" required>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="例: 案件サンプル1"
          style={inputStyle(t)} />
      </Field>

      <Field t={t} label="② 締め切り" hint="日付を指定するとタイムラインにハイライト / フリーテキストも可">
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8, alignItems: 'center' }}>
          <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
            style={inputStyle(t)} />
          <input value={deadlineText} onChange={e => setDeadlineText(e.target.value)}
            placeholder="例: 5月末まで / GW明け"
            style={inputStyle(t)} />
        </div>
      </Field>

      <Field t={t} label="③ 案件タイプ" hint="選ぶと ④ の工程テンプレートが自動で入ります">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8,
          border: `1px solid ${t.BORDER}`, borderRadius: 8, background: t.SUBTLE, minHeight: 44,
        }}>
          {Object.values(allTypes).map(ty => {
            const active = ty.id === selectedTypeId;
            const tc = typeColor(ty);
            return (
              <button key={ty.id} onClick={() => applyTypeTemplate(ty.id)} style={{
                padding: '4px 10px', borderRadius: 16,
                border: `1px solid ${active ? tc : t.BORDER}`,
                background: active ? `${tc}20` : t.CARD,
                color: active ? tc : t.MUTED,
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: tc }} />
                {ty.name}
                {active && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5L20 7"/></svg>}
              </button>
            );
          })}
          {showNewType ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                placeholder="タイプ名 (例: ロゴ制作)" autoFocus
                onKeyDown={e => e.key === 'Enter' && (setShowNewType(false), setNewTypeName(''))}
                style={{ ...inputStyle(t), padding: '3px 8px', fontSize: 11, width: 140, borderRadius: 16 }} />
              <button onClick={() => { setShowNewType(false); setNewTypeName(''); }} style={{
                width: 22, height: 22, border: 'none', background: t.ACCENT, color: 'white',
                borderRadius: '50%', cursor: 'pointer', fontSize: 10,
              }}>✓</button>
            </div>
          ) : (
            <button onClick={() => setShowNewType(true)} style={{
              padding: '4px 10px', borderRadius: 16, border: `1px dashed ${t.BORDER}`,
              background: 'transparent', color: t.MUTED, fontSize: 11, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>＋ タイプを追加</button>
          )}
        </div>
      </Field>

      <Field t={t} label="④ 工程" hint="タイプ選択後に自動で入ります / タグをクリックで調整 / 右端の＋で新規追加">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8,
          border: `1px solid ${t.BORDER}`, borderRadius: 8, background: t.SUBTLE, minHeight: 44,
        }}>
          {Object.entries(PROCESS_COLORS).map(([key, p]) => {
            const active = selectedProcesses.includes(key);
            return (
              <button key={key} onClick={() => toggleProc(key)} style={{
                padding: '4px 10px', borderRadius: 16,
                border: `1px solid ${active ? processColor(key, 'border', t.dark ? 'dark' : 'light') : t.BORDER}`,
                background: active ? processColor(key, 'fill', t.dark ? 'dark' : 'light') : t.CARD,
                color: active ? processColor(key, 'solid', t.dark ? 'dark' : 'light') : t.MUTED,
                filter: active && !t.dark ? 'brightness(0.7)' : 'none',
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%',
                  background: processColor(key, 'solid', t.dark ? 'dark' : 'light') }} />
                {p.name}
                {active && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5L20 7"/></svg>}
              </button>
            );
          })}
          {showNewProc ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input value={newProcName} onChange={e => setNewProcName(e.target.value)}
                placeholder="工程名" autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const key = window.v5AddCustomProcess && window.v5AddCustomProcess(newProcName);
                    if (key && !selectedProcesses.includes(key)) toggleProc(key);
                    setShowNewProc(false); setNewProcName('');
                  } else if (e.key === 'Escape') {
                    setShowNewProc(false); setNewProcName('');
                  }
                }}
                style={{ ...inputStyle(t), padding: '3px 8px', fontSize: 11, width: 100, borderRadius: 16 }} />
              <button onClick={() => {
                const key = window.v5AddCustomProcess && window.v5AddCustomProcess(newProcName);
                if (key && !selectedProcesses.includes(key)) toggleProc(key);
                setShowNewProc(false); setNewProcName('');
              }} disabled={!newProcName.trim()} style={{
                width: 22, height: 22, border: 'none',
                background: newProcName.trim() ? t.ACCENT : t.SUBTLE,
                color: newProcName.trim() ? 'white' : t.MUTED,
                borderRadius: '50%', cursor: newProcName.trim() ? 'pointer' : 'default', fontSize: 10,
              }}>✓</button>
              <button onClick={() => { setShowNewProc(false); setNewProcName(''); }} title="キャンセル" style={{
                width: 22, height: 22, border: `1px solid ${t.BORDER}`, background: 'transparent',
                color: t.MUTED, borderRadius: '50%', cursor: 'pointer', fontSize: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ) : (
            <button onClick={() => setShowNewProc(true)} style={{
              padding: '4px 10px', borderRadius: 16, border: `1px dashed ${t.BORDER}`,
              background: 'transparent', color: t.MUTED, fontSize: 11, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3,
            }}>＋ 工程を追加</button>
          )}
        </div>
      </Field>

      <Field t={t} label="⑤ 詳細" hint="メモと事務チェックリスト（作成後も編集可）">
        <div style={{ border: `1px solid ${t.BORDER}`, borderRadius: 8, background: t.SUBTLE, overflow: 'hidden' }}>
          <button onClick={() => setDetailsExpanded(v => !v)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            padding: '10px 12px', border: 'none', background: 'transparent',
            color: t.TEXT, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            textAlign: 'left',
          }}>
            <span style={{ color: t.MUTED, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {detailsExpanded
                ? '折りたたむ'
                : (() => {
                    const parts = [];
                    parts.push(note.trim() ? 'メモあり' : 'メモなし');
                    parts.push(checklist.length > 0 ? `事務チェック ${checklist.length}項目` : '事務チェックなし');
                    return parts.join(' · ');
                  })()}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: detailsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0, color: t.MUTED }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {detailsExpanded && (
            <div style={{ padding: 12, borderTop: `1px solid ${t.BORDER}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* メモ */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.MUTED, marginBottom: 6 }}>メモ</div>
                <V5AutoGrowTextarea value={note} onChange={setNote}
                  t={t} placeholder="案件に関する自由メモ（任意）" maxHeight={500} />
              </div>
              {/* 事務チェック */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.MUTED }}>
                    事務チェック
                    {checklist.length > 0 && (
                      <span style={{ marginLeft: 6, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', fontWeight: 600 }}>
                        {checklist.length}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: t.MUTED, fontStyle: 'italic', textAlign: 'right' }}>
                    ※ カードビューでのみ表示されます
                  </div>
                </div>
                {checklist.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                    {checklist.map(i => (
                      <div key={i.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px',
                      }}>
                        <input type="checkbox" checked={i.done} onChange={() => toggleChk(i.id)}
                          style={{ width: 13, height: 13, accentColor: t.ACCENT, cursor: 'pointer', flexShrink: 0, margin: 0 }} />
                        <span style={{
                          flex: 1, fontSize: 11.5, color: i.done ? t.MUTED : t.TEXT,
                          textDecoration: i.done ? 'line-through' : 'none',
                        }}>{i.text}</span>
                        <button onClick={() => delChk(i.id)} title="削除" style={{
                          width: 18, height: 18, border: 'none', background: 'transparent',
                          color: t.MUTED, cursor: 'pointer', borderRadius: 3, opacity: 0.6,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={checklistInput} onChange={e => setChecklistInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addChk()}
                    placeholder="新しいチェック項目 (Enter で追加)"
                    style={{ ...inputStyle(t), flex: 1, padding: '6px 10px', fontSize: 11.5, background: t.CARD }} />
                  <button onClick={addChk} disabled={!checklistInput.trim()} style={{
                    padding: '6px 12px', border: 'none', borderRadius: 6,
                    background: checklistInput.trim() ? t.ACCENT : t.CARD,
                    color: checklistInput.trim() ? 'white' : t.MUTED,
                    fontSize: 11, fontWeight: 600, cursor: checklistInput.trim() ? 'pointer' : 'default',
                    fontFamily: 'inherit', flexShrink: 0,
                  }}>追加</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Field>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <div style={{ fontSize: 11, color: t.MUTED }}>
          {selectedProcesses.length > 0 && `${selectedProcesses.length}工程 · `}
          {selectedTypeId && TYPE_PROCESS_AVG[selectedTypeId] &&
            `見積 ${Object.values(TYPE_PROCESS_AVG[selectedTypeId]).reduce((a, b) => a + b, 0).toFixed(1)}h`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={buttonStyle(t, 'ghost')}>キャンセル</button>
          <button onClick={save} disabled={!canSave} style={{
            ...buttonStyle(t, 'primary'),
            opacity: canSave ? 1 : 0.4,
            cursor: canSave ? 'pointer' : 'default',
          }}>案件を作成</button>
        </div>
      </div>
    </ModalShell>
  );
};

// ============ 22. V3Greeting: 実データで今日の工程・集計を表示 ============
window.V3Greeting = function V3GreetingV5({ t, store }) {
  const projects = store?.projects || [];
  const logs = store?.logs || [];
  const types = store?.types || PROJECT_TYPES;

  // グリーティングアイコンの Wクリックで編集モーダルを開く
  const [iconEditorOpen, setIconEditorOpen] = React.useState(false);
  React.useEffect(() => {
    const h = () => setIconEditorOpen(true);
    window.addEventListener('greetingicon-edit-request', h);
    return () => window.removeEventListener('greetingicon-edit-request', h);
  }, []);

  // render 時に「今日」を再計算
  const realToday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const realTodayKey = toDateKey(realToday);

  const DATA_START = new Date(2026, 3, 15);
  const todayDayIdx = Math.round((realToday - DATA_START) / 86400000);
  const tomorrow = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);

  // 今日予定されている工程 (project × process) + 今日/明日の提出・締切件数を 1 ループで集計
  const todayProcs = [];
  let dueToday = 0;     // 今日 提出/締切（案件 deadline + 工程 pr.deadlines[]、完了除く）
  let dueTomorrow = 0;  // 明日 提出/締切
  const tallyDeadline = (d) => {
    if (!d) return;
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return;
    const dk = toDateKey(dt);
    if (dk === realTodayKey) dueToday++;
    else if (dk === tomorrowKey) dueTomorrow++;
  };
  projects.forEach(p => {
    const st = p.boardStatus || computedBoardStatus(p);
    // 完了 / 保留中 は今日の予定や締切煽りから除外
    if (st === 'done' || st === 'onhold') return;
    tallyDeadline(p.deadline);
    p.processes.forEach(pr => {
      if (!pr.completed) (pr.deadlines || []).forEach(d => tallyDeadline(d));
      if ((pr.days || []).includes(todayDayIdx)) {
        todayProcs.push({ project: p, pr });
      }
    });
  });

  // 今日の作業記録 (実績) — date / createdAt のいずれかが今日の logs
  const isLogToday = (l) => {
    if (l.date) return l.date === realTodayKey;
    if (l.createdAt) {
      const d = new Date(l.createdAt);
      if (!isNaN(d.getTime())) return toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate())) === realTodayKey;
    }
    return false;
  };
  const todayLogs = logs.filter(isLogToday);
  const todayTotal = todayLogs.reduce((s, l) => s + (Number(l.hours) || 0), 0);

  // 今週累計 (月曜始まり)
  const dayOfWeek = realToday.getDay(); // 0=Sun
  const monDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate() + monDiff);
  const weekTotal = logs.reduce((s, l) => {
    if (!l.date) return s;
    const [y, m, d] = l.date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt >= weekStart && dt <= realToday) return s + (Number(l.hours) || 0);
    return s;
  }, 0);

  // 次の締切 (未完了案件のうち最も近い、保留中は除外)
  let nextDeadlineDays = null;
  projects.forEach(p => {
    const st = p.boardStatus || computedBoardStatus(p);
    if (st === 'done' || st === 'onhold' || !p.deadline) return;
    const dl = p.deadline instanceof Date ? p.deadline : new Date(p.deadline);
    const diff = Math.round((dl - realToday) / 86400000);
    if (diff < 0) return; // 超過は無視
    if (nextDeadlineDays === null || diff < nextDeadlineDays) nextDeadlineDays = diff;
  });

  // 休息提案: 今週の目標時間（月-今日まで、平日/休日で按分）と実績から負荷率を算出
  // しきい値超のときのみ静かに 1 行表示。週初め (累積目標 < 8h) は判定をスキップ。
  const wh = store?.workHours || { weekdayHours: 4, holidayHours: 8 };
  let weeklyTargetSoFar = 0;
  for (let d = new Date(weekStart); d <= realToday; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isCustomHoliday = store?.isHoliday ? store.isHoliday(d) : false;
    const isHol = isWeekend || isCustomHoliday;
    weeklyTargetSoFar += isHol ? wh.holidayHours : wh.weekdayHours;
  }
  const loadRatio = weeklyTargetSoFar > 0 ? weekTotal / weeklyTargetSoFar : 0;
  let restTip = null;
  if (weeklyTargetSoFar >= 8 && loadRatio >= 1.1) {
    const pct = Math.round(loadRatio * 100);
    if (loadRatio >= 1.3) {
      restTip = { strong: true, text: `今週累計 ${weekTotal.toFixed(1)}h・目標の${pct}%。少し詰めすぎかも、休める時間を確保しましょう。` };
    } else {
      restTip = { strong: false, text: `今週累計 ${weekTotal.toFixed(1)}h・目標の${pct}%。意識的に休憩を取りましょう。` };
    }
  }

  // ヘッダ表示: 今日の曜日ラベル
  const weekNum = (() => {
    const jan1 = new Date(realToday.getFullYear(), 0, 1);
    return Math.ceil(((realToday - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  })();
  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const headerLabel = `${realToday.getFullYear()} · ${monthNames[realToday.getMonth()]} · WEEK ${weekNum} · ${dayNames[realToday.getDay()]}`;

  // 主文: 今日の工程 + 今日/明日の提出件数を組み合わせてバリエーション表示
  const accentSpan = (txt) => (<span style={{ color: t.ACCENT, fontWeight: 700 }}>{txt}</span>);
  const todayPartsArr = [];
  if (todayProcs.length > 0) todayPartsArr.push(`${todayProcs.length}つの工程`);
  if (dueToday > 0) todayPartsArr.push(`${dueToday}件の提出`);
  const segments = [];
  if (todayPartsArr.length > 0) segments.push({ prefix: '今日は', text: todayPartsArr.join('・') });
  if (dueTomorrow > 0) segments.push({ prefix: '明日は', text: `${dueTomorrow}件の提出` });

  let mainText;
  if (segments.length === 1) {
    mainText = (<>{segments[0].prefix}{accentSpan(segments[0].text)}が予定されています。</>);
  } else if (segments.length === 2) {
    mainText = (<>{segments[0].prefix}{accentSpan(segments[0].text)}と、{segments[1].prefix}{accentSpan(segments[1].text)}が予定されています。</>);
  } else if (todayTotal > 0) {
    mainText = (<>今日は{accentSpan(`${todayTotal}h`)}の作業を記録しました。</>);
  } else {
    mainText = <>今日は{accentSpan('お休み')}です！ゆっくりしてください。</>;
  }

  // サブ行: 予定工程 (最大3件) と、今日の実績記録の工程を重複無しで表示
  const subItems = [];
  const seenKeys = new Set();
  const dn = (p) => store?.displayName ? store.displayName(p) : p.name;
  todayProcs.slice(0, 3).forEach(x => {
    const key = x.project.id + '::' + x.pr.type;
    seenKeys.add(key);
    subItems.push({
      type: x.pr.type,
      projectName: dn(x.project),
      hours: todayLogs
        .filter(l => l.projectId === x.project.id && l.type === x.pr.type)
        .reduce((s, l) => s + (Number(l.hours) || 0), 0),
    });
  });
  // 今日の実績のうち、予定に含まれていないものも追加
  todayLogs.forEach(l => {
    const key = l.projectId + '::' + l.type;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    const proj = projects.find(p => p.id === l.projectId);
    if (!proj) return;
    subItems.push({
      type: l.type,
      projectName: dn(proj),
      hours: Number(l.hours) || 0,
    });
  });

  return (
    <div style={{
      margin: '16px 20px 0', padding: '20px 24px',
      background: t.GREET_BG, border: `1px solid ${t.ACCENT}22`, borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      {(() => {
        // ユーザーがアップロードしたアイコンがあればそれを表示。無ければデフォルトの ☕ 絵文字。
        // ダブルクリックで編集モーダルを開く
        const greeting = window.useGreetingIcon ? window.useGreetingIcon() : { url: null, bg: 'accent' };
        const customIcon = greeting.url;
        const bgValue = window.resolveGreetingIconBg
          ? window.resolveGreetingIconBg(t, greeting.bg)
          : `linear-gradient(135deg, ${t.ACCENT}, ${t.ACCENT}cc)`;
        return (
          <div onDoubleClick={() => window.dispatchEvent(new Event('greetingicon-edit-request'))}
            title="ダブルクリックで画像を変更"
            style={{
              width: 60, height: 60, borderRadius: 14,
              background: bgValue,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 30, overflow: 'hidden', flexShrink: 0,
              cursor: 'pointer', userSelect: 'none',
              border: greeting.bg === 'white' ? `1px solid ${t.BORDER}` : 'none',
            }}>
            {customIcon
              ? <img src={customIcon} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '☕'}
          </div>
        );
      })()}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 4, letterSpacing: 0.5,
          fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
          {headerLabel}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: t.TEXT, letterSpacing: -0.3 }}>
          おかえりなさい。
          <TextSwap triggerKey={`${todayProcs.length}-${dueToday}-${dueTomorrow}-${todayTotal}`}>{mainText}</TextSwap>
        </div>
        {subItems.length > 0 && (
          <div style={{ fontSize: 12, color: t.MUTED, marginTop: 4,
            display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {subItems.slice(0, 4).map((x, i) => {
              const col = processColor(x.type, 'solid', t.dark ? 'dark' : 'light');
              const procName = PROCESS_COLORS[x.type]?.name || x.type;
              const shortName = x.projectName.length > 10 ? x.projectName.slice(0, 10) + '…' : x.projectName;
              return (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {i > 0 && <span style={{ color: t.BORDER, margin: '0 2px' }}>·</span>}
                  <span style={{ color: col, fontWeight: 600 }}>● {procName}</span>
                  <span style={{ color: t.MUTED }}>({shortName})</span>
                  {x.hours > 0 && (
                    <span style={{
                      color: t.ACCENT, fontWeight: 600,
                      fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                      fontSize: 10.5,
                    }}>{x.hours}h</span>
                  )}
                </span>
              );
            })}
          </div>
        )}
        {restTip && (
          <div style={{
            marginTop: 6, fontSize: 11, fontWeight: 500,
            color: restTip.strong ? (t.dark ? '#fbbf24' : '#d97706') : t.MUTED,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ fontSize: 10 }}>🌙</span>
            <span>{restTip.text}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <GreetChip t={t} label="今日の予定" value={todayProcs.length + ''} unit="工程" color={t.ACCENT} />
        <GreetChip t={t}
          label="今週累計"
          value={weekTotal > 0 ? weekTotal.toFixed(1) : '0'}
          unit="h"
          color={t.dark ? '#5ee1a9' : '#059669'} />
        <GreetChip t={t}
          label="次の締切"
          value={nextDeadlineDays !== null ? String(nextDeadlineDays) : '—'}
          unit={nextDeadlineDays !== null ? '日' : ''}
          color={t.dark ? '#fbbf24' : '#d97706'} />
      </div>
      {iconEditorOpen && <V5GreetingIconEditor t={t} onClose={() => setIconEditorOpen(false)} />}
    </div>
  );
};
