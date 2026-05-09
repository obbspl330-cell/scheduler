// V4 DnD - 工程ブロックのドラッグ（移動）+ 左右エッジでリサイズ

function V4DraggableBar({ t, project, pr, store, shiftIdx, dayW, expanded, daysLen, heightOverride, yOffset, dayPerIdx }) {
  const [drag, setDrag] = React.useState(null); // {mode:'move'|'left'|'right'}
  const [hover, setHover] = React.useState(false);

  if (!pr.days || pr.days.length === 0) return null;
  const sortedDays = [...pr.days].sort((a, b) => a - b);
  const first = sortedDays[0];
  const last = sortedDays[sortedDays.length - 1];
  if (last + shiftIdx < 0 || first + shiftIdx >= daysLen) return null;

  // 連続した日付のランに分割
  const runs = [];
  let rs = sortedDays[0], re = sortedDays[0];
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] === re + 1) re = sortedDays[i];
    else { runs.push([rs, re]); rs = re = sortedDays[i]; }
  }
  runs.push([rs, re]);

  const doneRatio = pr.plannedH > 0 ? Math.min(1, pr.actualH / pr.plannedH) : 0;
  const solid = processColor(pr.type, 'solid', t.dark ? 'dark' : 'light');
  const fill = processColor(pr.type, 'fill', t.dark ? 'dark' : 'light');
  const border = processColor(pr.type, 'border', t.dark ? 'dark' : 'light');

  const applyDays = (days) => {
    store.setProjects(ps => ps.map(p => p.id !== project.id ? p : ({
      ...p, processes: p.processes.map(x => x.id !== pr.id ? x : ({ ...x, days })),
    })));
  };

  const onMouseDown = (mode, runIdx) => (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    const startX = ev.clientX;
    const orig = [...sortedDays];
    const origRuns = runs.map(r => [...r]);
    let lastDx = 0;
    let pushedUndo = false;
    const ensureUndoPushed = () => {
      if (pushedUndo) return;
      store.pushUndo && store.pushUndo(mode === 'move' ? 'moveProcess' : 'resizeProcess');
      pushedUndo = true;
    };
    const onMove = (e) => {
      const dx = Math.round((e.clientX - startX) / dayW);
      if (dx === lastDx) return;
      lastDx = dx;
      if (dx === 0) return;
      ensureUndoPushed();
      if (mode === 'move') {
        applyDays(orig.map(d => d + dx));
      } else if (mode === 'left' || mode === 'right') {
        // ラン単位でのリサイズ（隣接ランの範囲は食わない。隣接ランと接したら自動でマージされる）
        const idx = runIdx != null ? runIdx : (mode === 'left' ? 0 : origRuns.length - 1);
        const [rs, re] = origRuns[idx];
        let newRs = rs, newRe = re;
        if (mode === 'left') {
          newRs = rs + dx;
          if (idx > 0) newRs = Math.max(newRs, origRuns[idx - 1][1] + 1);
          if (newRs > re) newRs = re; // 最低 1 日残す
        } else {
          newRe = re + dx;
          if (idx < origRuns.length - 1) newRe = Math.min(newRe, origRuns[idx + 1][0] - 1);
          if (newRe < rs) newRe = rs;
        }
        const nextRuns = origRuns.map((r, i) => i === idx ? [newRs, newRe] : r);
        const days = [];
        for (const [a, b] of nextRuns) { for (let d = a; d <= b; d++) days.push(d); }
        applyDays(days);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    setDrag({ mode });
  };

  const h = heightOverride || (expanded ? 6 : 22);
  const top = yOffset != null ? yOffset : '50%';
  const tfm = yOffset != null ? 'none' : 'translateY(-50%)';

  return (
    <React.Fragment>
      {runs.map(([runS, runE], ri) => {
        const absS = runS + shiftIdx;
        const absE = runE + shiftIdx;
        if (absE < 0 || absS >= daysLen) return null;
        const isFirstRun = ri === 0;
        const isLastRun = ri === runs.length - 1;
        const left = absS * dayW + 2;
        const width = (absE - absS + 1) * dayW - 4;
        return (
          <div key={ri}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onMouseDown={onMouseDown('move')}
            style={{
              position: 'absolute', top, transform: tfm,
              left, width, height: h, borderRadius: expanded && !heightOverride ? 3 : 5,
              background: fill, border: `1px solid ${border}55`,
              overflow: 'hidden', cursor: drag?.mode === 'move' ? 'grabbing' : 'grab',
              display: 'flex', alignItems: 'center', padding: '0 4px',
              zIndex: 1,
              boxShadow: hover || drag ? `0 2px 8px ${solid}44` : 'none',
              transition: drag ? 'none' : 'box-shadow 0.15s, height 0.15s',
            }}>
            <div style={{
              position: 'absolute', inset: 0, width: `${doneRatio * 100}%`,
              background: solid, opacity: 0.35,
            }} />
            <div onMouseDown={onMouseDown('left', ri)} style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
              cursor: 'ew-resize', zIndex: 3,
              background: hover ? `${solid}66` : 'transparent',
            }} />
            <div onMouseDown={onMouseDown('right', ri)} style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
              cursor: 'ew-resize', zIndex: 3,
              background: hover ? `${solid}66` : 'transparent',
            }} />
            {!expanded && isFirstRun && width > 60 && (
              <span style={{
                fontSize: 9, color: solid,
                filter: t.dark ? 'brightness(1.6)' : 'brightness(0.55)',
                fontWeight: 600, zIndex: 1, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{PROCESS_COLORS[pr.type].name}</span>
            )}
            {heightOverride && isFirstRun && width > 40 && (
              <span style={{
                fontSize: 9, color: solid,
                filter: t.dark ? 'brightness(1.6)' : 'brightness(0.55)',
                fontWeight: 600, zIndex: 1, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center',
              }}>
                {PROCESS_COLORS[pr.type].name}
              </span>
            )}
          </div>
        );
      })}
    </React.Fragment>
  );
}

// ドラッグで並べ替え可能なリスト
function V4DnDList({ items, onReorder, renderItem, keyFn, direction = 'vertical' }) {
  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);

  return (
    <div>
      {items.map((item, i) => (
        <div key={keyFn(item, i)}
          draggable
          onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; }}
          onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
          onDragEnd={() => {
            if (dragIdx != null && overIdx != null && dragIdx !== overIdx) {
              const next = [...items];
              const [m] = next.splice(dragIdx, 1);
              next.splice(overIdx, 0, m);
              onReorder(next);
            }
            setDragIdx(null); setOverIdx(null);
          }}
          style={{
            opacity: dragIdx === i ? 0.4 : 1,
            borderTop: overIdx === i && dragIdx != null && dragIdx !== i ? '2px solid currentColor' : '2px solid transparent',
            cursor: 'grab', transition: 'opacity 0.15s',
          }}>
          {renderItem(item, i)}
        </div>
      ))}
    </div>
  );
}

window.V4DraggableBar = V4DraggableBar;
window.V4DnDList = V4DnDList;
