// Theme state — dark (underground) / light (surface) with pub/sub

const themes = {
  dark: {
    parchment: '#18140e',
    roomFill: '#241e16',
    corridorFill: '#201a12',
    gridLine: '#342a1e',
    hatchColor: '#3a3020',
    ink: '#a89060',
    glow: 'rgba(255,180,80,0.10)',
    vignetteEnd: 'rgba(0,0,0,0.30)',
    coneFill: 'rgba(200,160,60,0.08)',
    coneStroke: 'rgba(160,130,60,0.15)',
    compassBg: 'rgba(30,26,20,0.7)',
    tokenFill: 'rgba(30,26,20,0.85)',

    panelBg: '#1e1a14',
    panelBorder: '#5a4a30',
    panelHeader: '#2a2218',
    text: '#b8a070',
    textFaint: '#6a5a40',
    btnBg: 'rgba(180,150,90,0.10)',
    btnBorder: 'rgba(180,150,90,0.22)',
    btnColor: '#a89060',
    msgBg: 'rgba(30,26,20,0.85)',
    msgText: '#b8a070',
    hpBarBg: '#3a1818',
    manaBarBg: '#181830',
  },
  light: {
    parchment: '#f0e6c8',
    roomFill: '#e8dcc0',
    corridorFill: '#ede4cc',
    gridLine: '#c8b89a',
    hatchColor: '#b8a882',
    ink: '#3a2e1e',
    glow: 'rgba(255,224,138,0.12)',
    vignetteEnd: 'rgba(30,20,10,0.18)',
    coneFill: 'rgba(180,140,60,0.10)',
    coneStroke: 'rgba(60,40,10,0.20)',
    compassBg: 'rgba(240,230,200,0.7)',
    tokenFill: 'rgba(240,230,200,0.85)',

    panelBg: '#f0e6c8',
    panelBorder: '#3a2e1e',
    panelHeader: '#e0d4b4',
    text: '#3a2e1e',
    textFaint: '#6a5e4e',
    btnBg: 'rgba(60,46,30,0.12)',
    btnBorder: 'rgba(60,46,30,0.3)',
    btnColor: '#3a2e1e',
    msgBg: 'rgba(240,230,200,0.75)',
    msgText: '#3a2e1e',
    hpBarBg: '#4a2020',
    manaBarBg: '#1a1a3a',
  },
};

let mode = 'dark'; // default underground
const listeners = new Set();

export function getTheme() { return themes[mode]; }
export function getMode() { return mode; }

export function setMode(m) {
  if (m === mode) return;
  mode = m;
  for (const fn of listeners) fn();
}

export function toggleTheme() {
  setMode(mode === 'dark' ? 'light' : 'dark');
}

export function subscribeTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
