// V3 Timeline - 月ジャンプ + 狭いDAY_W + サブラベル編集

function V3Timeline({ t, dayW, monthOffset, setMonthOffset, expanded, setExpanded, onEditSub }) {
  // 表示範囲: 基準日から monthOffset 月分シフト、計3ヶ月表示
  const baseDate = new Date(2026, 3 + monthOffset, 1); // 月初
  const monthsToShow = 3;
  const rangeStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const rangeEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToShow, 0);
  const totalDays = Math.round((rangeEnd - rangeStart) / 86400000) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));

  // TODAY (2026/04/21) のindex
  const todayIdx = Math.round((new Date(2026, 3, 21) - rangeStart) / 86400000);

  // 案件の表示範囲内シフト (オリジナルdata: index 0 = 2026/04/15基準)
  const dataStart = new Date(2026, 3, 15);
  const shiftIdx = Math.round((dataStart - rangeStart) / 86400000);

  // 月ヘッダの区切り
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

  // 月ジャンプ: 現在月の開始位置にスクロール
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [monthOffset]);

  const monthLabel = monthBlocks.length > 0
    ? `${monthBlocks[0].year}年 ${monthBlocks[0].month + 1}月 〜 ${monthBlocks[monthBlocks.length - 1].month + 1}月`
    : '';

  return (
    <div style={{
      margin: '14px 20px 16px', background: t.CARD,
      border: `1px solid ${t.BORDER}`, borderRadius: 10, overflow: 'hidden',
    }}>
      {/* ヘッダー: 月ジャンプ */}
      <div style={{
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${t.BORDER}`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.TEXT }}>タイムライン</div>
        <div style={{
          fontSize: 10, color: t.MUTED, padding: '2px 8px',
          background: t.SUBTLE, borderRadius: 4,
        }}>{monthLabel}</div>

        <div style={{ flex: 1 }} />

        {/* 月ナビ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.SUBTLE, borderRadius: 6, padding: 2 }}>
          <button onClick={() => setMonthOffset(monthOffset - 1)} style={{
            width: 24, height: 24, border: 'none', background: 'transparent',
            color: t.MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 4,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button onClick={() => setMonthOffset(0)} style={{
            padding: '3px 10px', fontSize: 11, fontWeight: 600, border: 'none',
            background: monthOffset === 0 ? t.CARD : 'transparent',
            color: monthOffset === 0 ? t.ACCENT : t.MUTED,
            borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: monthOffset === 0 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>今日</button>
          <button onClick={() => setMonthOffset(monthOffset + 1)} style={{
            width: 24, height: 24, border: 'none', background: 'transparent',
            color: t.MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 4,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        {/* 月ピル（クイックジャンプ） */}
        <div style={{ display: 'flex', gap: 3 }}>
          {[-2, -1, 0, 1, 2, 3].map(off => {
            const d = new Date(2026, 3 + off, 1);
            const active = off === monthOffset;
            return (
              <button key={off} onClick={() => setMonthOffset(off)} style={{
                padding: '4px 8px', border: `1px solid ${active ? t.ACCENT : t.BORDER}`,
                background: active ? `${t.ACCENT}15` : t.CARD,
                color: active ? t.ACCENT : t.MUTED,
                borderRadius: 5, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: active ? 600 : 500,
              }}>
                {d.getMonth() + 1}月
              </button>
            );
          })}
        </div>
      </div>

      {/* ボディ */}
      <div style={{ display: 'flex' }}>
        {/* 左: 案件リスト */}
        <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${t.BORDER}` }}>
          <div style={{
            height: 44, padding: '0 14px', display: 'flex', alignItems: 'center',
            borderBottom: `1px solid ${t.BORDER}`, fontSize: 10, color: t.MUTED,
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, background: t.SUBTLE,
          }}>案件 / 工程</div>
          {PROJECTS.map(p => (
            <V3SidebarRow key={p.id} t={t} project={p}
              expanded={expanded[p.id]}
              onToggle={() => setExpanded({ ...expanded, [p.id]: !expanded[p.id] })}
              onEditSub={onEditSub} />
          ))}
        </div>

        {/* 右: 横スクロールタイムライン */}
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ minWidth: dayW * totalDays }}>
            {/* 月見出し帯 */}
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

            {/* 日ヘッダ */}
            <div style={{ height: 22, display: 'flex', borderBottom: `1px solid ${t.BORDER}`, background: t.SUBTLE }}>
              {days.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = i === todayIdx;
                return (
                  <div key={i} style={{
                    width: dayW, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? `${t.ACCENT}20` : (isWeekend ? (t.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent'),
                    borderLeft: d.getDate() === 1 ? `1px solid ${t.BORDER}` : 'none',
                    fontSize: 10, fontWeight: isToday ? 700 : 500,
                    color: isToday ? t.ACCENT : (d.getDay() === 0 ? (t.dark ? '#f87171' : '#c0454d') : d.getDay() === 6 ? (t.dark ? '#60a5fa' : '#3b6caa') : t.TEXT),
                  }}>
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            {/* 案件行 */}
            {PROJECTS.map(project => (
              <V3ProjectRow key={project.id} t={t} project={project}
                days={days} todayIdx={todayIdx} shiftIdx={shiftIdx}
                dayW={dayW} expanded={expanded[project.id]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function V3SidebarRow({ t, project, expanded, onToggle, onEditSub }) {
  const stats = projectStats(project);
  const type = PROJECT_TYPES[project.typeId];
  return (
    <div>
      <div onClick={onToggle} style={{
        height: 44, padding: '0 8px 0 12px',
        display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: `1px solid ${t.BORDER}`, cursor: 'pointer',
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.MUTED} strokeWidth="2.5" style={{
          transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0,
        }}><path d="m9 18 6-6-6-6"/></svg>
        <div style={{
          width: 4, height: 24, borderRadius: 2, flexShrink: 0,
          background: processColor(project.processes[0].type, 'solid', t.dark ? 'dark' : 'light'),
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 500, color: t.TEXT,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{project.name}</div>
          <div style={{ fontSize: 10, color: t.MUTED, marginTop: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
            {type && (
              <span style={{
                padding: '1px 5px', borderRadius: 3, background: `${type.color}20`,
                color: type.color, fontSize: 9, fontWeight: 600,
              }}>{type.name}</span>
            )}
            <span style={{ fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif' }}>{stats.pct}%</span>
          </div>
        </div>
      </div>
      {expanded && project.processes.map(pr => (
        <div key={pr.id} style={{
          height: 32, padding: '0 8px 0 28px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: `1px solid ${t.BORDER}`,
          background: t.dark ? 'rgba(255,255,255,0.02)' : t.SUBTLE + '55',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: 2,
            background: processColor(pr.type, 'solid', t.dark ? 'dark' : 'light'),
          }} />
          <div style={{ fontSize: 11, color: t.TEXT, flex: 1 }}>{PROCESS_COLORS[pr.type].name}</div>
          <button onClick={() => onEditSub(pr.type)} title="サブラベル編集" style={{
            width: 20, height: 20, border: 'none', background: 'transparent',
            color: t.MUTED, cursor: 'pointer', borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
          <div style={{
            fontSize: 10, color: t.MUTED, fontFamily: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Noto Sans JP", "Yu Gothic", sans-serif',
          }}>{pr.actualH.toFixed(1)}/{pr.plannedH}h</div>
        </div>
      ))}
    </div>
  );
}

function V3ProjectRow({ t, project, days, todayIdx, shiftIdx, dayW, expanded }) {
  return (
    <div>
      <div style={{ height: 44, position: 'relative', borderBottom: `1px solid ${t.BORDER}` }}>
        <V3GridBg t={t} days={days} dayW={dayW} />
        <V3TodayLine todayIdx={todayIdx} dayW={dayW} ACCENT={t.ACCENT} />
        {project.processes.map(pr => {
          const s = pr.days[0] + shiftIdx;
          const e = pr.days[pr.days.length - 1] + shiftIdx;
          if (e < 0 || s >= days.length) return null;
          const left = s * dayW + 2;
          const width = (e - s + 1) * dayW - 4;
          const doneRatio = Math.min(1, pr.actualH / pr.plannedH);
          return (
            <div key={pr.id} style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              left, width, height: expanded ? 6 : 22, borderRadius: expanded ? 3 : 5,
              background: processColor(pr.type, 'fill', t.dark ? 'dark' : 'light'),
              border: `1px solid ${processColor(pr.type, 'border', t.dark ? 'dark' : 'light')}55`,
              overflow: 'hidden', cursor: 'grab',
              display: 'flex', alignItems: 'center', padding: '0 4px',
              zIndex: 1, transition: 'height 0.15s',
            }}>
              <div style={{
                position: 'absolute', inset: 0, width: `${doneRatio * 100}%`,
                background: processColor(pr.type, 'solid', t.dark ? 'dark' : 'light'), opacity: 0.35,
              }} />
              {!expanded && width > 60 && (
                <span style={{
                  fontSize: 9, color: processColor(pr.type, 'solid', t.dark ? 'dark' : 'light'),
                  filter: t.dark ? 'brightness(1.6)' : 'brightness(0.55)',
                  fontWeight: 600, zIndex: 1, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {PROCESS_COLORS[pr.type].name}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {expanded && project.processes.map(pr => (
        <V3ProcessRow key={pr.id} t={t} pr={pr} days={days} todayIdx={todayIdx}
          shiftIdx={shiftIdx} dayW={dayW} />
      ))}
    </div>
  );
}

function V3ProcessRow({ t, pr, days, todayIdx, shiftIdx, dayW }) {
  const plannedPerDay = pr.plannedH / pr.days.length;
  const actualPerDay = pr.actualH / pr.days.length;
  return (
    <div style={{
      height: 32, position: 'relative', borderBottom: `1px solid ${t.BORDER}`,
      background: t.dark ? 'rgba(255,255,255,0.02)' : t.SUBTLE + '55',
    }}>
      <V3GridBg t={t} days={days} dayW={dayW} />
      <V3TodayLine todayIdx={todayIdx} dayW={dayW} ACCENT={t.ACCENT} />
      {pr.days.map((dayIdx, i) => {
        const absIdx = dayIdx + shiftIdx;
        if (absIdx < 0 || absIdx >= days.length) return null;
        const isFirst = i === 0;
        const isLast = i === pr.days.length - 1;
        const filled = actualPerDay > 0 && i < Math.ceil(pr.actualH / plannedPerDay);
        return (
          <div key={i} style={{
            position: 'absolute', top: 3, bottom: 3,
            left: absIdx * dayW + (isFirst ? 2 : 1),
            width: dayW - (isFirst && isLast ? 4 : isFirst || isLast ? 3 : 2),
            background: processColor(pr.type, 'fill', t.dark ? 'dark' : 'light'),
            border: `1px solid ${processColor(pr.type, 'border', t.dark ? 'dark' : 'light')}66`,
            borderLeftWidth: isFirst ? 1 : 0,
            borderRightWidth: isLast ? 1 : 0,
            borderTopLeftRadius: isFirst ? 4 : 0,
            borderBottomLeftRadius: isFirst ? 4 : 0,
            borderTopRightRadius: isLast ? 4 : 0,
            borderBottomRightRadius: isLast ? 4 : 0,
            overflow: 'hidden', cursor: 'grab', zIndex: 1,
          }}>
            {filled && (
              <div style={{
                position: 'absolute', inset: 0,
                background: processColor(pr.type, 'solid', t.dark ? 'dark' : 'light'), opacity: 0.3,
              }} />
            )}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: processColor(pr.type, 'solid', t.dark ? 'dark' : 'light'),
              filter: t.dark ? 'brightness(1.6)' : 'brightness(0.55)',
              fontWeight: 600, textAlign: 'center', lineHeight: 1.1,
              padding: '0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>
              {getV3DayLabel(pr, i)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getV3DayLabel(pr, dayPos) {
  // localStorage から読み込むカスタム設定があればそれを優先
  const overrides = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('subLabels') || '{}')) || {};
  const list = overrides[pr.type] || DEFAULT_SUBLABELS[pr.type] || [];
  return list[dayPos] || `Day ${dayPos + 1}`;
}

const DEFAULT_SUBLABELS = {
  kozu: ['下描き', '構図検討', '配置調整', '決定稿'],
  color: ['色決め', '試し塗り', '配色調整', '全体統一'],
  line: ['線画下', '線整理', 'パーツ', '仕上線'],
  seisho: ['ベース', '陰影', 'ハイライト', '調整'],
  bg: ['ラフ', '塗り', '描き込み', '統合'],
  shiage: ['全体調整', 'エフェクト', '最終'],
  jinbutsu: ['人物A', '人物B', '人物C', '統合'],
  design: ['アイデア', '検証', '決定'],
  pers: ['パーツ分離', 'レイヤ整理', '物理設定'],
};

function V3GridBg({ t, days, dayW, holidays }) {
  const hs = holidays || (typeof window !== 'undefined' && window.currentHolidays) || null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      {days.map((d, i) => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isHoliday = hs && hs.has(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
        let bg = 'transparent';
        if (isWeekend || isHoliday) bg = t.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
        return (
          <div key={i} style={{
            width: dayW, flexShrink: 0,
            background: bg,
            borderLeft: d.getDate() === 1 ? `1px solid ${t.BORDER}` : 'none',
          }} />
        );
      })}
    </div>
  );
}

function V3TodayLine({ todayIdx, dayW, ACCENT }) {
  if (todayIdx < 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 0, bottom: 0,
      left: todayIdx * dayW + dayW / 2 - 0.5,
      width: 1.5, background: ACCENT, zIndex: 6, pointerEvents: 'none',
    }} />
  );
}

window.V3Timeline = V3Timeline;
window.DEFAULT_SUBLABELS = DEFAULT_SUBLABELS;
