// V4 - Main app with sidebar navigation between Timeline / Kanban / Report

const EXPANDED_KEY = 'v5.projectExpanded';
const THEME_KEY = 'v5.themeId';

function AppV4({ width = 1440 }) {
  const [themeId, setThemeId] = React.useState(() => {
    try {
      const id = localStorage.getItem(THEME_KEY);
      if (id && THEMES[id]) return id;
    } catch (e) {}
    return 'paper';
  });
  React.useEffect(() => {
    try { localStorage.setItem(THEME_KEY, themeId); } catch (e) {}
  }, [themeId]);
  const [page, setPage] = React.useState('timeline');
  const [expanded, setExpanded] = React.useState(() => {
    try {
      const raw = localStorage.getItem(EXPANDED_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  });
  const [selectedType, setSelectedType] = React.useState('oneillust');
  const [dayW] = React.useState(28);
  const [monthOffset, setMonthOffset] = React.useState(0);
  const [showNewProject, setShowNewProject] = React.useState(false);
  const [showPomoSetup, setShowPomoSetup] = React.useState(false);
  const [showFocus, setShowFocus] = React.useState(false);
  const [showSubLabel, setShowSubLabel] = React.useState(null);
  const [focusTask, setFocusTask] = React.useState(null);
  const [editingProjectId, setEditingProjectId] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const store = useV4Store();
  const t = THEMES[themeId];

  // 工程カラー / ユーザーテーマ変更時の強制再描画（window.THEMES / PROCESS_COLORS の mutate を反映）
  const [, _bump] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const h = () => _bump();
    window.addEventListener('colorsettings-change', h);
    window.addEventListener('usertheme-change', h);
    return () => {
      window.removeEventListener('colorsettings-change', h);
      window.removeEventListener('usertheme-change', h);
    };
  }, []);
  // テーマ ID を html[data-theme] に反映（テーマ別 CSS フック用）
  React.useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  // 保存データがない初回起動時のみ、最上部の案件を開いた状態で初期化
  const expandedInitRef = React.useRef(false);
  React.useLayoutEffect(() => {
    if (expandedInitRef.current) return;
    let hasSaved = false;
    try { hasSaved = localStorage.getItem(EXPANDED_KEY) !== null; } catch (e) {}
    if (!hasSaved && store.projects.length > 0) {
      setExpanded({ [store.projects[0].id]: true });
    }
    expandedInitRef.current = true;
  }, [store.projects]);

  // 開閉状態を localStorage に永続化
  React.useEffect(() => {
    try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(expanded)); } catch (e) {}
  }, [expanded]);

  const matchSearch = (p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const type = store.types?.[p.typeId] || PROJECT_TYPES[p.typeId];
    return (
      p.name.toLowerCase().includes(q) ||
      (p.client || '').toLowerCase().includes(q) ||
      (p.note || '').toLowerCase().includes(q) ||
      (type?.name || '').toLowerCase().includes(q) ||
      p.processes.some(pr => (PROCESS_COLORS[pr.type]?.name || '').toLowerCase().includes(q))
    );
  };
  const isDone = (p) => (p.boardStatus || computedBoardStatus(p)) === 'done';
  const searchedStore = { ...store, projects: store.projects.filter(matchSearch) };
  const timelineStore = { ...searchedStore, projects: searchedStore.projects.filter(p => !isDone(p)) };

  // ポモドーロ timer state: AppV4 が所有 → FocusMode と TopBar が同じ値を参照
  const pomo = usePomoTimer(focusTask);

  const startPomo = (task) => {
    setShowPomoSetup(false);
    setFocusTask(task);
    setShowFocus(true);
  };
  // 集中モードアイコン押下時: タイマー稼働中なら再表示、それ以外は設定画面
  const openFocus = () => {
    if (focusTask) setShowFocus(true);
    else setShowPomoSetup(true);
  };
  // 閉じる = 非表示のみ（タイマーは継続）。完了画面 / リセットからの終了は完全終了
  const hideFocus = () => setShowFocus(false);
  const endFocus = () => { setShowFocus(false); setFocusTask(null); };
  // リセット: タイマーを終了して設定画面へ戻る
  const resetFocus = () => { setShowFocus(false); setFocusTask(null); setShowPomoSetup(true); };
  // 作業時間(分) → 時(0.1h単位で四捨五入)
  const minToRoundedHours = (m) => Math.round((m / 60) * 10) / 10;
  // 同日・同案件・同工程のログがあれば加算、無ければ新規追加
  // 工程の actualH（集計対象）にも同時に加算する
  const addOrMergeTodayLog = ({ projectId, type, hours }) => {
    if (!projectId || !type || !hours) return;
    const pad = (n) => String(n).padStart(2, '0');
    const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const todayKey = window.TODAY_KEY || dateKey(new Date());
    const existing = store.logs.find(l => {
      if (l.projectId !== projectId || l.type !== type) return false;
      if (l.date) return l.date === todayKey;
      if (l.createdAt) return dateKey(new Date(l.createdAt)) === todayKey;
      return false;
    });
    if (existing) {
      const merged = Math.round(((existing.hours || 0) + hours) * 10) / 10;
      store.updateLog(existing.id, { hours: merged });
    } else {
      store.addLog({
        projectId, type, hours,
        date: todayKey,
        createdAt: Date.now(),
      });
    }
    // 集計に反映させるため工程の actualH にも加算
    if (store.addToProcessActual) {
      store.addToProcessActual(projectId, type, hours);
    }
  };
  // 記録して終了: 途中経過 (完了セット + 現在の作業フェーズ経過) をログ化してタイマー終了
  const recordAndEndFocus = () => {
    if (focusTask && pomo) {
      let totalMin = pomo.workedMin;
      if (pomo.phase === 'work' && pomo.phaseSec > 0) {
        totalMin += (pomo.phaseSec - pomo.sec) / 60;
      }
      if (focusTask.projectId && totalMin > 0) {
        addOrMergeTodayLog({
          projectId: focusTask.projectId,
          type: focusTask.procType,
          hours: minToRoundedHours(totalMin),
        });
      }
    }
    setShowFocus(false);
    setFocusTask(null);
  };

  // 自動ログ記録 (完了時・projectId 紐付け・autoLog 有効)
  React.useEffect(() => {
    if (!focusTask || !pomo) return;
    if (pomo.phase === 'done' && focusTask.settings.autoLog && focusTask.projectId && pomo.workedMin > 0) {
      addOrMergeTodayLog({
        projectId: focusTask.projectId,
        type: focusTask.procType,
        hours: minToRoundedHours(pomo.workedMin),
      });
    }
  }, [pomo?.phase, focusTask]);

  return (
    <div style={{
      width, background: t.BG, color: t.TEXT, position: 'relative',
      fontSize: 13,
      display: 'flex', minHeight: '100%',
    }}>
      <V4IconNav t={t} page={page} setPage={setPage} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <V3TopBar t={t} themeId={themeId} setThemeId={setThemeId} onFocus={openFocus}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} pomo={pomo} store={store} />

        {/* ページ切替時に enter アニメーション (transitions.dev: Page Transition) */}
        <div key={page} style={{ animation: 'v5-page-enter 0.22s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {page === 'timeline' && (
            <>
              <V3SubHeader t={t} store={store} page={page} setPage={setPage} onNewProject={() => setShowNewProject(true)} />
              <V3Greeting t={t} store={store} />
              <V4Timeline t={t} store={timelineStore} dayW={dayW} monthOffset={monthOffset} setMonthOffset={setMonthOffset}
                expanded={expanded} setExpanded={setExpanded}
                onEditSub={(key) => setShowSubLabel(key)}
                onEditProject={(p) => setEditingProjectId(p.id)} />
              <V4MiddleRow t={t} store={store} />
              <V5DailyHoursChart t={t} store={store} />
              <V3KPICards t={t} store={store} />
            </>
          )}

          {page === 'kanban' && <V4Kanban t={t} store={searchedStore} onNewProject={() => setShowNewProject(true)} onEditProject={(p) => setEditingProjectId(p.id)} />}
          {page === 'report' && <V4Report t={t} store={store} />}
          {page === 'done' && (
            <>
              <V3SubHeader t={t} store={store} page={page} setPage={setPage} onNewProject={() => setShowNewProject(true)} />
              <V4CompletedView t={t} store={searchedStore} dayW={dayW} monthOffset={monthOffset} setMonthOffset={setMonthOffset}
                expanded={expanded} setExpanded={setExpanded}
                onEditSub={(key) => setShowSubLabel(key)}
                onEditProject={(p) => setEditingProjectId(p.id)} />
            </>
          )}
        </div>
      </div>

      {showNewProject && <V3NewProjectModal t={t} store={store} onClose={() => setShowNewProject(false)} />}
      {showPomoSetup && <V4PomoSetup t={t} store={store} onStart={startPomo} onClose={() => setShowPomoSetup(false)} />}
      {focusTask && (
        <div style={{ display: showFocus ? 'block' : 'none' }}>
          <V4FocusMode t={t} store={store} task={focusTask} pomo={pomo}
            onClose={hideFocus} onEnd={endFocus} onReset={resetFocus} onRecordEnd={recordAndEndFocus} />
        </div>
      )}
      {showSubLabel && <V3SubLabelEditor t={t} processKey={showSubLabel} onClose={() => setShowSubLabel(null)} />}
      {editingProjectId && (() => {
        const proj = store.projects.find(p => p.id === editingProjectId);
        if (!proj) { setEditingProjectId(null); return null; }
        return <V5ProjectEditor t={t} store={store} project={proj}
          onClose={() => setEditingProjectId(null)}
          onEditSub={(key) => setShowSubLabel(key)} />;
      })()}
    </div>
  );
}

function V4IconNav({ t, page, setPage }) {
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
      // スクロール時もアイコンメニューが追従するよう sticky 配置
      // 高さは titlebar 30px ぶんを引いて #app-mount と揃える（短いページで余白が出ないように）
      position: 'sticky', top: 0, alignSelf: 'flex-start', height: 'calc(100vh - 30px)',
    }}>
      <Item active={page === 'timeline'} onClick={() => setPage('timeline')} label="タイムライン" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>} />
      <Item active={page === 'kanban'} onClick={() => setPage('kanban')} label="カード" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="11" rx="1"/></svg>} />
      <Item active={page === 'report'} onClick={() => setPage('report')} label="レポート" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 16V9M12 16v-5M17 16v-9"/></svg>} />
      <Item active={page === 'done'} onClick={() => setPage('done')} label="完了案件" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>} />
    </div>
  );
}

window.AppV4 = AppV4;
