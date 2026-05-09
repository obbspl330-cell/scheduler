// V3 Lower sections + Modals

function V3MiddleRow({ t }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 12,
      padding: '0 20px 14px',
    }}>
      <V3TodayLog t={t} />
      <V3Summary t={t} />
      <V3Todos t={t} />
    </div>
  );
}

function V3TodayLog({ t }) {
  return (
    <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>今日の作業記録</div>
        <div style={{ fontSize: 11, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>2026/04/21 火</div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1fr 70px 28px', gap: 6,
        alignItems: 'center', marginBottom: 10,
      }}>
        <div style={{ padding: '6px 10px', border: `1px solid ${t.BORDER}`, borderRadius: 6, fontSize: 11, background: t.SUBTLE, color: t.MUTED }}>案件...</div>
        <div style={{ padding: '6px 10px', border: `1px solid ${t.BORDER}`, borderRadius: 6, fontSize: 11, background: t.SUBTLE, color: t.MUTED }}>工程...</div>
        <div style={{ padding: '6px 10px', border: `1px solid ${t.BORDER}`, borderRadius: 6, fontSize: 11, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', color: t.MUTED, textAlign: 'right' }}>0.0 h</div>
        <button style={{
          width: 28, height: 28, borderRadius: 6, border: 'none',
          background: t.ACCENT, color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      {TODAY_LOG.map(log => {
        const p = PROJECTS.find(x => x.id === log.projectId);
        return (
          <div key={log.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 6, marginBottom: 4, background: t.SUBTLE,
          }}>
            <div style={{
              width: 4, alignSelf: 'stretch', borderRadius: 2, minHeight: 24,
              background: processColor(log.type, 'solid', t.dark ? 'dark' : 'light'),
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: 10, color: t.MUTED }}>{PROCESS_COLORS[log.type].name}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', letterSpacing: -0.5, color: t.TEXT }}>
              {log.hours.toFixed(1)}<span style={{ fontSize: 10, color: t.MUTED, fontWeight: 400 }}>h</span>
            </div>
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
          <div style={{ fontSize: 10, color: t.MUTED, marginTop: 2 }}>目標 3.0h / 133%</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.ACCENT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', letterSpacing: -1 }}>
          4.0<span style={{ fontSize: 12 }}>h</span>
        </div>
      </div>
    </div>
  );
}

function V3Summary({ t }) {
  return (
    <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>案件別サマリー</div>
        <div style={{ fontSize: 10, color: t.MUTED }}>累計作業時間</div>
      </div>
      {SUMMARY.map(s => {
        const p = PROJECTS.find(x => x.id === s.projectId);
        const total = SUMMARY.reduce((a, b) => a + b.hours, 0);
        const pct = (s.hours / total) * 100;
        return (
          <div key={s.projectId} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: t.TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{p.name}</span>
              <span style={{ color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>{s.hours.toFixed(1)}h</span>
            </div>
            <div style={{ height: 5, background: t.SUBTLE, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: processColor(p.processes[0].type, 'solid', t.dark ? 'dark' : 'light'),
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function V3Todos({ t }) {
  return (
    <div style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <button style={{
          padding: '4px 10px', borderRadius: 6, border: 'none',
          background: t.TEXT, color: t.dark ? t.BG : 'white', fontSize: 11, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>ToDos</button>
        <button style={{
          padding: '4px 10px', borderRadius: 6, border: 'none',
          background: 'transparent', color: t.MUTED, fontSize: 11, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>ルーティン</button>
      </div>
      {TODOS.map(td => (
        <div key={td.id} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 2px', fontSize: 12,
          color: td.done ? t.MUTED : t.TEXT, textDecoration: td.done ? 'line-through' : 'none',
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: 4,
            border: `1.5px solid ${td.done ? t.ACCENT : t.BORDER}`,
            background: td.done ? t.ACCENT : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {td.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="m5 12 5 5L20 7"/></svg>}
          </div>
          {td.text}
        </div>
      ))}
      <button style={{
        width: '100%', padding: '6px', background: 'transparent',
        border: `1px dashed ${t.BORDER}`, borderRadius: 6, cursor: 'pointer',
        fontSize: 11, color: t.MUTED, fontFamily: 'inherit', marginTop: 6,
      }}>＋ 追加</button>
    </div>
  );
}

function V3TypeAverages({ t, selectedType, setSelectedType }) {
  const avg = TYPE_PROCESS_AVG[selectedType];
  const types = Object.keys(avg);
  const maxV = Math.max(...types.map(k => avg[k]));
  const total = types.reduce((s, k) => s + avg[k], 0);
  const typeInfo = PROJECT_TYPES[selectedType];
  const projectsOfType = PROJECTS.filter(p => p.typeId === selectedType);
  return (
    <div style={{
      margin: '0 20px 14px', background: t.CARD,
      border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>案件タイプ別 · 工程平均作業時間</div>
          <div style={{ fontSize: 11, color: t.MUTED, marginTop: 2 }}>
            過去の案件から算出。見積もり時の参考に。
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.values(PROJECT_TYPES).map(ty => {
            const active = ty.id === selectedType;
            return (
              <button key={ty.id} onClick={() => setSelectedType(ty.id)} style={{
                padding: '5px 10px', borderRadius: 6,
                border: `1px solid ${active ? ty.color : t.BORDER}`,
                background: active ? `${ty.color}15` : t.CARD,
                color: active ? ty.color : t.MUTED,
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: ty.color }} />
                {ty.name}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 24 }}>
        <div>
          {types.map(k => {
            const v = avg[k];
            const pct = (v / maxV) * 100;
            return (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: processColor(k, 'solid', t.dark ? 'dark' : 'light') }} />
                    <span style={{ fontSize: 11.5, color: t.TEXT, fontWeight: 500 }}>{PROCESS_COLORS[k].name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', fontWeight: 600 }}>
                    {v.toFixed(1)}<span style={{ fontSize: 9, color: t.MUTED, fontWeight: 400 }}>h / 案件</span>
                  </span>
                </div>
                <div style={{ height: 8, background: t.SUBTLE, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: `linear-gradient(90deg, ${processColor(k, 'fill', t.dark ? 'dark' : 'light')}, ${processColor(k, 'solid', t.dark ? 'dark' : 'light')})`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '12px 14px', background: t.SUBTLE, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: typeInfo.color }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: t.TEXT }}>{typeInfo.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.MUTED, marginBottom: 2 }}>平均合計</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: t.TEXT, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif', letterSpacing: -0.5 }}>
              {total.toFixed(1)}<span style={{ fontSize: 11, color: t.MUTED }}>h / 件</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.MUTED, marginBottom: 2 }}>該当案件</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.TEXT }}>{projectsOfType.length}件</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function V3KPICards({ t }) {
  const cards = [
    { label: '今日の作業時間', value: '4.0', unit: 'h', sub: '目標 3.0h', trend: '+33%', good: true, chart: [0.5, 0.5, 1.0, 0.0, 0.5, 1.0, 0.5], hue: 30 },
    { label: '今週累計', value: '23.5', unit: 'h', sub: '先週比 +4.2h', trend: '+22%', good: true, chart: [3.0, 4.5, 5.0, 2.5, 4.5, 4.0, 0], hue: 150 },
    { label: '進行中案件', value: '6', unit: '件', sub: '工程17件 稼働中', trend: '直近3日', chart: [2, 3, 3, 4, 5, 6, 6], hue: 220 },
    { label: '次の締切', value: '8', unit: '日', sub: 'うおすすめ×インディー', trend: '4/28', alarm: true, chart: [], hue: 10 },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '0 20px 20px' }}>
      {cards.map((c, i) => (
        <div key={i} style={{ background: t.CARD, border: `1px solid ${t.BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: t.MUTED, fontWeight: 500 }}>{c.label}</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: c.good ? (t.dark ? '#5ee1a9' : '#059669') : t.MUTED,
              background: c.good ? (t.dark ? 'rgba(94,225,169,0.15)' : '#d1fae5') : c.alarm ? (t.dark ? 'rgba(251,191,36,0.15)' : '#fef3c7') : t.SUBTLE,
              padding: '2px 6px', borderRadius: 4,
            }}>{c.trend}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: t.TEXT, letterSpacing: -1 }}>{c.value}</span>
            <span style={{ fontSize: 13, color: t.MUTED, fontWeight: 500 }}>{c.unit}</span>
          </div>
          <div style={{ fontSize: 11, color: t.MUTED, marginTop: 2 }}>{c.sub}</div>
          {c.chart.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginTop: 8, height: 24 }}>
              {c.chart.map((v, j) => (
                <div key={j} style={{
                  flex: 1, height: `${(v / Math.max(...c.chart)) * 100}%`,
                  background: `hsl(${c.hue} 60% ${t.dark ? 60 : 55}%)`,
                  borderRadius: 2, opacity: v === 0 ? 0.15 : j === c.chart.length - 1 ? 1 : 0.5,
                  minHeight: 2,
                }} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { V3MiddleRow, V3TypeAverages, V3KPICards });
