// V3 Modals: 新規案件 / 集中モード / サブラベル編集

// ============ 新規案件モーダル ============
function V3NewProjectModal({ t, onClose }) {
  const [name, setName] = React.useState('');
  const [deadlineDate, setDeadlineDate] = React.useState(''); // YYYY-MM-DD
  const [deadlineText, setDeadlineText] = React.useState('');
  const [note, setNote] = React.useState('');
  const [selectedProcesses, setSelectedProcesses] = React.useState([]);
  const [selectedTypeId, setSelectedTypeId] = React.useState(null);
  const [newProcName, setNewProcName] = React.useState('');
  const [newTypeName, setNewTypeName] = React.useState('');
  const [showNewProc, setShowNewProc] = React.useState(false);
  const [showNewType, setShowNewType] = React.useState(false);

  const toggleProc = (key) => {
    setSelectedProcesses(selectedProcesses.includes(key)
      ? selectedProcesses.filter(x => x !== key)
      : [...selectedProcesses, key]);
  };

  const applyTypeTemplate = (typeId) => {
    setSelectedTypeId(typeId);
    const tp = PROJECT_TYPES[typeId];
    if (tp) setSelectedProcesses(tp.typicalProcesses);
  };

  return (
    <ModalShell t={t} title="新しい案件を作成" onClose={onClose} width={620}>
      {/* 1. 案件名 */}
      <Field t={t} label="① 案件名" required>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="例: 案件サンプル1"
          style={inputStyle(t)} />
      </Field>

      {/* 2. 締め切り（日付 / フリーテキスト どちらでも） */}
      <Field t={t} label="② 締め切り" hint="日付を指定するとタイムラインにハイライト / フリーテキストも可">
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8, alignItems: 'center' }}>
          <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
            style={inputStyle(t)} />
          <input value={deadlineText} onChange={e => setDeadlineText(e.target.value)}
            placeholder="例: 5月末まで / GW明け"
            style={inputStyle(t)} />
        </div>
      </Field>

      {/* 3. メモ */}
      <Field t={t} label="③ メモ" hint="案件に関する自由メモ（任意）">
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="案件に関するメモ"
          style={{ ...inputStyle(t), minHeight: 54, resize: 'vertical', fontFamily: 'inherit' }} />
      </Field>

      {/* 4. 案件タイプ */}
      <Field t={t} label="④ 案件タイプ" hint="選ぶと ⑤ の工程テンプレートが自動で入ります">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8,
          border: `1px solid ${t.BORDER}`, borderRadius: 8, background: t.SUBTLE, minHeight: 44,
        }}>
          {Object.values(PROJECT_TYPES).map(ty => {
            const active = ty.id === selectedTypeId;
            return (
              <button key={ty.id} onClick={() => applyTypeTemplate(ty.id)} style={{
                padding: '4px 10px', borderRadius: 16,
                border: `1px solid ${active ? ty.color : t.BORDER}`,
                background: active ? `${ty.color}20` : t.CARD,
                color: active ? ty.color : t.MUTED,
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: ty.color }} />
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

      {/* 5. 工程登録 */}
      <Field t={t} label="⑤ 工程" hint="タイプ選択後に自動で入ります / タグをクリックで調整 / 右端の＋で新規追加">
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
                onKeyDown={e => e.key === 'Enter' && (setShowNewProc(false), setNewProcName(''))}
                style={{ ...inputStyle(t), padding: '3px 8px', fontSize: 11, width: 100, borderRadius: 16 }} />
              <button onClick={() => { setShowNewProc(false); setNewProcName(''); }} style={{
                width: 22, height: 22, border: 'none', background: t.ACCENT, color: 'white',
                borderRadius: '50%', cursor: 'pointer', fontSize: 10,
              }}>✓</button>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <div style={{ fontSize: 11, color: t.MUTED }}>
          {selectedProcesses.length > 0 && `${selectedProcesses.length}工程 · `}
          {selectedTypeId && TYPE_PROCESS_AVG[selectedTypeId] &&
            `見積 ${Object.values(TYPE_PROCESS_AVG[selectedTypeId]).reduce((a, b) => a + b, 0).toFixed(1)}h`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={buttonStyle(t, 'ghost')}>キャンセル</button>
          <button onClick={onClose} style={buttonStyle(t, 'primary')}>案件を作成</button>
        </div>
      </div>
    </ModalShell>
  );
}

// ============ 集中モード（ポモドーロ） ============
function V3FocusMode({ t, onClose }) {
  const [sec, setSec] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(true);
  const [cycle] = React.useState(1);
  React.useEffect(() => {
    if (!running) return;
    const h = setInterval(() => setSec(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(h);
  }, [running]);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const pct = 1 - sec / (25 * 60);
  const R = 150;
  const C = 2 * Math.PI * R;
  const currentTask = { project: PROJECTS[0], type: 'color' };
  const p = currentTask.project;
  const procColor = processColor(currentTask.type, 'solid', 'dark');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'radial-gradient(ellipse at top, #1a1824 0%, #0a0910 100%)',
      backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#e8e6ef',
    }}>
      {/* 閉じる */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20,
        width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)', color: '#c0bdcf', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {/* 挨拶 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#7c7890', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Focus Session · {cycle}/5
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8 }}>
            今、<span style={{ color: procColor }}>{PROCESS_COLORS[currentTask.type].name}</span>に集中します
          </div>
          <div style={{ fontSize: 14, color: '#9a97ac', marginTop: 6 }}>{p.name}</div>
        </div>

        {/* 円タイマー */}
        <div style={{ position: 'relative', width: 340, height: 340 }}>
          <svg width="340" height="340" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="170" cy="170" r={R} stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
            <circle cx="170" cy="170" r={R} stroke={procColor} strokeWidth="4" fill="none"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct)} strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 12px ${procColor})` }} />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', fontSize: 82, fontWeight: 200,
              letterSpacing: 2, color: '#fff', lineHeight: 1,
            }}>{mm}:{ss}</div>
            <div style={{ fontSize: 11, color: '#7c7890', marginTop: 12, letterSpacing: 1 }}>
              残り集中時間 · {Math.round(pct * 100)}% 完了
            </div>
          </div>
        </div>

        {/* コントロール */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => setSec(25 * 60)} style={focusBtn(false)} title="リセット">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button onClick={() => setRunning(!running)} style={{
            ...focusBtn(true), background: procColor, borderColor: procColor, width: 72, height: 72,
          }}>
            {running
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>}
          </button>
          <button style={focusBtn(false)} title="スキップ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
          </button>
        </div>

        {/* サイクル */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[1,2,3,4,5].map(n => (
            <div key={n} style={{
              width: 32, height: 4, borderRadius: 2,
              background: n <= cycle ? procColor : 'rgba(255,255,255,0.1)',
            }} />
          ))}
        </div>

        {/* サブ情報 */}
        <div style={{
          display: 'flex', gap: 40, padding: '16px 28px', marginTop: 8,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
        }}>
          <FocusStat label="本日の集中" value="1h 40m" sub="4セッション" />
          <FocusStat label="記録される工程" value={PROCESS_COLORS[currentTask.type].name} sub="25分後に自動加算" />
          <FocusStat label="次の作業" value={DEFAULT_SUBLABELS[currentTask.type]?.[1] || '-'} sub="カラーラフ 2日目予定" />
        </div>
      </div>
    </div>
  );
}

function FocusStat({ label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#7c7890', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, color: '#fff', fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#9a97ac', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function focusBtn(primary) {
  return {
    width: 54, height: 54, borderRadius: '50%',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.15)',
    background: primary ? 'white' : 'rgba(255,255,255,0.05)',
    color: primary ? '#1a1824' : '#c0bdcf',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  };
}

// ============ 工程サブラベル編集 ============
function V3SubLabelEditor({ t, processKey, onClose }) {
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

  // 学習サジェスト（ダミー）
  const suggestions = ['ラフ決定', '色調整', 'パーツ追加', '描き込み', 'チェック', '修正反映'];

  return (
    <ModalShell t={t} title={`${proc.name} · サブラベル編集`} onClose={onClose} width={480}>
      <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 12 }}>
        タイムラインで各日に表示される作業内容です。連続日の1日目から順に表示されます。
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {labels.map((l, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            background: t.SUBTLE, borderRadius: 6, border: `1px solid ${t.BORDER}`,
          }}>
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
          placeholder="新しいサブラベル"
          onKeyDown={e => { if (e.key === 'Enter' && newLabel) { setLabels([...labels, newLabel]); setNewLabel(''); } }}
          style={{ ...inputStyle(t), flex: 1 }} />
        <button onClick={() => { if (newLabel) { setLabels([...labels, newLabel]); setNewLabel(''); } }}
          style={buttonStyle(t, 'ghost')}>追加</button>
      </div>

      {/* 学習サジェスト */}
      <div style={{ marginTop: 16, padding: 12, background: `${t.ACCENT}10`,
        border: `1px dashed ${t.ACCENT}44`, borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.ACCENT} strokeWidth="2">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 600, color: t.ACCENT }}>学習サジェスト</span>
          <span style={{ fontSize: 10, color: t.MUTED }}>· 過去の作業ログから頻出する語句</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => setLabels([...labels, s])} style={{
              padding: '3px 8px', fontSize: 10, border: `1px solid ${t.BORDER}`,
              background: t.CARD, color: t.TEXT, borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3,
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
}

// ============ shared ============
function ModalShell({ t, title, onClose, width = 520, children }) {
  // Open/close transition: scale + opacity (transitions.dev: Modal Open/Close)
  const [phase, setPhase] = React.useState('entering'); // 'entering' | 'shown' | 'closing'
  React.useEffect(() => {
    // 任意のモーダルが開いたタイミングでセルメモポップオーバーを閉じる（最前面被り防止）
    if (window.v5MemoEditor) window.v5MemoEditor.close();
    const id = requestAnimationFrame(() => setPhase('shown'));
    return () => cancelAnimationFrame(id);
  }, []);
  const requestClose = () => {
    if (phase === 'closing') return;
    setPhase('closing');
    setTimeout(() => onClose && onClose(), 160);
  };
  const visible = phase === 'shown';
  // Portal で document.body へ出すことで、祖先の transform 等で fixed の包含ブロックが
  // 縮められる現象（kanban / report 等で発生していた）を回避
  return ReactDOM.createPortal(
    <div onClick={requestClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,13,10,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      // 背景マスクは入場時は即時表示し、退場時のみフェードアウト。
      // モーダル間切替（詳細→編集）で背景が一瞬抜ける現象を回避する。
      opacity: phase === 'closing' ? 0 : 1,
      transition: 'opacity 0.18s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width, maxHeight: '85vh', overflow: 'auto',
        background: t.CARD, borderRadius: 14, padding: 24,
        border: `1px solid ${t.BORDER}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        transform: visible ? 'scale(1)' : 'scale(0.96)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
        transformOrigin: 'center center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: t.TEXT, letterSpacing: -0.3 }}>{title}</div>
          <button onClick={requestClose} style={{
            width: 28, height: 28, border: 'none', background: 'transparent',
            cursor: 'pointer', color: t.MUTED, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

function Field({ t, label, hint, required, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: t.TEXT }}>
          {label}
          {required && <span style={{ color: t.ACCENT, marginLeft: 4 }}>*</span>}
        </label>
        {hint && <span style={{ fontSize: 10, color: t.MUTED }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function inputStyle(t) {
  return {
    width: '100%', padding: '9px 12px', border: `1px solid ${t.BORDER}`,
    borderRadius: 7, fontSize: 13, color: t.TEXT, background: t.CARD,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
}

function buttonStyle(t, variant) {
  if (variant === 'primary') {
    return {
      padding: '8px 16px', fontSize: 12, fontWeight: 500, border: 'none',
      background: t.ACCENT, color: 'white', borderRadius: 7, cursor: 'pointer',
      fontFamily: 'inherit',
    };
  }
  return {
    padding: '8px 16px', fontSize: 12, fontWeight: 500,
    border: `1px solid ${t.BORDER}`, background: t.CARD, color: t.TEXT,
    borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
  };
}

Object.assign(window, { V3NewProjectModal, V3FocusMode, V3SubLabelEditor });
