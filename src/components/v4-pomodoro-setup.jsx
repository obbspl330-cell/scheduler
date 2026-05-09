// V4 ポモドーロ設定 → スタート画面

function V4PomoSetup({ t, store, onStart, onClose }) {
  const [s, setS] = React.useState(store.pomoSettings);
  // タイムラインで今日色付けされている最初の作業を初期選択
  const todayTask = React.useMemo(() => {
    // dataStart (2026-04-15) からの今日の相対 index
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

  const commit = () => {
    store.setPomoSettings(s);
    onStart({ projectId, procType, settings: s });
  };

  const Num = ({ label, value, set, min, max, unit, footer }) => (
    <div style={{ flex: 1, padding: '14px 12px', background: t.SUBTLE, borderRadius: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
        <button onClick={() => set(Math.max(min, value - 1))} style={{
          width: 28, height: 28, border: `1px solid ${t.BORDER}`, background: t.CARD,
          color: t.TEXT, borderRadius: 6, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
        }}>−</button>
        <div style={{ minWidth: 50, fontSize: 28, fontWeight: 700, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', color: t.TEXT, letterSpacing: -1 }}>
          {value}<span style={{ fontSize: 11, color: t.MUTED, fontWeight: 400, marginLeft: 2 }}>{unit}</span>
        </div>
        <button onClick={() => set(Math.min(max, value + 1))} style={{
          width: 28, height: 28, border: `1px solid ${t.BORDER}`, background: t.CARD,
          color: t.TEXT, borderRadius: 6, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
        }}>+</button>
      </div>
      {footer}
    </div>
  );

  const totalMin = s.sets * s.workMin + (s.sets - 1) * s.breakMin + s.longBreakMin;
  const setsFooter = (
    <div style={{
      marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${t.BORDER}`,
      textAlign: 'center', fontSize: 10, color: t.MUTED, lineHeight: 1.5,
    }}>
      <div>合計</div>
      <div style={{ color: t.ACCENT, fontWeight: 700, fontSize: 13, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
        {Math.floor(totalMin / 60)}h {totalMin % 60}m
      </div>
    </div>
  );

  return (
    <ModalShell t={t} title="集中モードを開始" onClose={onClose} width={560}>
      <div style={{ fontSize: 12, color: t.MUTED, marginBottom: 14 }}>
        ポモドーロタイマーの設定。完了後、作業時間は自動で記録されます。
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <Num label="作業" value={s.workMin} set={v => setS({...s, workMin: v})} min={5} max={60} unit="分" />
        <Num label="休憩" value={s.breakMin} set={v => setS({...s, breakMin: v})} min={1} max={30} unit="分" />
        <Num label="長休憩" value={s.longBreakMin} set={v => setS({...s, longBreakMin: v})} min={5} max={60} unit="分" />
        <Num label="セット" value={s.sets} set={v => setS({...s, sets: v})} min={1} max={8} unit="回" footer={setsFooter} />
      </div>

      <Field t={t} label="案件">
        <select value={projectId} onChange={e => { setProjectId(e.target.value); const p = store.projects.find(x => x.id === e.target.value); if (p?.processes[0]) setProcType(p.processes[0].type); }}
          style={inputStyle(t)}>
          {store.projects.map(p => <option key={p.id} value={p.id}>{store.displayName ? store.displayName(p) : p.name}</option>)}
        </select>
      </Field>

      <Field t={t} label="工程">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {availProcs.map(pr => {
            const active = pr.type === procType;
            const col = processColor(pr.type, 'solid', t.dark ? 'dark' : 'light');
            return (
              <button key={pr.id} onClick={() => setProcType(pr.type)} style={{
                padding: '6px 12px', borderRadius: 16,
                border: `1px solid ${active ? col : t.BORDER}`,
                background: active ? `${col}20` : t.CARD,
                color: active ? col : t.MUTED,
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />
                {PROCESS_COLORS[pr.type].name}
              </button>
            );
          })}
        </div>
      </Field>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
        <input type="checkbox" checked={s.autoLog} onChange={e => setS({...s, autoLog: e.target.checked})}
          style={{ width: 16, height: 16, accentColor: t.ACCENT }} />
        <span style={{ fontSize: 12, color: t.TEXT }}>セット完了時に作業ログへ自動記録する</span>
      </label>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={buttonStyle(t, 'ghost')}>キャンセル</button>
        <button onClick={commit} style={{ ...buttonStyle(t, 'primary'), padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          スタート
        </button>
      </div>
    </ModalShell>
  );
}

// ポモドーロタイマー共有state。AppV4 で呼び出し、FocusMode と TopBar 両方へ配信。
function usePomoTimer(task) {
  const [phase, setPhase] = React.useState('work'); // 'work' | 'break' | 'longBreak' | 'done'
  const [setIdx, setSetIdx] = React.useState(1);
  const [sec, setSec] = React.useState(0);
  const [running, setRunning] = React.useState(true);
  const [workedMin, setWorkedMin] = React.useState(0);

  // SE: 開始 / 作業休憩切替 / 終了 で alart_se.mp3 を鳴らす
  const seRef = React.useRef(null);
  React.useEffect(() => {
    try {
      const a = new Audio('../assets/alart_se.mp3');
      a.preload = 'auto';
      a.volume = 0.7;
      seRef.current = a;
    } catch (e) { seRef.current = null; }
    return () => { seRef.current = null; };
  }, []);
  const playSE = React.useCallback(() => {
    const a = seRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* ignore autoplay errors */ }
  }, []);

  // task が差し替わったら state をリセット + 開始SE
  React.useEffect(() => {
    if (!task) return;
    setPhase('work');
    setSetIdx(1);
    setSec(task.settings.workMin * 60);
    setRunning(true);
    setWorkedMin(0);
    playSE(); // 開始
  }, [task]);

  React.useEffect(() => {
    if (!task || !running || phase === 'done') return;
    const s = task.settings;
    const h = setInterval(() => setSec(x => {
      if (x > 1) return x - 1;
      if (phase === 'work') {
        setWorkedMin(m => m + s.workMin);
        if (setIdx < s.sets) { setPhase('break'); playSE(); return s.breakMin * 60; }
        setPhase('done'); playSE(); return 0;
      } else if (phase === 'break') {
        setSetIdx(i => i + 1); setPhase('work'); playSE(); return s.workMin * 60;
      } else if (phase === 'longBreak') {
        setPhase('done'); playSE(); return 0;
      }
      return 0;
    }), 1000);
    return () => clearInterval(h);
  }, [task, running, phase, setIdx]);

  if (!task) return null;
  const s = task.settings;
  const phaseSec = phase === 'work' ? s.workMin * 60 : phase === 'break' ? s.breakMin * 60 : phase === 'longBreak' ? s.longBreakMin * 60 : 0;
  return {
    phase, setIdx, sec, running, workedMin, phaseSec, sets: s.sets,
    resetPhase: () => setSec(phaseSec),
    togglePause: () => setRunning(r => !r),
    skip: () => setSec(1),
  };
}

// V4 Focus Mode - state は親 (AppV4) が usePomoTimer で管理 / props で受ける
function V4FocusMode({ t, store, task, pomo, onClose, onEnd, onReset, onRecordEnd }) {
  if (!pomo) return null;
  const { phase, setIdx, sec, running, workedMin, phaseSec, sets, resetPhase, togglePause, skip } = pomo;
  const s = task.settings;
  // ここまでの記録対象時間（分）: 完了セット + 現在作業フェーズ経過分
  const partialMin = phase === 'work' && phaseSec > 0 ? (phaseSec - sec) / 60 : 0;
  const recordableMin = workedMin + partialMin;
  const canRecord = !!onRecordEnd && task.projectId && recordableMin > 0;

  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const pct = phaseSec > 0 ? 1 - sec / phaseSec : 1;
  const R = 150;
  const C = 2 * Math.PI * R;
  const accent = t.ACCENT;
  const breakCol = '#5ee1a9';
  const ringCol = phase === 'work' ? accent : breakCol;

  const phaseLabel = phase === 'work' ? '集中' : phase === 'break' ? '休憩' : phase === 'longBreak' ? '長休憩' : '完了';
  const procName = task.procType ? PROCESS_COLORS[task.procType]?.name : '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: phase === 'work'
        ? 'radial-gradient(ellipse at top, #1a1824 0%, #0a0910 100%)'
        : 'radial-gradient(ellipse at top, #0f2520 0%, #061410 100%)',
      backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#e8e6ef',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20,
        width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)', color: '#c0bdcf', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      {phase === 'done' ? (
        <V4FocusDone t={t} task={task} workedMin={workedMin} store={store} onClose={onEnd || onClose} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#7c7890', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              {window.TextSwap
                ? <window.TextSwap triggerKey={`${phase}-${setIdx}`}>{phaseLabel} · {setIdx}/{sets}</window.TextSwap>
                : <>{phaseLabel} · {setIdx}/{sets}</>}
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8 }}>
              {window.TextSwap
                ? <window.TextSwap triggerKey={phase}>
                    {phase === 'work'
                      ? <><span style={{ color: accent }}>{procName}</span>作業中</>
                      : <>少し休憩しましょう</>}
                  </window.TextSwap>
                : (phase === 'work'
                    ? <><span style={{ color: accent }}>{procName}</span>作業中</>
                    : <>少し休憩しましょう</>)}
            </div>
          </div>

          <div style={{ position: 'relative', width: 340, height: 340 }}>
            <svg width="340" height="340" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="170" cy="170" r={R} stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
              <circle cx="170" cy="170" r={R} stroke={ringCol} strokeWidth="4" fill="none"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct)} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 12px ${ringCol})` }} />
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
                {Math.round(pct * 100)}% 完了
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={resetPhase} style={focusBtn(false)} title="このフェーズの時間をリセット">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button onClick={togglePause} style={{
              ...focusBtn(true), background: ringCol,
              borderColor: 'transparent', width: 72, height: 72, color: '#1a1824',
            }}>
              {running
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>}
            </button>
            <button onClick={skip} style={focusBtn(false)} title="スキップ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {Array.from({ length: sets }).map((_, n) => (
              <div key={n} style={{
                width: 32, height: 4, borderRadius: 2,
                background: n < setIdx ? accent : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>

          {(onReset || canRecord) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {onReset && (
                <button onClick={onReset} style={{
                  padding: '8px 18px', border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.03)', color: '#c0bdcf', borderRadius: 20,
                  cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                }} title="タイマーを終了して設定画面に戻る">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
                  リセット
                </button>
              )}
              {canRecord && (
                <button onClick={onRecordEnd} style={{
                  padding: '8px 18px', border: `1px solid ${ringCol}66`,
                  background: `${ringCol}1f`, color: ringCol, borderRadius: 20,
                  cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                }} title={`ここまでの ${recordableMin.toFixed(1)} 分を作業ログに記録してタイマーを終了`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  記録して終了
                  <span style={{
                    fontSize: 10, opacity: 0.85,
                    fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                  }}>
                    {(recordableMin / 60).toFixed(2)}h
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function V4FocusDone({ t, task, workedMin, store, onClose }) {
  const hours = workedMin / 60;
  return (
    <div style={{
      width: 420, padding: 32, background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>お疲れ様でした</div>
      <div style={{ fontSize: 12, color: '#9a97ac', marginBottom: 20 }}>
        ポモドーロセッションが完了しました
      </div>

      <div style={{ padding: 20, background: 'rgba(0,0,0,0.3)', borderRadius: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#7c7890', letterSpacing: 1, textTransform: 'uppercase' }}>合計作業時間</div>
        <div style={{ fontSize: 36, fontWeight: 300, color: '#fff', fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', marginTop: 6 }}>
          {hours.toFixed(2)}<span style={{ fontSize: 14, color: '#9a97ac', marginLeft: 4 }}>h</span>
        </div>
      </div>

      <button onClick={onClose} style={{
        width: '100%', padding: '12px', border: 'none',
        background: 'white', color: '#1a1824',
        borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>閉じる</button>
    </div>
  );
}

Object.assign(window, { V4PomoSetup, V4FocusMode, usePomoTimer });
