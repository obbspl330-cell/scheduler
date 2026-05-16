// V4 レポート画面

function V4Report({ t, store }) {
  const [range, setRange] = React.useState('week');
  const [expandedProj, setExpandedProj] = React.useState({});

  // 集計
  const byType = {};
  store.projects.forEach(p => {
    p.processes.forEach(pr => {
      byType[pr.type] = (byType[pr.type] || 0) + pr.actualH;
    });
  });
  const typeEntries = Object.entries(byType).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const maxType = Math.max(...typeEntries.map(([, v]) => v), 1);

  const byProject = store.projects.map(p => ({
    p, hours: p.processes.reduce((s, x) => s + x.actualH, 0),
  })).filter(x => x.hours > 0).sort((a, b) => b.hours - a.hours);
  const maxProj = Math.max(...byProject.map(x => x.hours), 1);

  // 週次グラフ（ダミー）
  const weekData = [3.5, 4.5, 5.0, 2.5, 4.0, 4.5, 0];
  const weekLabels = ['月', '火', '水', '木', '金', '土', '日'];
  const maxDay = Math.max(...weekData);
  const totalWeek = weekData.reduce((a, b) => a + b, 0);

  // タイプ別
  const byTypeProj = {};
  store.projects.forEach(p => {
    const h = p.processes.reduce((s, x) => s + x.actualH, 0);
    byTypeProj[p.typeId] = (byTypeProj[p.typeId] || 0) + h;
  });
  const typeProjEntries = Object.entries(byTypeProj).filter(([, v]) => v > 0);

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: t.TEXT, letterSpacing: -0.3 }}>レポート</div>
          <div style={{ fontSize: 11, color: t.MUTED, marginTop: 2 }}>作業時間の内訳と傾向</div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: t.SUBTLE, borderRadius: 6, padding: 2 }}>
          {[['week', '週'], ['month', '月'], ['quarter', '四半期'], ['year', '年']].map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)} style={{
              padding: '5px 14px', border: 'none', borderRadius: 4,
              background: range === k ? t.CARD : 'transparent',
              color: range === k ? t.ACCENT : t.MUTED,
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* サマリカード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <ReportStat t={t} label="今週の作業時間" value={totalWeek.toFixed(1)} unit="h" sub="目標 25h / 94%" trend="+4.2h" />
        <ReportStat t={t} label="稼働日数" value="6" unit="日" sub="平均 3.9h / 日" trend="休息1日" />
        <ReportStat t={t} label="完了工程" value="3" unit="件" sub="構図ラフ × 3" trend="進行中17" />
        <ReportStat t={t} label="最長集中" value="5.0" unit="h" sub="水 · 線画・基礎塗り" trend="👑" />
      </div>

      {/* 週次グラフ */}
      <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>日別作業時間</div>
          <div style={{ fontSize: 11, color: t.MUTED }}>2026/04/15 - 04/21</div>
        </div>
        {/* バー領域と日付ラベル領域を分離（同列の flex 内で混在させると pct=100 付近で
            flex-shrink によりバーが圧縮され、増減が非線形に見える現象を回避） */}
        <div style={{ padding: '0 10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 200 }}>
            {weekData.map((v, i) => {
              const h = (v / maxDay) * 100;
              const isToday = i === 1;
              return (
                <div key={i} style={{
                  flex: 1, height: `${h}%`, minHeight: v > 0 ? 8 : 2,
                  background: v === 0 ? t.SUBTLE : isToday ? t.ACCENT : `${t.ACCENT}88`,
                  borderRadius: '4px 4px 0 0',
                  border: isToday ? `1px solid ${t.ACCENT}` : 'none',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: -18, left: 0, right: 0,
                    textAlign: 'center', fontSize: 10, fontWeight: 600,
                    color: v > 0 ? t.TEXT : t.MUTED,
                    fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                  }}>
                    {v > 0 ? `${v.toFixed(1)}h` : '-'}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {weekData.map((v, i) => {
              const isToday = i === 1;
              return (
                <div key={i} style={{
                  flex: 1, textAlign: 'center',
                  fontSize: 10, color: isToday ? t.ACCENT : t.MUTED, fontWeight: isToday ? 700 : 500,
                }}>
                  {weekLabels[i]}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* 工程別内訳 */}
        <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT, marginBottom: 14 }}>工程別・累計時間</div>
          {typeEntries.map(([k, v]) => {
            const col = processColor(k, 'solid', t.dark ? 'dark' : 'light');
            const pct = (v / maxType) * 100;
            return (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: col }} />
                    <span style={{ fontSize: 11.5, color: t.TEXT, fontWeight: 500 }}>{PROCESS_COLORS[k].name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', fontWeight: 600 }}>
                    {v.toFixed(1)}<span style={{ fontSize: 9, color: t.MUTED, fontWeight: 400 }}>h</span>
                  </span>
                </div>
                <div style={{ height: 7, background: t.SUBTLE, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: col }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* タイプ別ドーナツ */}
        <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT, marginBottom: 14 }}>案件タイプ別配分</div>
          <V4Donut t={t} entries={typeProjEntries} types={store.types} />
        </div>
      </div>

      {/* 案件別 */}
      <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT, marginBottom: 14 }}>案件別・累計時間ランキング</div>
        {byProject.map((x, i) => {
          const ty = store.types[x.p.typeId];
          const pct = (x.hours / maxProj) * 100;
          const isOpen = !!expandedProj[x.p.id];
          const procs = [...x.p.processes]
            .filter(pr => pr.actualH > 0)
            .sort((a, b) => b.actualH - a.actualH);
          const isLast = i === byProject.length - 1;
          return (
            <div key={x.p.id} style={{
              borderBottom: !isLast ? `1px solid ${t.BORDER}` : 'none',
            }}>
              <div
                onClick={() => setExpandedProj(s => ({ ...s, [x.p.id]: !s[x.p.id] }))}
                style={{
                  display: 'grid', gridTemplateColumns: '16px 24px 1fr 1fr 60px', gap: 12,
                  alignItems: 'center', padding: '8px 0', cursor: 'pointer',
                }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2.5"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                  <path d="m9 18 6-6-6-6"/>
                </svg>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: i < 3 ? t.ACCENT : t.MUTED,
                  fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                }}>#{i + 1}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: t.TEXT }}>{store?.displayName ? store.displayName(x.p) : x.p.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                    {ty && <span style={{ fontSize: 10, color: ty.color, fontWeight: 600 }}>{ty.name}</span>}
                    <span style={{ fontSize: 10, color: t.MUTED }}>工程 {procs.length}</span>
                  </div>
                </div>
                <div style={{ height: 6, background: t.SUBTLE, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: ty?.color || t.ACCENT }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', textAlign: 'right' }}>
                  {x.hours.toFixed(1)}<span style={{ fontSize: 10, color: t.MUTED, fontWeight: 400 }}>h</span>
                </div>
              </div>
              {isOpen && (
                <div style={{
                  padding: '4px 0 12px 52px', display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  {procs.length === 0 && (
                    <div style={{ fontSize: 10, color: t.MUTED }}>実績のある工程はまだありません</div>
                  )}
                  {procs.map(pr => {
                    const pcol = processColor(pr.type, 'solid', t.dark ? 'dark' : 'light');
                    const pPct = x.hours > 0 ? (pr.actualH / x.hours) * 100 : 0;
                    const planPct = pr.plannedH > 0 ? Math.min(100, (pr.actualH / pr.plannedH) * 100) : 0;
                    return (
                      <div key={pr.id} style={{
                        display: 'grid', gridTemplateColumns: '10px 1fr 70px 120px 90px', gap: 10,
                        alignItems: 'center', padding: '4px 10px', background: t.SUBTLE, borderRadius: 4,
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: pcol }} />
                        <div style={{ fontSize: 11, color: t.TEXT, fontWeight: 500 }}>
                          {PROCESS_COLORS[pr.type]?.name || pr.type}
                        </div>
                        <div style={{
                          fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                        }}>
                          {pPct.toFixed(0)}% of 案件
                        </div>
                        <div style={{ height: 5, background: t.CARD, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${planPct}%`, background: pcol }} />
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 600, color: t.TEXT,
                          fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', textAlign: 'right',
                        }}>
                          {pr.actualH.toFixed(1)}<span style={{ fontSize: 9, color: t.MUTED, fontWeight: 400 }}> / {pr.plannedH}h</span>
                        </div>
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

function ReportStat({ t, label, value, unit, sub, trend }) {
  return (
    <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: t.MUTED, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: t.ACCENT, background: `${t.ACCENT}15`, padding: '2px 6px', borderRadius: 4 }}>{trend}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: t.TEXT, letterSpacing: -1 }}>{value}</span>
        <span style={{ fontSize: 13, color: t.MUTED, fontWeight: 500 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 11, color: t.MUTED, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function V4Donut({ t, entries, types }) {
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let acc = 0;
  const R = 60, CX = 90, CY = 90, SW = 22;
  const C = 2 * Math.PI * R;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width="180" height="180">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={t.SUBTLE} strokeWidth={SW} />
        {entries.map(([k, v], i) => {
          const tp = types[k];
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
          {total.toFixed(0)}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" fill={t.MUTED}>h 合計</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(([k, v]) => {
          const tp = types[k];
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: tp?.color || t.ACCENT }} />
              <div style={{ flex: 1, fontSize: 11, color: t.TEXT }}>{tp?.name || k}</div>
              <div style={{ fontSize: 11, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
                {v.toFixed(1)}h
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

// V4MiddleRow - Today logをstore対応に
function V4MiddleRow({ t, store }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 12, padding: '0 20px 14px' }}>
      <V4TodayLog t={t} store={store} />
      <V3Summary t={t} />
      <V3Todos t={t} />
    </div>
  );
}

function V4TodayLog({ t, store }) {
  const [editing, setEditing] = React.useState(null);
  const total = store.logs.reduce((s, l) => s + l.hours, 0);
  return (
    <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>今日の作業記録</div>
        <div style={{ fontSize: 11, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
          2026/04/21 火 · {store.logs.length}件
        </div>
      </div>
      {store.logs.map(log => {
        const p = store.projects.find(x => x.id === log.projectId);
        const col = processColor(log.type, 'solid', t.dark ? 'dark' : 'light');
        const isEdit = editing === log.id;
        return (
          <div key={log.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 6, marginBottom: 4, background: t.SUBTLE,
          }}>
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, minHeight: 24, background: col }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p ? (store.displayName ? store.displayName(p) : p.name) : ''}</div>
              <div style={{ fontSize: 10, color: t.MUTED }}>{PROCESS_COLORS[log.type].name}</div>
            </div>
            {isEdit ? (
              <input type="number" step="0.25" value={log.hours}
                autoFocus onBlur={() => setEditing(null)}
                onChange={e => store.updateLog(log.id, { hours: parseFloat(e.target.value) || 0 })}
                onKeyDown={e => e.key === 'Enter' && setEditing(null)}
                style={{
                  width: 60, padding: '4px 8px', fontSize: 12, border: `1px solid ${t.ACCENT}`,
                  borderRadius: 4, background: t.CARD, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
                  textAlign: 'right', outline: 'none',
                }} />
            ) : (
              <button onClick={() => setEditing(log.id)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 14, fontWeight: 700, color: t.TEXT, letterSpacing: -0.5,
              }}>
                {log.hours.toFixed(1)}<span style={{ fontSize: 10, color: t.MUTED, fontWeight: 400 }}>h</span>
              </button>
            )}
            <button onClick={() => store.deleteLog(log.id)} style={{
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
          <div style={{ fontSize: 10, color: t.MUTED }}>本日合計</div>
          <div style={{ fontSize: 10, color: t.MUTED, marginTop: 2 }}>目標 3.0h / {Math.round(total / 3 * 100)}%</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.ACCENT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', letterSpacing: -1 }}>
          {total.toFixed(1)}<span style={{ fontSize: 12 }}>h</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { V4Report, V4MiddleRow, V4TodayLog });
