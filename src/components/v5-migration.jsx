// 旧 scheduler-electron の JSON を v5 形式に変換する
// 入力判定: projects[].tasks が存在 → 旧形式 / projects[].processes が存在 → v5 形式

(function() {
  const NAME_TO_KEY = {
    '構図ラフ': 'kozu',
    'カラーラフ': 'color',
    '線画・基礎塗り': 'line',
    '線画': 'line',
    '清書': 'seisho',
    '背景': 'bg',
    '仕上げ': 'shiage',
    '人物': 'jinbutsu',
    'デザイン': 'design',
    'パーツ分け': 'pers',
  };

  // v5 の DATA_START と揃える (2026-04-15 = day index 0)
  const DATA_START = new Date(2026, 3, 15);
  const isoToDayIdx = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return Math.round((date - DATA_START) / 86400000);
  };

  // plannedH 推定: 日数 × PLANNED_PER_DAY (デフォルト 4h)
  const PLANNED_PER_DAY = 4;

  // tasks の組み合わせから典型的な typeId を推定
  function inferTypeId(procKeys) {
    const has = (k) => procKeys.includes(k);
    if (has('design') && has('pers')) return 'live2d';
    if (has('jinbutsu')) return 'multichar';
    if (has('design') && !has('line')) return 'character';
    return 'oneillust';
  }

  // note 文字列から締切を抽出 ("5/末まで" "7月中旬" "4/20まで" 等)
  // 戻り値: { date: Date, text: string, fuzzy: boolean } | null
  //   fuzzy=true は "7月中旬" のような日付精度のない表現 (text を保存して表示に使う)
  function extractDeadlineFromNote(note, year) {
    if (!note) return null;
    // M/D 形式 (精度あり)
    const md = note.match(/(\d{1,2})\/(\d{1,2})/);
    if (md) {
      const text = md[0];
      return { date: new Date(year, parseInt(md[1], 10) - 1, parseInt(md[2], 10)), text, fuzzy: false };
    }
    // M月末・上旬・中旬・下旬 (曖昧)
    const mR = note.match(/(\d{1,2})月(末|上旬|中旬|下旬)/);
    if (mR) {
      const month = parseInt(mR[1], 10);
      const r = mR[2];
      const day = r === '末' ? 28 : r === '下旬' ? 25 : r === '中旬' ? 15 : 5;
      return { date: new Date(year, month - 1, day), text: mR[0], fuzzy: true };
    }
    // M/末 (曖昧)
    const mEnd = note.match(/(\d{1,2})\/末/);
    if (mEnd) {
      return { date: new Date(year, parseInt(mEnd[1], 10), 0), text: mEnd[0], fuzzy: true };
    }
    return null;
  }

  function migrateOldSchedulerJson(old) {
    if (!old || !Array.isArray(old.projects)) {
      throw new Error('旧形式 JSON として認識できません (projects 配列が見つかりません)');
    }

    // カスタム工程蓄積用
    const customProcesses = {};
    let customHueIdx = 0;
    const HUES = [50, 30, 350, 220, 150, 280, 10, 260, 190, 100, 330, 60, 200, 320, 170, 240];
    const nameToCustomKey = {};

    const getProcessKey = (name) => {
      const n = (name || '').trim();
      if (NAME_TO_KEY[n]) return NAME_TO_KEY[n];
      if (nameToCustomKey[n]) return nameToCustomKey[n];
      // カスタム工程として登録
      const slug = 'imported_' + Date.now() + '_' + customHueIdx;
      const hue = HUES[customHueIdx % HUES.length];
      customHueIdx++;
      const def = { name: n || '未分類', hue, label: slug };
      customProcesses[slug] = def;
      nameToCustomKey[n] = slug;
      return slug;
    };

    // cells を taskId ごとの日付配列にグループ化
    const cellsByTask = {};
    // cells からの締切(annotationId が deadline/納期系) を projectId 別に収集するためのタスクID→最新締切マップ
    const deadlineByTask = {};
    const cells = old.cells || {};
    Object.entries(cells).forEach(([key, cell]) => {
      // key = `${taskId}__${YYYY-MM-DD}` (taskId が id_xxx_xxx 形式で __ を含む可能性があるので最後の __ で分割)
      const sep = key.lastIndexOf('__');
      if (sep < 0) return;
      const taskId = key.slice(0, sep);
      const date = key.slice(sep + 2);
      if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) return;
      if (!cellsByTask[taskId]) cellsByTask[taskId] = [];
      cellsByTask[taskId].push(date);
      // annotationId: 'deadline' か 納期ラベル (id_xxx_納期) → 締切として扱う
      const isDeadline =
        cell.annotationId === 'deadline' ||
        cell.annotationSymbol === '★' ||
        /納期/.test(cell.annotationLabel || '') ||
        /納期/.test(cell.annotationText || '');
      if (isDeadline) {
        const d = new Date(date);
        if (!deadlineByTask[taskId] || d > deadlineByTask[taskId]) {
          deadlineByTask[taskId] = d;
        }
      }
    });

    // workTimeEntries を taskId ごとに時間合算 (actualH 用) および日別ログ (logs 用) に分解
    const hoursByTask = {};
    const logs = []; // v5 形式の日別作業ログ
    const workTimeEntries = old.workTimeEntries || {};
    // 日付順でソートして createdAt を安定化
    const sortedDates = Object.keys(workTimeEntries).sort();
    // 日付 → taskId → projectId の逆引き
    const taskToProject = {};
    (old.projects || []).forEach(op => {
      (op.tasks || []).forEach(t => { taskToProject[t.id] = op.id; });
    });
    // 旧 tasks[].name を v5 の工程キーに変換する関数を呼ぶ前に一度走査するため task→name 対応も構築
    const taskToName = {};
    (old.projects || []).forEach(op => {
      (op.tasks || []).forEach(t => { taskToName[t.id] = t.name; });
    });
    sortedDates.forEach(dateStr => {
      (workTimeEntries[dateStr] || []).forEach(e => {
        if (!e.taskId) return;
        const h = Number(e.hours) || 0;
        hoursByTask[e.taskId] = (hoursByTask[e.taskId] || 0) + h;
        if (h > 0) {
          // 日付キーを v5 の YYYY-MM-DD 形式に正規化
          const [y, m, d] = dateStr.split('-').map(Number);
          const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const projId = taskToProject[e.taskId];
          const taskName = taskToName[e.taskId];
          if (projId && taskName) {
            logs.push({
              id: e.id || ('l_imp_' + Date.now() + '_' + logs.length),
              projectId: projId,
              type: getProcessKey(taskName),
              hours: h,
              date: iso,
              createdAt: new Date(y, m - 1, d, 12, 0, 0).getTime(),
            });
          }
        }
      });
    });

    // projects 変換
    const projects = old.projects.map((op, pIdx) => {
      const tasks = op.tasks || [];
      const processes = tasks.map((t, tIdx) => {
        const key = getProcessKey(t.name);
        const dates = cellsByTask[t.id] || [];
        const days = dates.map(isoToDayIdx).filter(i => Number.isFinite(i));
        days.sort((a, b) => a - b);
        const daysCount = days.length;
        const plannedH = daysCount > 0 ? Math.max(daysCount * PLANNED_PER_DAY, 1) : 4;
        const actualH = Math.round((hoursByTask[t.id] || 0) * 10) / 10;
        return {
          id: 'pr_' + op.id + '_' + tIdx,
          type: key,
          plannedH,
          actualH,
          days: days.length ? days : [pIdx * 2],
          autoPlanned: false, // インポート値は明示指定として扱う (作業時間再計算の対象外)
        };
      });

      const typeId = inferTypeId(processes.map(pr => pr.type));

      // 締切: タスクの締切マーカー最新 > note からの抽出
      // 曖昧表現 ("7月中旬" 等) は deadline=null / client=原文 にして v5 の表示フォールバックで text が出るようにする
      let deadline = null;
      let deadlineFreeText = '';
      tasks.forEach(t => {
        const d = deadlineByTask[t.id];
        if (d && (!deadline || d > deadline)) deadline = d;
      });
      if (!deadline) {
        const parsed = extractDeadlineFromNote(op.note, 2026);
        if (parsed) {
          if (parsed.fuzzy) {
            deadlineFreeText = parsed.text;
          } else {
            deadline = parsed.date;
          }
        }
      }

      // boardStatus は完了案件のみ 'done' をセット。
      // 非完了案件は未指定 → v5 の computedBoardStatus(p) で todo/progress/review/done を自動判定
      const projObj = {
        id: op.id,
        name: op.name || '(名称未設定)',
        client: deadlineFreeText, // v5 では締切フリーテキスト欄として表示される
        typeId,
        deadline,
        status: 'active',
        note: op.note || '',
        processes,
        checklist: [],
      };
      if (op.done) projObj.boardStatus = 'done';
      return projObj;
    });

    // 休日 (ISO 文字列 → 同フォーマット維持、v5 の customHolidays も同形式)
    const customHolidays = (old.customHolidays || []).filter(s => /^\d{4}-\d{1,2}-\d{1,2}$/.test(s));

    // todos / routines
    const todos = (old.todos || []).map(t => ({
      id: t.id,
      text: t.text || '',
      done: !!t.done,
    }));
    const routines = (old.routines || []).map(r => ({
      id: r.id,
      text: r.text || '',
      done: !!r.done,
    }));

    return {
      projects,
      logs,
      customProcesses,
      customHolidays,
      todos,
      routines,
      stats: {
        projectCount: projects.length,
        logCount: logs.length,
        customProcessCount: Object.keys(customProcesses).length,
        holidayCount: customHolidays.length,
        todoCount: todos.length,
        routineCount: routines.length,
      },
    };
  }

  // 変換結果を localStorage に書き込み
  function applyMigratedData(migrated) {
    if (migrated.projects) {
      // 既存 projects を置き換え
      localStorage.setItem('v5.store', JSON.stringify({
        projects: migrated.projects,
        types: null, // null なら PROJECT_TYPES デフォルトを使わせる
        logs: migrated.logs || [],
      }));
    }
    if (migrated.customProcesses && Object.keys(migrated.customProcesses).length) {
      const existing = JSON.parse(localStorage.getItem('v5.customProcesses') || '{}');
      const merged = { ...existing, ...migrated.customProcesses };
      localStorage.setItem('v5.customProcesses', JSON.stringify(merged));
    }
    if (migrated.customHolidays) {
      localStorage.setItem('customHolidays', JSON.stringify(migrated.customHolidays));
    }
    if (migrated.todos || migrated.routines) {
      const current = JSON.parse(localStorage.getItem('todoLists') || '{"todos":[],"routines":[]}');
      localStorage.setItem('todoLists', JSON.stringify({
        todos: migrated.todos || current.todos,
        routines: migrated.routines || current.routines,
      }));
    }
  }

  // フル状態 export (v5 形式)
  function exportV5Data() {
    const keys = [
      'v5.store',
      'v5.workHours',
      'v5.colorSettings',
      'v5.customProcesses',
      'v5.checklistTemplate',
      'v5.userThemes',
      'v5.cardSize',
      'v5.cardChecklistExpandAll',
      'v5.summaryFilter',
      'customHolidays',
      'pomoSettings',
      'v5.pomoPresets',
      'v5.pomoPresetId',
      'v5.kanbanOrder',
      'v5.greetingIcon',
      'v5.greetingIconBg',
      'appTitle',
      'appSettings',
      'todoLists',
      'cellMemos',
      'subLabels',
    ];
    const data = { __version: 'v5', __exportedAt: new Date().toISOString() };
    keys.forEach(k => {
      const v = localStorage.getItem(k);
      if (v !== null) {
        try { data[k] = JSON.parse(v); }
        catch (e) { data[k] = v; }
      }
    });
    return data;
  }

  // v5 形式 JSON を localStorage に書き戻す
  function applyV5Data(data) {
    Object.keys(data).forEach(k => {
      if (k.startsWith('__')) return;
      const v = data[k];
      if (v === null || v === undefined) return;
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    });
  }

  // 入力判定 + 分岐
  function importAnyFormat(json) {
    if (json && json.__version === 'v5') {
      applyV5Data(json);
      return { mode: 'v5', stats: null };
    }
    if (json && Array.isArray(json.projects) && json.projects.some(p => Array.isArray(p.tasks))) {
      const migrated = migrateOldSchedulerJson(json);
      applyMigratedData(migrated);
      return { mode: 'old', stats: migrated.stats };
    }
    throw new Error('未対応の JSON 形式です');
  }

  window.v5Migration = {
    migrateOldSchedulerJson,
    applyMigratedData,
    exportV5Data,
    applyV5Data,
    importAnyFormat,
  };
})();
