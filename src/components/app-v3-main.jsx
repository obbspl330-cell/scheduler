// AppV3 - 統合版 v3 / 全機能込み・単一ファイル

function AppV3({ width = 1440 }) {
  const [themeId, setThemeId] = React.useState('paper');
  const [expanded, setExpanded] = React.useState({ p1: true, p2: false, p3: false, p4: false, p5: false, p6: false });
  const [selectedType, setSelectedType] = React.useState('oneillust');
  const [dayW] = React.useState(28);
  const [monthOffset, setMonthOffset] = React.useState(0);
  const [showNewProject, setShowNewProject] = React.useState(false);
  const [showFocus, setShowFocus] = React.useState(false);
  const [showSubLabel, setShowSubLabel] = React.useState(null);

  const t = THEMES[themeId];

  return (
    <div style={{
      width, background: t.BG, color: t.TEXT, position: 'relative',
      fontSize: 13,
      display: 'flex', minHeight: 1100,
    }}>
      <V3IconNav t={t} onFocus={() => setShowFocus(true)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <V3TopBar t={t} themeId={themeId} setThemeId={setThemeId} onFocus={() => setShowFocus(true)} />
        <V3SubHeader t={t} onNewProject={() => setShowNewProject(true)} />
        <V3Greeting t={t} />
        <V3Timeline t={t} dayW={dayW} monthOffset={monthOffset} setMonthOffset={setMonthOffset}
          expanded={expanded} setExpanded={setExpanded}
          onEditSub={(key) => setShowSubLabel(key)} />
        <V3MiddleRow t={t} />
        <V3TypeAverages t={t} selectedType={selectedType} setSelectedType={setSelectedType} />
        <V3KPICards t={t} />
      </div>
      {showNewProject && <V3NewProjectModal t={t} onClose={() => setShowNewProject(false)} />}
      {showFocus && <V3FocusMode t={t} onClose={() => setShowFocus(false)} />}
      {showSubLabel && <V3SubLabelEditor t={t} processKey={showSubLabel} onClose={() => setShowSubLabel(null)} />}
    </div>
  );
}

// ============ 左アイコンナビ ============
function V3IconNav({ t, onFocus }) {
  const Item = ({ icon, active, label, onClick }) => (
    <button title={label} onClick={onClick} style={{
      width: 36, height: 36, border: 'none', cursor: 'pointer',
      background: active ? t.TEXT : 'transparent',
      color: active ? (t.dark ? t.BG : 'white') : t.MUTED, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{icon}</button>
  );
  return (
    <div style={{
      width: 56, background: t.CARD, borderRight: `1px solid ${t.BORDER}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '14px 0', gap: 5, flexShrink: 0,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: `linear-gradient(135deg, ${t.ACCENT}, ${t.ACCENT}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 8,
      }}>案</div>
      <Item active label="タイムライン" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>} />
      <Item label="カンバン" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="11" rx="1"/></svg>} />
      <Item label="レポート" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 16V9M12 16v-5M17 16v-9"/></svg>} />
      <Item label="集中モード" onClick={onFocus} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} />
      <div style={{ flex: 1 }} />
      <Item label="設定" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/></svg>} />
    </div>
  );
}

// ============ トップバー（テーマ切替付き） ============
function V3TopBar({ t, themeId, setThemeId, onFocus }) {
  const [themeOpen, setThemeOpen] = React.useState(false);
  return (
    <div style={{
      height: 52, background: t.CARD, borderBottom: `1px solid ${t.BORDER}`,
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0,
      position: 'relative',
    }}>
      <div style={{ fontSize: 12, color: t.MUTED }}>ワークスペース</div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>案件スケジューラー</div>
      <div style={{ flex: 1 }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
        border: `1px solid ${t.BORDER}`, borderRadius: 6, fontSize: 11, color: t.MUTED,
        width: 200, background: t.BG,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <span>検索...</span>
        <div style={{ flex: 1 }} />
        <kbd style={{ fontSize: 9, padding: '1px 4px', background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 3 }}>⌘K</kbd>
      </div>

      {/* テーマ切替 */}
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
          </div>
        )}
      </div>

      {/* ポモドーロ小表示 */}
      <button onClick={onFocus} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px',
        border: `1px solid ${t.ACCENT}44`, borderRadius: 20, background: t.dark ? `${t.ACCENT}18` : '#fff7f0',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: `conic-gradient(${t.ACCENT} 30%, ${t.ACCENT}22 30%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.ACCENT }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', color: t.ACCENT }}>25:00</span>
          <span style={{ fontSize: 9, color: t.MUTED, marginTop: 1 }}>集中 · 1/5</span>
        </div>
      </button>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: `linear-gradient(135deg, ${t.ACCENT}dd, ${t.ACCENT})`,
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600,
      }}>Y</div>
    </div>
  );
}

// ============ サブヘッダー ============
function V3SubHeader({ t, onNewProject }) {
  const TabChip = ({ label, count, active }) => (
    <button style={{
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
  return (
    <div style={{
      padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: `1px solid ${t.BORDER}`, background: t.CARD,
    }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3, color: t.TEXT }}>ダッシュボード</div>
        <div style={{ fontSize: 11, color: t.MUTED, marginTop: 2 }}>2026年4月21日 火曜日 · Week 17</div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 4 }}>
        <TabChip label="進行中" count={6} active />
        <TabChip label="完了" count={4} />
        <TabChip label="ドラフト" count={2} />
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
}

// ============ 挨拶ヘッダー ============
function V3Greeting({ t }) {
  const todayProcs = [];
  PROJECTS.forEach(p => p.processes.forEach(pr => {
    if (pr.days.includes(5)) todayProcs.push({ project: p, pr });
  }));
  return (
    <div style={{
      margin: '16px 20px 0', padding: '20px 24px',
      background: t.GREET_BG, border: `1px solid ${t.ACCENT}22`, borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `linear-gradient(135deg, ${t.ACCENT}, ${t.ACCENT}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 22,
      }}>☕</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: t.MUTED, marginBottom: 4, letterSpacing: 0.5 }}>
          2026 · APR · WEEK 17 · TUE
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: t.TEXT, letterSpacing: -0.3 }}>
          おかえりなさい。今日は<span style={{ color: t.ACCENT, fontWeight: 700 }}>{todayProcs.length}つの工程</span>が予定されています。
        </div>
        <div style={{ fontSize: 12, color: t.MUTED, marginTop: 4 }}>
          {todayProcs.slice(0, 3).map((x, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <span style={{ color: processColor(x.pr.type, 'solid', t.dark ? 'dark' : 'light'), fontWeight: 500 }}>
                ● {PROCESS_COLORS[x.pr.type].name}
              </span>
              <span> ({x.project.name.slice(0, 8)}...)</span>
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <GreetChip t={t} label="今日の予定" value={todayProcs.length + ''} unit="工程" color={t.ACCENT} />
        <GreetChip t={t} label="今週累計" value="23.5" unit="h" color={t.dark ? '#5ee1a9' : '#059669'} />
        <GreetChip t={t} label="次の締切" value="8" unit="日" color={t.dark ? '#fbbf24' : '#d97706'} />
      </div>
    </div>
  );
}

function GreetChip({ t, label, value, unit, color }) {
  return (
    <div style={{
      padding: '10px 14px', background: t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
      border: `1px solid ${t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`, borderRadius: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 80,
    }}>
      <span style={{ fontSize: 9, color: t.MUTED, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', letterSpacing: -0.5 }}>{value}</span>
        <span style={{ fontSize: 10, color: t.MUTED }}>{unit}</span>
      </div>
    </div>
  );
}

window.AppV3 = AppV3;
window.V3Greeting = V3Greeting;
