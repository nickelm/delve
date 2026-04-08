// Shared mutable game state singleton — imported by App.jsx, ParchmentMap, MessageLog, PartyBar

const gameState = {
  // Player position & direction (0=N, 1=E, 2=S, 3=W)
  px: 1, pz: 5, dir: 0,
  animating: false,
  dead: false,
  visited: new Set(),

  // Three.js objects (set during App.jsx init)
  camera: null,
  torchLight: null,
  scene: null,
  renderer: null,
  animationId: null,
  itemInstances: [],
  raycaster: null,

  // For smooth parchment token lerp
  prevPx: 1, prevPz: 5, prevDir: 0,
  moveStartTime: 0,
  moveDuration: 0,

  // Pub/sub for reactive updates
  _listeners: new Set(),
  notify() {
    for (const fn of this._listeners) fn();
  },
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },
};

export const party = [
  { name: 'Aldric',  cls: 'Fighter', abbr: 'FI', color: '#8b2020', hp: 48, maxHp: 48, mana: 12, maxMana: 12 },
  { name: 'Whisper', cls: 'Rogue',   abbr: 'RO', color: '#1a5c2a', hp: 32, maxHp: 32, mana: 18, maxMana: 18 },
  { name: 'Solene',  cls: 'Cleric',  abbr: 'CL', color: '#b8860b', hp: 40, maxHp: 40, mana: 35, maxMana: 35 },
  { name: 'Vex',     cls: 'Mage',    abbr: 'MA', color: '#1a2a6b', hp: 24, maxHp: 24, mana: 50, maxMana: 50 },
];

export default gameState;
