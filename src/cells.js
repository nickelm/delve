// ============================================================
// Cell factories
// ============================================================

/** Standard floor cell */
export const F = (opts = {}) => ({
  type: 'floor',
  floorHeight: 0,
  ceilingHeight: 2.8,
  wallStyle: 'brick',
  ceilingStyle: 'flat',
  items: [],
  ...opts,
});

/** Wall cell */
export const W = (style = 'brick') => ({ type: 'wall', wallStyle: style });

/** Rough rock wall */
export const RW = () => W('rough');

/** Pit (bottomless drop) */
export const PIT = (depth = -8) => ({
  type: 'pit',
  floorHeight: depth,
  ceilingHeight: 2.8,
  items: [],
});

/** Ramp between heights */
export const RAMP = (fromH, toH, dir) => ({
  type: 'ramp',
  floorHeight: fromH,
  toHeight: toH,
  rampDir: dir,
  ceilingHeight: 2.8 + Math.max(fromH, toH),
  wallStyle: 'brick',
  ceilingStyle: 'flat',
  items: [],
});

/** Raised floor helper */
export const RF = (h, opts = {}) => F({ floorHeight: h, ceilingHeight: 2.8 + h, ...opts });

// ============================================================
// Item factories
// ============================================================

export const torch = (wall, h = 2.0) => ({ kind: 'torch', wall, height: h });
export const rune = (wall, h = 1.4) => ({ kind: 'rune', wall, height: h });
export const button = (wall, h = 1.3) => ({ kind: 'button', wall, height: h });
export const pushplate = () => ({ kind: 'pushplate' });
export const banner = (wall, h = 1.6) => ({ kind: 'banner', wall, height: h });
export const chain = () => ({ kind: 'chain' });
export const skull = (wall, h = 1.5) => ({ kind: 'skull', wall, height: h });
export const door = (wall, lock = 'none') => ({
  kind: 'door',
  wall,
  lockType: lock,
  state: 'closed',
  id: `d${Math.random().toString(36).slice(2, 8)}`,
});
