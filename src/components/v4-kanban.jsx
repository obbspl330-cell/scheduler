// V4 カード画面

function V4Kanban({ t, store, onNewProject }) {
  const columns = [
    { id: 'todo', label: '未着手', filter: p => projectStats(p).totalActual === 0 },
    { id: 'progress', label: '進行中', filter: p => { const s = projectStats(p); return s.totalActual > 0 && s.pct < 100; } },
    { id: 'review', label: 'レビュー待ち', filter: p => { const s = projectStats(p); return s.pct >= 70 && s.pct < 100; } },
    { id: 'done', label: '完了', filter: p => projectStats(p).pct >= 100 },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: t.TEXT, letterSpacing: -0.3 }}>カード</div>
          <div style={{ fontSize: 11, color: t.MUTED, marginTop: 2 }}>ステータス別に案件を俯瞰</div>
        </div>
        <button onClick={onNewProject} style={{ ...buttonStyle(t, 'primary'), display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          新しい案件
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {columns.map(col => {
          const items = store.projects.filter(col.filter);
          return (
            <div key={col.id} style={{
              background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10,
              display: 'flex', flexDirection: 'column', minHeight: 480,
            }}>
              <div style={{
                padding: '12px 14px', borderBottom: `1px solid ${t.BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT }}>{col.label}</div>
                <span style={{
                  fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                  padding: '1px 6px', background: t.SUBTLE, borderRadius: 3, fontWeight: 600,
                }}>{items.length}</span>
              </div>
              <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(p => <V4KanbanCard key={p.id} t={t} project={p} />)}
                {items.length === 0 && (
                  <div style={{
                    padding: 30, textAlign: 'center', fontSize: 11, color: t.MUTED,
                    border: `1px dashed ${t.BORDER}`, borderRadius: 8, margin: 4,
                  }}>案件なし</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function V4KanbanCard({ t, project }) {
  const s = projectStats(project);
  const ty = PROJECT_TYPES[project.typeId];
  const nextProc = project.processes.find(pr => pr.actualH < pr.plannedH);
  const dlDate = project.deadline instanceof Date ? project.deadline : new Date(project.deadline);
  const deadlineDays = Math.round((dlDate - TODAY) / 86400000);
  const isUrgent = deadlineDays <= 7;

  return (
    <div style={{
      padding: '10px 12px', background: t.CARD,
      border: `1px solid ${t.BORDER}`, borderRadius: 8,
      borderLeft: `3px solid ${ty?.color || t.ACCENT}`,
      cursor: 'grab', transition: 'all 0.15s',
    }}>
      {/* タイプバッジ */}
      {ty && (
        <div style={{
          display: 'inline-block', padding: '1px 6px', borderRadius: 3,
          background: `${ty.color}20`, color: ty.color, fontSize: 9, fontWeight: 600, marginBottom: 6,
        }}>{ty.name}</div>
      )}
      <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT, marginBottom: 6, lineHeight: 1.35 }}>
        {project.name}
      </div>
      {project.client && (
        <div style={{ fontSize: 10, color: t.MUTED, marginBottom: 8 }}>📌 {project.client}</div>
      )}

      {/* 進捗バー */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
          <span style={{ color: t.MUTED }}>進捗</span>
          <span style={{ color: t.TEXT, fontWeight: 600, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>{s.pct}%</span>
        </div>
        <div style={{ height: 4, background: t.SUBTLE, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${s.pct}%`,
            background: `linear-gradient(90deg, ${ty?.color || t.ACCENT}, ${ty?.color || t.ACCENT}cc)`,
          }} />
        </div>
      </div>

      {/* 工程チップ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
        {project.processes.slice(0, 5).map(pr => {
          const col = processColor(pr.type, 'solid', t.dark ? 'dark' : 'light');
          const done = pr.actualH >= pr.plannedH;
          return (
            <div key={pr.id} title={PROCESS_COLORS[pr.type].name} style={{
              width: 18, height: 18, borderRadius: 4,
              background: done ? col : `${col}22`,
              border: `1px solid ${col}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: done ? 'white' : col,
              filter: !done && !t.dark ? 'brightness(0.65)' : 'none',
            }}>
              {done ? '✓' : PROCESS_COLORS[pr.type].name.charAt(0)}
            </div>
          );
        })}
      </div>

      {/* フッター */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 6, borderTop: `1px solid ${t.BORDER}`,
      }}>
        <div style={{
          fontSize: 10, color: isUrgent ? (t.dark ? '#f87171' : '#dc2626') : t.MUTED,
          fontWeight: isUrgent ? 600 : 500, display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {isUrgent && '🔥'}
          {deadlineDays > 0 ? `残り ${deadlineDays}日` : '期限切れ'}
        </div>
        {nextProc && (
          <div style={{
            fontSize: 9, color: processColor(nextProc.type, 'solid', t.dark ? 'dark' : 'light'),
            fontWeight: 600,
          }}>
            次: {PROCESS_COLORS[nextProc.type].name}
          </div>
        )}
      </div>
    </div>
  );
}

window.V4Kanban = V4Kanban;
