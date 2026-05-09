// カラーテーマ定義
const THEMES = {
  paper: {
    id: 'paper', name: 'Paper (温かい紙)',
    BG: '#faf8f5', CARD: '#ffffff', TEXT: '#1f1b16', MUTED: '#8a8275',
    BORDER: '#ebe6dc', ACCENT: '#e87a3e', SUBTLE: '#f4f0e8',
    GREET_BG: 'linear-gradient(135deg, #fff8f0, #fef3e8)',
    swatch: ['#faf8f5', '#e87a3e', '#1f1b16'],
  },
  mint: {
    id: 'mint', name: 'Mint (落ち着いた緑)',
    BG: '#f4f8f5', CARD: '#ffffff', TEXT: '#152019', MUTED: '#6b857a',
    BORDER: '#dde9e1', ACCENT: '#3a8f6e', SUBTLE: '#eaf3ee',
    GREET_BG: 'linear-gradient(135deg, #e7f4ec, #daeee0)',
    swatch: ['#f4f8f5', '#3a8f6e', '#152019'],
  },
  lavender: {
    id: 'lavender', name: 'Lavender (淡い藤)',
    BG: '#f6f4fb', CARD: '#ffffff', TEXT: '#1c1728', MUTED: '#7e7594',
    BORDER: '#e3ddee', ACCENT: '#7c5cc2', SUBTLE: '#ede8f6',
    GREET_BG: 'linear-gradient(135deg, #ede6f9, #e1d9f3)',
    swatch: ['#f6f4fb', '#7c5cc2', '#1c1728'],
  },
  ink: {
    id: 'ink', name: 'Ink (夜型ダーク)',
    BG: '#0f1014', CARD: '#181a20', TEXT: '#e8e6ef', MUTED: '#8a8699',
    BORDER: '#262832', ACCENT: '#a78bfa', SUBTLE: '#1e2028',
    GREET_BG: 'linear-gradient(135deg, #1d1a2b, #151726)',
    swatch: ['#0f1014', '#a78bfa', '#e8e6ef'], dark: true,
  },
  sakura: {
    id: 'sakura', name: 'Sakura (桜)',
    BG: '#fbf5f6', CARD: '#ffffff', TEXT: '#26151b', MUTED: '#947682',
    BORDER: '#f0e0e4', ACCENT: '#d9607a', SUBTLE: '#f6e8eb',
    GREET_BG: 'linear-gradient(135deg, #fde8ec, #f7d9df)',
    swatch: ['#fbf5f6', '#d9607a', '#26151b'],
  },
};

window.THEMES = THEMES;
