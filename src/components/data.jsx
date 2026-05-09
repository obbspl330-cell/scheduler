// 共通ダミーデータ - イラストレーター/デザイナー個人の案件管理

const TODAY = (function() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const daysBetween = (a, b) => Math.round((b - a) / 86400000);

// 工程カラー（用途別）
const PROCESS_COLORS = {
  kozu:   { name: '構図ラフ',    hue: 50,  label: 'rough' },
  color:  { name: 'カラーラフ',  hue: 30,  label: 'color' },
  line:   { name: '線画・基礎塗り', hue: 350, label: 'line' },
  seisho: { name: '清書',        hue: 220, label: 'finish' },
  bg:     { name: '背景',        hue: 150, label: 'bg' },
  shiage: { name: '仕上げ',      hue: 280, label: 'final' },
  jinbutsu: { name: '人物',      hue: 10,  label: 'character' },
  design: { name: 'デザイン',    hue: 260, label: 'design' },
  pers:   { name: 'パーツ分け',  hue: 190, label: 'pers' },
};

// 案件タイプ（テンプレート）
// hue は HSL の H (0-359)。彩度・明度はグローバル設定 (v5.colorSettings) で一括制御。
// color は描画時に typeColor() が hue + globalSat/Light から導出して上書きするため、ここの hex は表示には使われない（互換のため残置）。
const PROJECT_TYPES = {
  oneillust: {
    id: 'oneillust', name: '背景付き一枚絵', hue: 22,  color: '#e87a3e',
    typicalProcesses: ['kozu', 'color', 'line', 'seisho', 'bg', 'shiage'],
  },
  multichar: {
    id: 'multichar', name: '集合イラスト', hue: 292, color: '#d946ef',
    typicalProcesses: ['kozu', 'color', 'line', 'jinbutsu', 'seisho', 'bg'],
  },
  live2d: {
    id: 'live2d', name: 'Live2Dモデル', hue: 189, color: '#06b6d4',
    typicalProcesses: ['design', 'color', 'pers', 'seisho'],
  },
  character: {
    id: 'character', name: 'キャラクターデザイン', hue: 256, color: '#8b5cf6',
    typicalProcesses: ['kozu', 'design', 'color', 'seisho'],
  },
};

// 案件タイプ別・工程平均作業時間 (h) - 過去の案件から算出
const TYPE_PROCESS_AVG = {
  oneillust: { kozu: 4.2, color: 6.8, line: 12.5, seisho: 9.2, bg: 7.5, shiage: 3.0 },
  multichar: { kozu: 6.0, color: 8.5, line: 18.0, jinbutsu: 14.0, seisho: 11.0, bg: 9.5 },
  live2d:    { design: 8.0, color: 10.0, pers: 15.0, seisho: 22.0 },
  character: { kozu: 3.5, design: 5.5, color: 7.0, seisho: 8.0 },
};

// 案件サンプル: 「来訪日の今日」を起点に day 0 を計算し、相対オフセットで days/deadline を組み立てる。
// 来月や来年に訪問されてもダッシュボードと色付けが噛み合うよう、毎ロード時に動的生成する。
// pr.days は dataStart (2026-04-15) を 0 とする絶対 index 形式で保存（UI ロジックの変更を最小化）。
function _makeSamplePROJECTS() {
  const dataStart = new Date(2026, 3, 15);
  const today = (function () { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const todayIdx = Math.round((today - dataStart) / 86400000);
  const off = (n) => todayIdx + n;
  const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
  const fmtMD = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  const dl1 = addDays(today, 19);   // 約3週間後
  const dl2 = addDays(today, 31);   // 約1ヶ月後
  const dl3 = addDays(today, 46);
  const dl4 = addDays(today, 54);
  const dl5 = addDays(today, 66);
  const dl6 = addDays(today, 75);
  return [
    {
      id: 'p1',
      name: '案件サンプル1',
      client: fmtMD(dl1) + ' まで',
      typeId: 'oneillust',
      deadline: dl1,
      status: 'active',
      note: fmtMD(dl1) + ' 納品予定',
      accent: 'amber',
      processes: [
        // 過去: 数日前に開始済み (kozu = 完了相当)
        { id: 'pr1', type: 'kozu',   plannedH: 8,  actualH: 8.0, days: [off(-3), off(-2)] },
        // 今日進行中 (color = actualH 4h 入力済み)
        { id: 'pr2', type: 'color',  plannedH: 12, actualH: 4.0, days: [off(0), off(1), off(2)] },
        // 今後の予定
        { id: 'pr3', type: 'line',   plannedH: 16, actualH: 0,   days: [off(4), off(5), off(6), off(7)] },
        { id: 'pr4', type: 'seisho', plannedH: 12, actualH: 0,   days: [off(9), off(10), off(11)] },
        { id: 'pr5', type: 'bg',     plannedH: 8,  actualH: 0,   days: [off(13), off(14)] },
        { id: 'pr6', type: 'shiage', plannedH: 8,  actualH: 0,   days: [off(16), off(17)] },
      ],
      checklist: [
        { id: 'c1a', text: '着手連絡', done: true },
        { id: 'c1b', text: 'ラフ確認の返信待ち', done: true },
        { id: 'c1c', text: '請求書送付', done: false },
        { id: 'c1d', text: '入金確認', done: false },
        { id: 'c1e', text: '記帳', done: false },
      ],
    },
    {
      id: 'p2',
      name: '案件サンプル2',
      client: fmtMD(dl2) + ' まで',
      typeId: 'live2d',
      deadline: dl2,
      status: 'active',
      accent: 'rose',
      processes: [
        { id: 'pr7',  type: 'design', plannedH: 8,  actualH: 8.0, days: [off(-1)] },
        { id: 'pr8',  type: 'color',  plannedH: 8,  actualH: 0,   days: [off(2), off(3)] },
        { id: 'pr9',  type: 'pers',   plannedH: 12, actualH: 0,   days: [off(6), off(7), off(8)] },
        { id: 'pr10', type: 'seisho', plannedH: 16, actualH: 0,   days: [off(11), off(12), off(13), off(14)] },
      ],
    },
    {
      id: 'p3',
      name: '案件サンプル3',
      client: fmtMD(dl3) + ' まで',
      typeId: 'multichar',
      deadline: dl3,
      status: 'active',
      accent: 'sky',
      processes: [
        { id: 'pr11', type: 'kozu',     plannedH: 0, actualH: 0, days: [] },
        { id: 'pr12', type: 'color',    plannedH: 0, actualH: 0, days: [] },
        { id: 'pr13', type: 'line',     plannedH: 0, actualH: 0, days: [] },
        { id: 'pr14', type: 'jinbutsu', plannedH: 0, actualH: 0, days: [] },
        { id: 'pr15', type: 'seisho',   plannedH: 0, actualH: 0, days: [] },
        { id: 'pr16', type: 'bg',       plannedH: 0, actualH: 0, days: [] },
      ],
      checklist: [
        { id: 'c3a', text: '着手連絡', done: false },
        { id: 'c3b', text: '見積書送付', done: false },
        { id: 'c3c', text: '請求書送付', done: false },
      ],
    },
    {
      id: 'p4',
      name: '案件サンプル4',
      client: fmtMD(dl4) + ' まで',
      typeId: 'character',
      deadline: dl4,
      status: 'active',
      accent: 'violet',
      processes: [
        { id: 'pr17', type: 'kozu',   plannedH: 0, actualH: 0, days: [] },
        { id: 'pr18', type: 'design', plannedH: 0, actualH: 0, days: [] },
        { id: 'pr19', type: 'color',  plannedH: 0, actualH: 0, days: [] },
        { id: 'pr20', type: 'seisho', plannedH: 0, actualH: 0, days: [] },
      ],
    },
    {
      id: 'p5',
      name: '案件サンプル5',
      client: fmtMD(dl5) + ' まで',
      typeId: 'oneillust',
      deadline: dl5,
      status: 'active',
      accent: 'emerald',
      processes: [
        { id: 'pr21', type: 'kozu',   plannedH: 0, actualH: 0, days: [] },
        { id: 'pr22', type: 'color',  plannedH: 0, actualH: 0, days: [] },
        { id: 'pr23', type: 'line',   plannedH: 0, actualH: 0, days: [] },
        { id: 'pr24', type: 'seisho', plannedH: 0, actualH: 0, days: [] },
        { id: 'pr25', type: 'bg',     plannedH: 0, actualH: 0, days: [] },
        { id: 'pr26', type: 'shiage', plannedH: 0, actualH: 0, days: [] },
      ],
    },
    {
      id: 'p6',
      name: '案件サンプル6',
      client: fmtMD(dl6) + ' まで',
      typeId: 'oneillust',
      deadline: dl6,
      status: 'active',
      accent: 'fuchsia',
      processes: [
        { id: 'pr27', type: 'kozu',   plannedH: 0, actualH: 0, days: [] },
        { id: 'pr28', type: 'color',  plannedH: 0, actualH: 0, days: [] },
      ],
    },
  ];
}
const PROJECTS = _makeSamplePROJECTS();
window._makeSamplePROJECTS = _makeSamplePROJECTS;

const TODOS = [
  { id: 't1', text: '請求書を送付', done: false },
  { id: 't2', text: '素材データの整理', done: false },
  { id: 't3', text: 'メール返信', done: true },
  { id: 't4', text: '打ち合わせ資料の準備', done: false },
];

const ROUTINES = [
  { id: 'r1', text: 'メールチェック', done: true },
  { id: 'r2', text: '作業ログを記入', done: false },
  { id: 'r3', text: '明日のタスクを確認', done: false },
];

// 今日の作業記録 (デモ用): pr1 (color) は今日進行中、4h 入力済み。
// date は起動時の today を YYYY-MM-DD で動的に埋め、デモを「今日の記録あり」で立ち上げる。
function _makeSampleTODAY_LOG() {
  const d = (function () { const x = new Date(); x.setHours(0, 0, 0, 0); return x; })();
  const pad = (n) => String(n).padStart(2, '0');
  const todayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return [
    { id: 'l1', projectId: 'p1', type: 'color', hours: 4.0, date: todayKey, createdAt: d.getTime() },
  ];
}
const TODAY_LOG = _makeSampleTODAY_LOG();
window._makeSampleTODAY_LOG = _makeSampleTODAY_LOG;

// 累計（直近サマリー用）
const SUMMARY = [
  { projectId: 'p1', hours: 21.0 },
  { projectId: 'p2', hours: 1.5 },
  { projectId: 'p3', hours: 3.0 },
  { projectId: 'p4', hours: 4.5 },
];

// 共通の色 hsl ヘルパ
function processColor(typeKey, mode = 'fill', theme = 'light') {
  const p = PROCESS_COLORS[typeKey];
  if (!p) return '#ccc';
  const { hue } = p;
  if (theme === 'dark') {
    if (mode === 'fill')   return `hsl(${hue} 55% 55% / 0.28)`;
    if (mode === 'border') return `hsl(${hue} 60% 65%)`;
    if (mode === 'solid')  return `hsl(${hue} 60% 62%)`;
    if (mode === 'soft')   return `hsl(${hue} 40% 30%)`;
  }
  if (mode === 'fill')   return `hsl(${hue} 70% 88%)`;
  if (mode === 'border') return `hsl(${hue} 50% 60%)`;
  if (mode === 'solid')  return `hsl(${hue} 60% 55%)`;
  if (mode === 'soft')   return `hsl(${hue} 80% 96%)`;
  return `hsl(${hue} 50% 50%)`;
}

function projectStats(p) {
  const totalP = p.processes.reduce((s, x) => s + x.plannedH, 0);
  const totalA = p.processes.reduce((s, x) => s + x.actualH, 0);
  // 完了は手動トグル（pr.completed）。時間超過と切り離して「短縮目標」を阻害しないようにする
  const done = p.processes.filter(x => !!x.completed).length;
  // 進捗 = 経過作業日カバレッジ（今日までに到達した予定セル / 全予定セル）
  const todayIdx = (window.dateToDayIdx && window.dateToDayIdx(TODAY)) ?? 0;
  const allDays = p.processes.flatMap(x => x.days || []);
  const totalDays = allDays.length;
  const coveredDays = allDays.filter(d => d <= todayIdx).length;
  const pct = totalDays > 0 ? Math.min(100, Math.round((coveredDays / totalDays) * 100)) : 0;
  const daysLeft = Math.round((p.deadline - TODAY) / 86400000);
  // 時間予算: 正なら予定残（節約傾向）、負ならオーバー
  const timeBudget = Math.round((totalP - totalA) * 10) / 10;
  return {
    totalPlanned: totalP, totalActual: totalA,
    processDone: done, processTotal: p.processes.length,
    pct, daysLeft, timeBudget,
  };
}

// 日ごとの予定作業 - project.processes.days から展開し各日のラベルを決める
// day_index (startDateからの相対) -> { projectId, type, label }
function dayWorkLabel(pr) {
  const info = PROCESS_COLORS[pr.type];
  // 工程の進行ポジションに応じてサブラベル
  const n = pr.days.length;
  if (n === 1) return info.name;
  return info.name;
}

Object.assign(window, {
  TODAY, fmt, addDays, daysBetween,
  PROCESS_COLORS, PROJECT_TYPES, TYPE_PROCESS_AVG,
  PROJECTS, TODOS, ROUTINES, TODAY_LOG, SUMMARY,
  processColor, projectStats, dayWorkLabel,
});
