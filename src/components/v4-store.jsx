// V4 Store - 案件/タイプ/ログ/ポモドーロ設定をstate化してDnDや編集に対応

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// 工程 days[i] は 2026-04-15 を 0 とした日 index
const DATA_START = new Date(2026, 3, 15);
const dayIdxToDate = (idx) => {
  const d = new Date(DATA_START);
  d.setDate(d.getDate() + idx);
  return d;
};
const dateToDayIdx = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const norm = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((norm - DATA_START) / 86400000);
};

const WORK_HOURS_KEY = 'v5.workHours';
const STORE_KEY = 'v5.store';

// projects/types/logs をまとめて localStorage に保存。
// hex (#rrggbb) を HSL の H (0-359) に変換
function hexToHue(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const m = hex.replace('#', '');
  if (m.length !== 6 && m.length !== 3) return null;
  const expand = (h) => h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const x = expand(m);
  const r = parseInt(x.substring(0, 2), 16) / 255;
  const g = parseInt(x.substring(2, 4), 16) / 255;
  const b = parseInt(x.substring(4, 6), 16) / 255;
  if ([r, g, b].some(v => isNaN(v))) return null;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  return (h + 360) % 360;
}

// deadline は Date で保持されるため serialize 時に ISO に、load 時に Date に戻す。
// 案件タイプは旧仕様 type.color (hex) → 新仕様 type.hue (0-359) にマイグレーション
function loadPersistedStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.projects) {
      data.projects.forEach(p => {
        if (p.deadline && typeof p.deadline === 'string') p.deadline = new Date(p.deadline);
        (p.processes || []).forEach(pr => {
          // 旧仕様: pr.deadline (Date|null) → 新仕様: pr.deadlines (Date[])
          if (Array.isArray(pr.deadlines)) {
            pr.deadlines = pr.deadlines
              .map(d => d instanceof Date ? d : (d ? new Date(d) : null))
              .filter(d => d && !isNaN(d.getTime()));
          } else if (pr.deadline) {
            const d = pr.deadline instanceof Date ? pr.deadline : new Date(pr.deadline);
            pr.deadlines = !isNaN(d.getTime()) ? [d] : [];
          } else {
            pr.deadlines = [];
          }
          delete pr.deadline;
        });
      });
    }
    if (data.types) {
      // type.hue が無く color (hex) がある場合は変換して埋める
      Object.values(data.types).forEach(ty => {
        if (ty && (ty.hue == null || isNaN(Number(ty.hue))) && typeof ty.color === 'string') {
          const h = hexToHue(ty.color);
          if (h != null) ty.hue = h;
        }
      });
    }
    // ===== デモシード再生成 =====
    // 'v5.demoSeed' = '1' の間（ユーザー未編集の状態）は、来訪日の today を起点として
    // projects と logs を毎ロード時に作り直す。
    // 1 度でも編集が入ると pushUndo 内で marker をクリアし、以降は通常の永続データとして扱う。
    try {
      if (localStorage.getItem('v5.demoSeed') === '1') {
        if (typeof window.PROJECTS !== 'undefined' || typeof PROJECTS !== 'undefined') {
          const fresh = (window._makeSamplePROJECTS && window._makeSamplePROJECTS())
            || (typeof PROJECTS !== 'undefined' ? PROJECTS : null);
          if (fresh) {
            data.projects = JSON.parse(JSON.stringify(fresh));
            // 上記マイグレーションを fresh にも適用
            data.projects.forEach(p => {
              if (p.deadline && typeof p.deadline === 'string') p.deadline = new Date(p.deadline);
              (p.processes || []).forEach(pr => {
                if (Array.isArray(pr.deadlines)) {
                  pr.deadlines = pr.deadlines
                    .map(d => d instanceof Date ? d : (d ? new Date(d) : null))
                    .filter(d => d && !isNaN(d.getTime()));
                } else {
                  pr.deadlines = [];
                }
              });
            });
          }
        }
        const freshLogs = (window._makeSampleTODAY_LOG && window._makeSampleTODAY_LOG())
          || (typeof TODAY_LOG !== 'undefined' ? TODAY_LOG : null);
        if (freshLogs) data.logs = JSON.parse(JSON.stringify(freshLogs));
      }
    } catch (e) { /* fall through */ }
    return data;
  } catch (e) { return null; }
}
function savePersistedStore(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {}
}
// 他の場所から import 直後に差し替えるための API
window.v5ApplyPersistedStore = function(data) {
  savePersistedStore(data);
  window.dispatchEvent(new Event('v5-store-replace'));
};
window.v5ClearPersistedStore = function() {
  localStorage.removeItem(STORE_KEY);
};

function loadWorkHours() {
  try {
    const v = localStorage.getItem(WORK_HOURS_KEY);
    if (v) {
      const parsed = JSON.parse(v);
      return { weekdayHours: 4, holidayHours: 8, ...parsed };
    }
  } catch (e) {}
  // 副業想定のデフォルト: 平日 4h / 休日 8h
  return { weekdayHours: 4, holidayHours: 8 };
}

function computePlannedHFor(days, workHours, holidaysSet) {
  const weekday = Number(workHours?.weekdayHours) || 0;
  const holiday = Number(workHours?.holidayHours) || 0;
  const hours = (days || []).reduce((sum, idx) => {
    const d = dayIdxToDate(idx);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isCustom = holidaysSet && holidaysSet.has(dayKey(d));
    return sum + ((isWeekend || isCustom) ? holiday : weekday);
  }, 0);
  return Math.round(hours * 10) / 10;
}

function recomputeAutoPlanned(projects, workHours, holidaysSet) {
  return projects.map(p => {
    const procs = p.processes || [];
    let changed = false;
    const nextProcs = procs.map(pr => {
      if (pr.autoPlanned === false) return pr;
      const h = computePlannedHFor(pr.days, workHours, holidaysSet);
      if (Math.abs(h - (pr.plannedH || 0)) < 0.001) return pr;
      changed = true;
      return { ...pr, plannedH: h };
    });
    return changed ? { ...p, processes: nextProcs } : p;
  });
}

// addLog 用の単調増加カウンタ。同 ms 内の連続 addLog でも ID 衝突しないようにする
let _logIdSeq = 0;

// 既存ログ配列の重複 ID を検出・修復する。読み込み時に 1 度実行
function dedupLogIds(logs) {
  if (!Array.isArray(logs) || logs.length === 0) return logs;
  const seen = new Set();
  let changed = false;
  const fixed = logs.map(l => {
    const id = l.id;
    if (id && !seen.has(id)) {
      seen.add(id);
      return l;
    }
    changed = true;
    let newId;
    do {
      newId = 'l' + Date.now() + '_' + (_logIdSeq++).toString(36) + Math.random().toString(36).slice(2, 6);
    } while (seen.has(newId));
    seen.add(newId);
    return { ...l, id: newId };
  });
  return changed ? fixed : logs;
}

function useV4Store() {
  const [workHours, setWorkHoursState] = React.useState(loadWorkHours);
  const [holidays, setHolidaysState] = React.useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('customHolidays') || '[]')); }
    catch (e) { return new Set(); }
  });
  const workHoursRef = React.useRef(workHours);
  workHoursRef.current = workHours;
  const holidaysRef = React.useRef(holidays);
  holidaysRef.current = holidays;

  const persistedRef = React.useRef(loadPersistedStore());
  const [projects, setProjectsRaw] = React.useState(() =>
    recomputeAutoPlanned(clone(persistedRef.current?.projects || PROJECTS), workHoursRef.current, holidaysRef.current)
  );
  // mutations は必ずこの wrapper 経由で: autoPlanned な工程の plannedH を days × workHours から自動再計算
  const setProjects = React.useCallback((updater) => {
    setProjectsRaw(ps => {
      const next = typeof updater === 'function' ? updater(ps) : updater;
      return recomputeAutoPlanned(next, workHoursRef.current, holidaysRef.current);
    });
  }, []);

  const [types, setTypes] = React.useState(() => clone(persistedRef.current?.types || PROJECT_TYPES));
  // 重複 ID ログの修復 (旧 addLog の Date.now() 衝突バグでローカル保存に重複 ID が残っているケースの救済)
  const [logs, setLogs] = React.useState(() => dedupLogIds(clone(persistedRef.current?.logs || TODAY_LOG)));

  // カードビュー用の独立した並び順 (projects 配列の順序とは別管理)
  const KANBAN_ORDER_KEY = 'v5.kanbanOrder';
  const [kanbanOrder, setKanbanOrderState] = React.useState(() => {
    try {
      const raw = localStorage.getItem(KANBAN_ORDER_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {}
    return [];
  });
  // projects の追加/削除に同期: 不足分を末尾に追加、削除済みを除外
  React.useEffect(() => {
    if (projects.length === 0) return;
    const projectIds = new Set(projects.map(p => p.id));
    const orderSet = new Set(kanbanOrder);
    const filtered = kanbanOrder.filter(id => projectIds.has(id));
    const missing = projects.filter(p => !orderSet.has(p.id)).map(p => p.id);
    if (missing.length > 0 || filtered.length !== kanbanOrder.length) {
      const next = [...filtered, ...missing];
      setKanbanOrderState(next);
      try { localStorage.setItem(KANBAN_ORDER_KEY, JSON.stringify(next)); } catch (e) {}
    }
  }, [projects, kanbanOrder]);
  const setKanbanOrder = React.useCallback((updater) => {
    setKanbanOrderState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(KANBAN_ORDER_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  // ダミーモード: 画面共有時に案件名を「案件サンプル1〜」に置換する一時機能（公開時に削除予定）
  const DUMMY_MODE_KEY = 'v5.dummyMode';
  const [dummyMode, setDummyModeState] = React.useState(() => {
    try { return localStorage.getItem(DUMMY_MODE_KEY) === '1'; } catch (e) { return false; }
  });
  const setDummyMode = React.useCallback((v) => {
    const next = !!v;
    setDummyModeState(next);
    try { localStorage.setItem(DUMMY_MODE_KEY, next ? '1' : '0'); } catch (e) {}
  }, []);
  const displayName = React.useCallback((project) => {
    if (!project) return '';
    if (!dummyMode) return project.name;
    const idx = projects.findIndex(p => p.id === project.id);
    return idx >= 0 ? `案件サンプル${idx + 1}` : project.name;
  }, [dummyMode, projects]);

  // projects/types/logs の変更を localStorage に永続化
  React.useEffect(() => {
    // 初回 (永続化データが存在しなかった場合) はデモシードマーカーを設定。
    // これ以降のロードでは loadPersistedStore がマーカーを見て projects/logs を再生成する。
    if (!persistedRef.current && !localStorage.getItem('v5.demoSeed')) {
      try { localStorage.setItem('v5.demoSeed', '1'); } catch (e) {}
    }
    savePersistedStore({ projects, types, logs });
  }, [projects, types, logs]);

  // インポート / リセット時の強制リロード (window.location.reload で OK だが、
  // state を再初期化するだけなら v5-store-replace を listen して再マウント)
  React.useEffect(() => {
    const h = () => { window.location.reload(); };
    window.addEventListener('v5-store-replace', h);
    return () => window.removeEventListener('v5-store-replace', h);
  }, []);

  // ===== Undo/Redo (projects のみ対象) =====
  // ドラッグ等の連続操作は 800ms 以内で 1 スナップショットに合体させる
  const projectsRef = React.useRef(projects);
  projectsRef.current = projects;
  const undoRef = React.useRef({ stack: [], redo: [], lastPushAt: 0, lastAction: null });
  const [, bumpUndo] = React.useReducer(x => x + 1, 0);
  const UNDO_LIMIT = 50;
  const COALESCE_MS = 800;
  const DRAG_ACTIONS = new Set(['moveProcess', 'resizeProcess']);

  const pushUndo = (action) => {
    const u = undoRef.current;
    const now = Date.now();
    // 一度でもユーザー編集が入ったらデモシードマーカーをクリアし、
    // 以降は再生成せず通常の永続データとして扱う。
    try { localStorage.removeItem('v5.demoSeed'); } catch (e) {}
    if (DRAG_ACTIONS.has(action) && DRAG_ACTIONS.has(u.lastAction) && now - u.lastPushAt < COALESCE_MS) {
      u.lastPushAt = now;
      return;
    }
    u.stack.push(clone(projectsRef.current));
    if (u.stack.length > UNDO_LIMIT) u.stack.shift();
    u.redo = [];
    u.lastPushAt = now;
    u.lastAction = action;
    bumpUndo();
  };

  const undo = () => {
    const u = undoRef.current;
    if (u.stack.length === 0) return;
    const snap = u.stack.pop();
    u.redo.push(clone(projectsRef.current));
    u.lastAction = '__undo';
    setProjects(snap);
    bumpUndo();
  };
  const redo = () => {
    const u = undoRef.current;
    if (u.redo.length === 0) return;
    const snap = u.redo.pop();
    u.stack.push(clone(projectsRef.current));
    if (u.stack.length > UNDO_LIMIT) u.stack.shift();
    u.lastAction = '__redo';
    setProjects(snap);
    bumpUndo();
  };
  const [pomoSettings, setPomoSettings] = React.useState(() => {
    const saved = localStorage.getItem('pomoSettings');
    if (saved) try { return JSON.parse(saved); } catch(e) {}
    return { workMin: 25, breakMin: 5, longBreakMin: 15, sets: 4, autoLog: true };
  });

  React.useEffect(() => {
    localStorage.setItem('pomoSettings', JSON.stringify(pomoSettings));
  }, [pomoSettings]);

  React.useEffect(() => {
    localStorage.setItem(WORK_HOURS_KEY, JSON.stringify(workHours));
    // 設定変更時に自動工程の plannedH を再計算
    setProjectsRaw(ps => recomputeAutoPlanned(ps, workHours, holidaysRef.current));
  }, [workHours]);

  const setWorkHours = (patch) => {
    setWorkHoursState(cur => ({ ...cur, ...patch }));
  };

  const toggleHoliday = (d) => {
    const k = dayKey(d);
    setHolidaysState(hs => {
      const next = new Set(hs);
      if (next.has(k)) next.delete(k); else next.add(k);
      localStorage.setItem('customHolidays', JSON.stringify([...next]));
      // 休日追加/解除で自動工程 plannedH を再計算
      setProjectsRaw(ps => recomputeAutoPlanned(ps, workHoursRef.current, next));
      return next;
    });
  };
  const isHoliday = (d) => holidays.has(dayKey(d));

  // 工程ブロックの日付シフト
  const moveProcess = (projectId, procId, deltaDays) => {
    pushUndo('moveProcess');
    setProjects(ps => ps.map(p => p.id !== projectId ? p : ({
      ...p, processes: p.processes.map(pr => pr.id !== procId ? pr : ({
        ...pr, days: pr.days.map(d => d + deltaDays),
      })),
    })));
  };

  // 工程の期間リサイズ（左または右端）
  const resizeProcess = (projectId, procId, side, deltaDays) => {
    pushUndo('resizeProcess');
    setProjects(ps => ps.map(p => p.id !== projectId ? p : ({
      ...p, processes: p.processes.map(pr => {
        if (pr.id !== procId) return pr;
        let days = [...pr.days];
        if (side === 'left') {
          const s = days[0] + deltaDays;
          days = days.filter(d => d >= s);
          while (days[0] > s) days.unshift(days[0] - 1);
        } else {
          const e = days[days.length - 1] + deltaDays;
          days = days.filter(d => d <= e);
          while (days[days.length - 1] < e) days.push(days[days.length - 1] + 1);
        }
        if (days.length === 0) days = [pr.days[0]];
        return { ...pr, days };
      }),
    })));
  };

  // 案件タイプ保存
  const saveType = (typeId, patch) => {
    setTypes(t => ({ ...t, [typeId]: { ...t[typeId], ...patch } }));
  };
  const addType = (typeId, data) => {
    setTypes(t => ({ ...t, [typeId]: data }));
  };
  const deleteType = (typeId) => {
    setTypes(t => { const nt = { ...t }; delete nt[typeId]; return nt; });
  };

  // ログ追加（集中モードから）
  // ID は Date.now() + カウンタ + 乱数 で必ず一意に。
  // 旧実装は 'l' + Date.now() のみで、同 ms 内に複数 addLog を呼ぶと衝突し
  // updateLog が複数ログを書き換える致命バグになっていた
  const addLog = (log) => {
    const id = 'l' + Date.now() + '_' + (_logIdSeq++).toString(36) + Math.random().toString(36).slice(2, 6);
    setLogs(ls => [...ls, { id, ...log }]);
  };
  const updateLog = (id, patch) => {
    setLogs(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  };
  const deleteLog = (id) => {
    setLogs(ls => ls.filter(l => l.id !== id));
  };

  // 工程の完了フラグを切り替え（カードの工程アイコンクリック等から）。Undo 対象
  const setProcessCompleted = (projectId, procId, completed) => {
    pushUndo('setProcessCompleted');
    setProjects(ps => ps.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        processes: p.processes.map(pr => pr.id !== procId ? pr : { ...pr, completed: !!completed }),
      };
    }));
  };

  // 工程の実績時間にポモドーロ等の作業時間を加算（同じ案件・同じ工程タイプ全件に対して）
  // 0.1h 単位で四捨五入して累積。Undo 対象外（一回ごとに大量に積まれるため）
  const addToProcessActual = (projectId, procType, hours) => {
    if (!projectId || !procType || !hours) return;
    setProjects(ps => ps.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        processes: p.processes.map(pr => {
          if (pr.type !== procType) return pr;
          const merged = Math.round(((pr.actualH || 0) + hours) * 10) / 10;
          return { ...pr, actualH: merged };
        }),
      };
    }));
  };

  // 案件並べ替え（fromIdx/toIdx が文字列なら project.id として扱う）
  // フィルタ済みリストから呼ばれる場合に index 不整合になるため、ID 受け取りを推奨
  const reorderProject = (fromOrFromId, toOrToId) => {
    pushUndo('reorderProject');
    setProjects(ps => {
      let fromIdx, toIdx;
      if (typeof fromOrFromId === 'string') {
        fromIdx = ps.findIndex(p => p.id === fromOrFromId);
        toIdx = ps.findIndex(p => p.id === toOrToId);
      } else {
        fromIdx = fromOrFromId;
        toIdx = toOrToId;
      }
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return ps;
      const next = [...ps];
      const [m] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, m);
      return next;
    });
  };
  // 工程並べ替え
  const reorderProc = (projectId, fromIdx, toIdx) => {
    pushUndo('reorderProc');
    setProjects(ps => ps.map(p => {
      if (p.id !== projectId) return p;
      const procs = [...p.processes];
      const [m] = procs.splice(fromIdx, 1);
      procs.splice(toIdx, 0, m);
      return { ...p, processes: procs };
    }));
  };
  // 工程追加
  const addProc = (projectId, type) => {
    pushUndo('addProc');
    setProjects(ps => ps.map(p => {
      if (p.id !== projectId) return p;
      // 既存工程の最終日+1から5日間
      const allDays = p.processes.flatMap(pr => pr.days);
      const start = allDays.length > 0 ? Math.max(...allDays) + 1 : 0;
      const newPr = {
        id: 'pr' + Date.now(),
        type,
        plannedH: 10,
        actualH: 0,
        days: [start, start+1, start+2, start+3, start+4],
      };
      return { ...p, processes: [...p.processes, newPr] };
    }));
  };
  // 工程削除
  const deleteProc = (projectId, procId) => {
    pushUndo('deleteProc');
    setProjects(ps => ps.map(p => p.id !== projectId ? p : ({
      ...p, processes: p.processes.filter(pr => pr.id !== procId),
    })));
  };

  // 案件追加 / 更新 / 削除 / カンバンステータス
  const addProject = (project) => {
    pushUndo('addProject');
    const id = project.id || ('p' + Date.now());
    const newProj = { id, status: 'active', processes: [], ...project };
    setProjects(ps => [...ps, newProj]);
    return id;
  };
  // updateProject は Undo 対象外（案件名編集・チェックリストトグル等、モーダルフロー想定）
  const updateProject = (projectId, patch) => {
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, ...patch } : p));
  };
  const deleteProject = (projectId) => {
    pushUndo('deleteProject');
    setProjects(ps => ps.filter(p => p.id !== projectId));
  };
  const setBoardStatus = (projectId, status) => {
    pushUndo('setBoardStatus');
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, boardStatus: status } : p));
  };
  const setArchived = (projectId, archived) => {
    pushUndo('setArchived');
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, archived: !!archived } : p));
  };

  const computePlannedH = (days) =>
    computePlannedHFor(days, workHoursRef.current, holidaysRef.current);

  return {
    projects, setProjects, moveProcess, resizeProcess,
    reorderProject, reorderProc, addProc, deleteProc,
    addProject, updateProject, deleteProject, setBoardStatus, setArchived,
    types, saveType, addType, deleteType,
    logs, addLog, updateLog, deleteLog, addToProcessActual, setProcessCompleted,
    kanbanOrder, setKanbanOrder,
    dummyMode, setDummyMode, displayName,
    pomoSettings, setPomoSettings,
    holidays, toggleHoliday, isHoliday,
    workHours, setWorkHours, computePlannedH,
    undo, redo, pushUndo,
    canUndo: undoRef.current.stack.length > 0,
    canRedo: undoRef.current.redo.length > 0,
  };
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

window.useV4Store = useV4Store;
window.dayKey = dayKey;
window.dayIdxToDate = dayIdxToDate;
window.dateToDayIdx = dateToDayIdx;
window.computePlannedHFor = computePlannedHFor;
