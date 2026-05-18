// V4 Timeline - DnDを追加 / スムーズスクロール / 残りはV3流用

function V4Timeline({ t, store, dayW, monthOffset, setMonthOffset, expanded, setExpanded, onEditSub, onEditProject }) {
  // V3GridBg が global から読めるように公開
  if (typeof window !== 'undefined') window.currentHolidays = store.holidays;
  // 「今日」は render 時に再計算（モジュールロード時の TODAY を使うと日付をまたいで stale になる）
  const realToday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  // 表示ベース月 = 実際の今月 + monthOffset
  const baseDate = new Date(realToday.getFullYear(), realToday.getMonth() + monthOffset, 1);
  const monthsToShow = 6;
  const rangeStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const rangeEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToShow, 0);
  const totalDays = Math.round((rangeEnd - rangeStart) / 86400000) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));
  const todayIdx = Math.round((realToday - rangeStart) / 86400000);
  // 工程 days[] の基準日は 2026-04-15 固定 (旧データのインポート互換性のため)
  const dataStart = new Date(2026, 3, 15);
  const shiftIdx = Math.round((dataStart - rangeStart) / 86400000);

  const monthBlocks = [];
  let cur = null;
  days.forEach((d, i) => {
    if (!cur || d.getMonth() !== cur.month) {
      if (cur) monthBlocks.push(cur);
      cur = { month: d.getMonth(), year: d.getFullYear(), startIdx: i, days: 0 };
    }
    cur.days++;
  });
  if (cur) monthBlocks.push(cur);

  const scrollRef = React.useRef(null);
  const prevOffset = React.useRef(monthOffset);
  const jumpToTodayRef = React.useRef(false);
  const [todayTick, setTodayTick] = React.useState(0);
  // 画面切り替え（タイムラインから離れる）時にセルメモポップオーバーを閉じる
  React.useEffect(() => {
    return () => { if (window.v5MemoEditor) window.v5MemoEditor.close(); };
  }, []);
  React.useEffect(() => {
    if (!scrollRef.current) return;
    const doJump = () => {
      if (jumpToTodayRef.current && todayIdx >= 0) {
        const target = Math.max(0, todayIdx * dayW);
        scrollRef.current.scrollTo({ left: target, behavior: 'smooth' });
        jumpToTodayRef.current = false;
        return true;
      }
      return false;
    };
    if (prevOffset.current !== monthOffset) {
      if (!doJump()) scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      prevOffset.current = monthOffset;
    } else {
      doJump();
    }
  }, [monthOffset, todayTick]);

  const scrollToToday = () => {
    jumpToTodayRef.current = true;
    if (monthOffset !== 0) setMonthOffset(0);
    else setTodayTick(x => x + 1);
  };

  // ===== 案件並び替え DnD（pointer events 自前実装。HTML5 DnD のカーソル fluctuation を回避） =====
  const [drag, setDrag] = React.useState(null); // { id, dropIdx } | null
  const sidebarRef = React.useRef(null);
  // ドラッグ中の表示順。drag.id を drag.dropIdx の位置に挿入したプレビュー
  const displayProjects = React.useMemo(() => {
    if (!drag) return store.projects;
    const dragged = store.projects.find(p => p.id === drag.id);
    if (!dragged) return store.projects;
    const without = store.projects.filter(p => p.id !== drag.id);
    const result = [...without];
    const idx = Math.max(0, Math.min(drag.dropIdx, result.length));
    result.splice(idx, 0, dragged);
    return result;
  }, [store.projects, drag]);

  // 行のドラッグハンドルから呼ばれる（V3SidebarRow 経由）。pointer-events で全制御
  const handleDragHandlePointerDown = React.useCallback((projectId, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const initialIdx = store.projects.findIndex(p => p.id === projectId);
    if (initialIdx < 0) return;
    // フィルタ済みリスト（timelineStore.projects）のスナップショット。
    // commit 時に dropIdx (filtered context) を flatIdx (full context) へ翻訳するために必要
    const filteredAtStart = store.projects.slice();
    setDrag({ id: projectId, dropIdx: initialIdx });
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    // ドラッグ要素のクローン (ゴースト) でカーソル追従
    const handleEl = e.currentTarget;
    const wrapperEl = handleEl.closest('[data-project]');
    const rowEl = wrapperEl ? wrapperEl.firstElementChild : null;
    const rowRect = rowEl ? rowEl.getBoundingClientRect() : null;
    const offsetX = rowRect ? e.clientX - rowRect.left : 0;
    const offsetY = rowRect ? e.clientY - rowRect.top : 0;
    const startX = e.clientX, startY = e.clientY;
    let ghostEl = null;
    let didMove = false;

    const computeDropIdx = (cursorY) => {
      const rows = sidebarRef.current?.querySelectorAll('[data-project]') || [];
      let idx = 0;
      rows.forEach((row) => {
        if (row.dataset.project === projectId) return;
        const r = row.firstElementChild?.getBoundingClientRect();
        if (!r) return;
        const mid = r.top + r.height / 2;
        if (cursorY > mid) idx++;
      });
      return idx;
    };

    const onMove = (mv) => {
      // 5px 動いてから初回のみゴーストを生成
      if (!ghostEl && rowEl && rowRect && (Math.abs(mv.clientX - startX) + Math.abs(mv.clientY - startY) >= 5)) {
        ghostEl = rowEl.cloneNode(true);
        ghostEl.style.position = 'fixed';
        ghostEl.style.left = `${rowRect.left}px`;
        ghostEl.style.top = `${rowRect.top}px`;
        ghostEl.style.width = `${rowRect.width}px`;
        ghostEl.style.height = `${rowRect.height}px`;
        ghostEl.style.margin = '0';
        ghostEl.style.pointerEvents = 'none';
        ghostEl.style.zIndex = '10000';
        ghostEl.style.opacity = '0.92';
        ghostEl.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.25)';
        ghostEl.style.transform = 'rotate(0.5deg) scale(1.02)';
        ghostEl.style.transition = 'box-shadow 0.15s ease';
        ghostEl.style.background = 'inherit';
        document.body.appendChild(ghostEl);
      }
      if (ghostEl) {
        ghostEl.style.left = `${mv.clientX - offsetX}px`;
        ghostEl.style.top = `${mv.clientY - offsetY}px`;
      }
      didMove = true;
      const newIdx = computeDropIdx(mv.clientY);
      setDrag(prev => prev && prev.dropIdx !== newIdx ? { ...prev, dropIdx: newIdx } : prev);
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      if (ghostEl) {
        try { document.body.removeChild(ghostEl); } catch (err) { /* ignore */ }
        ghostEl = null;
      }
      // ドラッグ後に発火する可能性のある click を 1 回だけ握りつぶす
      if (didMove) {
        const blockClick = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          document.removeEventListener('click', blockClick, true);
        };
        document.addEventListener('click', blockClick, true);
        setTimeout(() => document.removeEventListener('click', blockClick, true), 300);
      }
      // commit: dropIdx (filtered context) → flatIdx (full ps context) を ID 経由で翻訳
      setDrag(currentDrag => {
        if (currentDrag) {
          const { id, dropIdx } = currentDrag;
          store.setProjects(ps => {
            const dragged = ps.find(p => p.id === id);
            if (!dragged) return ps;
            const without = ps.filter(p => p.id !== id);
            const filteredWithoutDragged = filteredAtStart.filter(p => p.id !== id);
            // dropIdx は filteredWithoutDragged 内の挿入位置。これを ps 内の絶対 index に変換
            let flatIdx;
            if (filteredWithoutDragged.length === 0) {
              flatIdx = without.length;
            } else if (dropIdx <= 0) {
              const first = filteredWithoutDragged[0];
              flatIdx = without.findIndex(p => p.id === first.id);
            } else if (dropIdx >= filteredWithoutDragged.length) {
              const last = filteredWithoutDragged[filteredWithoutDragged.length - 1];
              flatIdx = without.findIndex(p => p.id === last.id) + 1;
            } else {
              const target = filteredWithoutDragged[dropIdx];
              flatIdx = without.findIndex(p => p.id === target.id);
            }
            if (flatIdx < 0) flatIdx = without.length;
            const next = [...without];
            next.splice(flatIdx, 0, dragged);
            return next;
          });
        }
        return null;
      });
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }, [store]);

  const startLabel = monthBlocks.length > 0
    ? `${monthBlocks[0].year}年 ${monthBlocks[0].month + 1}月 〜`
    : '';
  const [jumpOpen, setJumpOpen] = React.useState(false);
  const jumpRef = React.useRef(null);
  React.useEffect(() => {
    if (!jumpOpen) return;
    const onDoc = (e) => { if (jumpRef.current?.contains(e.target)) return; setJumpOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [jumpOpen]);
  const currentJumpYear = monthBlocks[0]?.year || 2026;
  const currentJumpMonth = monthBlocks[0]?.month ?? 3;
  const jumpTo = (year, month) => {
    const off = (year - 2026) * 12 + (month - 3);
    setMonthOffset(off);
    setJumpOpen(false);
  };
  const yearOptions = [2024, 2025, 2026, 2027, 2028];
  const monthOptions = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div style={{
      margin: '14px 20px 16px', background: t.CARD,
      border: `1px solid ${t.BORDER}`, borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${t.BORDER}`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>タイムライン</div>
        <div ref={jumpRef} style={{ position: 'relative' }}>
          <button onClick={() => setJumpOpen(o => !o)} title="年月を選択して移動" style={{
            fontSize: 10, color: t.MUTED, padding: '2px 8px', background: t.SUBTLE,
            borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>{startLabel}</span>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {jumpOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 40,
              background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 8,
              padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              display: 'flex', gap: 6,
            }}>
              <select value={currentJumpYear} onChange={e => jumpTo(parseInt(e.target.value), currentJumpMonth)}
                style={{
                  padding: '5px 8px', fontSize: 11, border: `1px solid ${t.BORDER}`, borderRadius: 5,
                  background: t.CARD, color: t.TEXT, fontFamily: 'inherit', cursor: 'pointer',
                }}>
                {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
              <select value={currentJumpMonth} onChange={e => jumpTo(currentJumpYear, parseInt(e.target.value))}
                style={{
                  padding: '5px 8px', fontSize: 11, border: `1px solid ${t.BORDER}`, borderRadius: 5,
                  background: t.CARD, color: t.TEXT, fontFamily: 'inherit', cursor: 'pointer',
                }}>
                {monthOptions.map(m => <option key={m} value={m}>{m + 1}月</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {/* Undo / Redo: タイムライン内の工程ドラッグ/追加/削除が対象 */}
        {store && (store.undo || store.redo) && (
          <div style={{ display: 'flex', gap: 2, marginRight: 2 }}>
            <button onClick={() => store.undo && store.undo()} disabled={!store.canUndo}
              title="元に戻す (Ctrl+Z) · 工程ドラッグ/追加/削除が対象" style={{
                width: 28, height: 28, borderRadius: 6, border: `1px solid ${t.BORDER}`, padding: 0,
                background: t.CARD, color: store.canUndo ? t.TEXT : t.MUTED,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: store.canUndo ? 'pointer' : 'default',
                opacity: store.canUndo ? 1 : 0.4, fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (store.canUndo) e.currentTarget.style.background = t.SUBTLE; }}
              onMouseLeave={e => { e.currentTarget.style.background = t.CARD; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>
              </svg>
            </button>
            <button onClick={() => store.redo && store.redo()} disabled={!store.canRedo}
              title="やり直す (Ctrl+Shift+Z)" style={{
                width: 28, height: 28, borderRadius: 6, border: `1px solid ${t.BORDER}`, padding: 0,
                background: t.CARD, color: store.canRedo ? t.TEXT : t.MUTED,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: store.canRedo ? 'pointer' : 'default',
                opacity: store.canRedo ? 1 : 0.4, fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (store.canRedo) e.currentTarget.style.background = t.SUBTLE; }}
              onMouseLeave={e => { e.currentTarget.style.background = t.CARD; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>
              </svg>
            </button>
          </div>
        )}
        <button onClick={scrollToToday} title="今日の日付までスクロール" style={{
          padding: '4px 10px', fontSize: 11, fontWeight: 600,
          border: `1px solid ${t.ACCENT}55`, background: `${t.ACCENT}10`, color: t.ACCENT,
          borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          今日
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.SUBTLE, borderRadius: 6, padding: 2 }}>
          <button onClick={() => setMonthOffset(monthOffset - 1)} style={iconBtn(t)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button onClick={() => setMonthOffset(0)} style={{
            padding: '3px 10px', fontSize: 11, fontWeight: 600, border: 'none',
            background: monthOffset === 0 ? t.CARD : 'transparent',
            color: monthOffset === 0 ? t.ACCENT : t.MUTED,
            borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
          }}>今月</button>
          <button onClick={() => setMonthOffset(monthOffset + 1)} style={iconBtn(t)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {(() => {
            // ±3 か月の範囲を超えた場合は現在の monthOffset を中心にスライド
            const defaultWin = [-2, -1, 0, 1, 2, 3];
            const win = defaultWin.includes(monthOffset)
              ? defaultWin
              : Array.from({ length: 6 }, (_, k) => monthOffset - 2 + k);
            return win.map(off => {
              const d = new Date(realToday.getFullYear(), realToday.getMonth() + off, 1);
              const active = off === monthOffset;
              return (
                <button key={off} onClick={() => setMonthOffset(off)}
                  title={`${d.getFullYear()}年 ${d.getMonth() + 1}月`}
                  style={{
                    width: 44, padding: '4px 0',
                    border: `1px solid ${active ? t.ACCENT : t.BORDER}`,
                    background: active ? `${t.ACCENT}15` : t.CARD,
                    color: active ? t.ACCENT : t.MUTED,
                    borderRadius: 5, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                    fontWeight: active ? 600 : 500, transition: 'all 0.2s',
                    textAlign: 'center', flexShrink: 0,
                  }}>
                  {d.getMonth() + 1}月
                </button>
              );
            });
          })()}
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        <div ref={sidebarRef} style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${t.BORDER}` }}>
          <div style={{
            height: 44, padding: '0 14px', display: 'flex', alignItems: 'center',
            borderBottom: `1px solid ${t.BORDER}`, fontSize: 10, color: t.MUTED,
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, background: t.SUBTLE,
          }}>案件 / 工程</div>
          {displayProjects.map((p, pIdx) => (
            <V3SidebarRow key={p.id} t={t} project={p} store={store}
              projectIdx={pIdx}
              expanded={expanded[p.id]}
              onToggle={() => setExpanded({ ...expanded, [p.id]: !expanded[p.id] })}
              onEditSub={onEditSub}
              onReorderProject={(from, to) => store.reorderProject(from, to)}
              onReorderProc={(pid, from, to) => store.reorderProc(pid, from, to)}
              onAddProc={(pid, type) => store.addProc(pid, type)}
              onDeleteProc={(pid, prid) => store.deleteProc(pid, prid)}
              onEditProject={onEditProject}
              onDeleteProject={(pid) => store.deleteProject(pid)}
              onDragHandlePointerDown={handleDragHandlePointerDown}
              isDragging={drag?.id === p.id}
            />
          ))}
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', scrollBehavior: 'smooth' }}>
          <div style={{ minWidth: dayW * totalDays, transition: 'opacity 0.2s' }}>
            <div style={{ display: 'flex', height: 22, borderBottom: `1px solid ${t.BORDER}`, background: t.SUBTLE }}>
              {monthBlocks.map((m, i) => (
                <div key={i} style={{
                  width: m.days * dayW, flexShrink: 0,
                  borderLeft: i > 0 ? `1px solid ${t.BORDER}` : 'none',
                  display: 'flex', alignItems: 'center', padding: '0 10px',
                  fontSize: 10, fontWeight: 700, color: t.TEXT, letterSpacing: 0.3,
                }}>
                  {m.year}年 {m.month + 1}月 <span style={{ color: t.MUTED, marginLeft: 6, fontWeight: 400 }}>({m.days}日)</span>
                </div>
              ))}
            </div>
            <div style={{ height: 22, display: 'flex', borderBottom: `1px solid ${t.BORDER}`, background: t.SUBTLE }}>
              {days.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = i === todayIdx;
                const isHoliday = store.isHoliday(d);
                const offDay = isWeekend || isHoliday;
                const color = isToday ? t.ACCENT
                  : isHoliday ? (t.dark ? '#f87171' : '#c0454d')
                  : d.getDay() === 0 ? (t.dark ? '#f87171' : '#c0454d')
                  : d.getDay() === 6 ? (t.dark ? '#60a5fa' : '#3b6caa')
                  : t.TEXT;
                const bg = isToday ? `${t.ACCENT}20`
                  : offDay ? (t.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)')
                  : 'transparent';
                return (
                  <div key={i}
                    onClick={() => store.toggleHoliday(d)}
                    title={isHoliday ? 'クリックで平日に戻す' : 'クリックで休日に設定 (有休/祝日/代休など)'}
                    style={{
                      width: dayW, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: bg,
                      borderLeft: d.getDate() === 1 ? `1px solid ${t.BORDER}` : 'none',
                      fontSize: 10, fontWeight: isToday || isHoliday ? 700 : 500,
                      color, cursor: 'pointer', userSelect: 'none', position: 'relative',
                    }}>
                    {d.getDate()}
                    {isHoliday && !isToday && (
                      <div style={{
                        position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)',
                        width: 4, height: 4, borderRadius: '50%',
                        background: t.dark ? '#f87171' : '#c0454d',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
            {displayProjects.map(project => (
              <V4ProjectRow key={project.id} t={t} project={project} store={store}
                days={days} todayIdx={todayIdx} shiftIdx={shiftIdx}
                dayW={dayW} expanded={expanded[project.id]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function iconBtn(t) {
  return {
    width: 24, height: 24, border: 'none', background: 'transparent',
    color: t.MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4,
  };
}

// DnD対応ProjectRow
function V4ProjectRow({ t, project, store, days, todayIdx, shiftIdx, dayW, expanded }) {
  const isOnHold = project.boardStatus === 'onhold';
  const dlDate = project.deadline
    ? (project.deadline instanceof Date ? project.deadline : new Date(project.deadline))
    : null;
  const dlIdx = dlDate && days.length > 0
    ? Math.round((dlDate - days[0]) / 86400000)
    : -1;
  const showDl = dlIdx >= 0 && dlIdx < days.length;
  const dlColor = t.dark ? '#f87171' : '#dc2626';

  // 締切セル誤クリック防止: モーダル誘導ツールチップを 1.5 秒だけ表示
  const [tipPos, setTipPos] = React.useState(null);
  React.useEffect(() => {
    if (!tipPos) return;
    const h = setTimeout(() => setTipPos(null), 1500);
    return () => clearTimeout(h);
  }, [tipPos]);
  const showLockTip = (e) => {
    e.stopPropagation();
    setTipPos({ x: e.clientX, y: e.clientY });
  };

  // 折りたたみ時: 工程ごとの提出日（複数可）を案件行に小さくドット表示
  const procDeadlines = !expanded ? project.processes.reduce((acc, pr) => {
    const list = pr.deadlines || [];
    list.forEach(raw => {
      if (!raw) return;
      const d = raw instanceof Date ? raw : new Date(raw);
      if (isNaN(d.getTime())) return;
      const norm = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const idx = days.findIndex(day => day.getTime() === norm.getTime());
      if (idx < 0) return;
      if (!acc[idx]) acc[idx] = [];
      acc[idx].push(pr.type);
    });
    return acc;
  }, {}) : null;

  return (
    <div style={{ opacity: isOnHold ? 0.45 : 1 }}>
      <div style={{ height: 44, position: 'relative', borderBottom: `1px solid ${t.BORDER}` }}>
        <V3GridBg t={t} days={days} dayW={dayW} />
        {/* セルクリックは案件編集画面誘導のツールチップのみ表示（誤って締切を消さないため）*/}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 0 }}>
          {days.map((_, i) => (
            <div key={i}
              onClick={showLockTip}
              title="締め切りの変更は案件編集画面から"
              style={{ width: dayW, height: '100%', cursor: 'default' }} />
          ))}
        </div>
        <V3TodayLine todayIdx={todayIdx} dayW={dayW} ACCENT={t.ACCENT} />
        {/* 締切マーカー: 控えめに色付きセル + 文字のみ */}
        {showDl && (
          <>
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: dlIdx * dayW, width: dayW,
              background: `${dlColor}10`,
              pointerEvents: 'none', zIndex: 2,
            }} />
            <div style={{
              position: 'absolute', top: 3,
              left: dlIdx * dayW + dayW / 2, transform: 'translateX(-50%)',
              fontSize: 9, fontWeight: 700, color: dlColor,
              fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
              letterSpacing: 0.2, pointerEvents: 'none', zIndex: 2,
              whiteSpace: 'nowrap',
            }}>締切</div>
          </>
        )}
        {project.processes.map(pr => (
          <V4DraggableBar key={pr.id} t={t} project={project} pr={pr}
            store={store} shiftIdx={shiftIdx} dayW={dayW}
            expanded={expanded} daysLen={days.length} />
        ))}
        {/* 折りたたみ時の工程締切ドット（工程色・横並び） */}
        {procDeadlines && Object.entries(procDeadlines).map(([idx, types]) => (
          <div key={'pdl' + idx} style={{
            position: 'absolute', bottom: 3,
            left: Number(idx) * dayW + dayW / 2,
            transform: 'translateX(-50%)',
            display: 'flex', gap: 2, pointerEvents: 'none', zIndex: 3,
          }}>
            {types.map((type, i) => (
              <div key={i} style={{
                width: 4, height: 4, borderRadius: '50%',
                background: processColor(type, 'solid', t.dark ? 'dark' : 'light'),
              }} />
            ))}
          </div>
        ))}
      </div>
      {expanded && project.processes.map(pr => (
        <V4ProcessRow key={pr.id} t={t} project={project} pr={pr} store={store}
          days={days} todayIdx={todayIdx} shiftIdx={shiftIdx} dayW={dayW} />
      ))}
      {tipPos && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          left: Math.min(tipPos.x + 12, window.innerWidth - 220),
          top: tipPos.y + 12,
          background: t.dark ? '#1f2330' : '#1f1b16',
          color: '#fff',
          padding: '6px 10px', borderRadius: 5, fontSize: 11,
          zIndex: 9999, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
        }}>締め切りの変更は案件編集画面から</div>,
        document.body
      )}
    </div>
  );
}

function V4ProcessRow({ t, project, pr, store, days, todayIdx, shiftIdx, dayW }) {
  const plannedPerDay = pr.plannedH / pr.days.length;
  const actualPerDay = pr.actualH / pr.days.length;
  return (
    <div style={{
      height: 32, position: 'relative', borderBottom: `1px solid ${t.BORDER}`,
      background: t.dark ? 'rgba(255,255,255,0.02)' : t.SUBTLE + '55',
    }}>
      <V3GridBg t={t} days={days} dayW={dayW} />
      <V3TodayLine todayIdx={todayIdx} dayW={dayW} ACCENT={t.ACCENT} />
      <V4DraggableBar t={t} project={project} pr={pr} store={store}
        shiftIdx={shiftIdx} dayW={dayW} expanded={true} daysLen={days.length}
        heightOverride={24} yOffset={4}
        dayPerIdx={(i) => getV3DayLabel(pr, i)} />
    </div>
  );
}

window.V4Timeline = V4Timeline;
window.V4ProjectRow = V4ProjectRow;
