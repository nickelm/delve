import DUNGEON from './dungeon.js';
import { CELL_SIZE, WALL_DIR_MAP } from './constants.js';

export const ROWS = DUNGEON.length;
export const COLS = DUNGEON[0].length;

// ============================================================
// Cell access
// ============================================================

export function getCell(x, z) {
  if (z < 0 || z >= ROWS || x < 0 || x >= COLS) return null;
  return DUNGEON[z][x];
}

export function isPassable(x, z) {
  const c = getCell(x, z);
  return c && (c.type === 'floor' || c.type === 'ramp');
}

export function isPit(x, z) {
  const c = getCell(x, z);
  return c && c.type === 'pit';
}

export function cellWorldPos(x, z) {
  return [x * CELL_SIZE + CELL_SIZE / 2, z * CELL_SIZE + CELL_SIZE / 2];
}

export function getFloorHeightAt(x, z) {
  const c = getCell(x, z);
  if (!c) return 0;
  if (c.type === 'ramp') return c.toHeight;
  return c.floorHeight || 0;
}

// ============================================================
// Door utilities
// ============================================================

/** Mutable door state tracking - shared across modules */
export const doorStates = {};

export function hasDoorOnWall(cx, cz, wall) {
  const c = getCell(cx, cz);
  if (!c || !c.items) return false;
  return c.items.some((it) => it.kind === 'door' && it.wall === wall);
}

export function hasDoorBetween(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  if (dz === -1 && dx === 0) return hasDoorOnWall(x1, z1, 'N') || hasDoorOnWall(x2, z2, 'S');
  if (dz === 1 && dx === 0) return hasDoorOnWall(x1, z1, 'S') || hasDoorOnWall(x2, z2, 'N');
  if (dx === -1 && dz === 0) return hasDoorOnWall(x1, z1, 'W') || hasDoorOnWall(x2, z2, 'E');
  if (dx === 1 && dz === 0) return hasDoorOnWall(x1, z1, 'E') || hasDoorOnWall(x2, z2, 'W');
  return false;
}

export function isDoorBlocking(fx, fz, tx, tz) {
  const dx = tx - fx, dz = tz - fz;
  const check = (cx, cz, wall) => {
    const c = getCell(cx, cz);
    if (!c || !c.items) return false;
    for (const it of c.items) {
      if (it.kind === 'door' && it.wall === wall) {
        const ds = doorStates[it.id];
        if (!ds || ds.state === 'closed') return true;
      }
    }
    return false;
  };
  if (dz === -1 && dx === 0) return check(fx, fz, 'N') || check(tx, tz, 'S');
  if (dz === 1 && dx === 0) return check(fx, fz, 'S') || check(tx, tz, 'N');
  if (dx === -1 && dz === 0) return check(fx, fz, 'W') || check(tx, tz, 'E');
  if (dx === 1 && dz === 0) return check(fx, fz, 'E') || check(tx, tz, 'W');
  return false;
}

// ============================================================
// Room tagging (flood fill, doors as boundaries)
// ============================================================

const roomMap = {};   // "x,z" -> roomId
const roomCells = {}; // roomId -> [{x,z}, ...]
let nextRoomId = 0;

function tagRooms() {
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      const key = `${x},${z}`;
      if (roomMap[key] !== undefined) continue;
      const cell = getCell(x, z);
      if (!cell || cell.type === 'wall') continue;

      const rid = nextRoomId++;
      const queue = [{ x, z }];
      const cells = [];
      const seen = new Set([key]);

      while (queue.length > 0) {
        const cur = queue.shift();
        roomMap[`${cur.x},${cur.z}`] = rid;
        cells.push(cur);

        for (const [ddx, ddz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const nx = cur.x + ddx, nz = cur.z + ddz;
          const nk = `${nx},${nz}`;
          if (seen.has(nk)) continue;
          const nc = getCell(nx, nz);
          if (!nc || nc.type === 'wall') continue;
          if (hasDoorBetween(cur.x, cur.z, nx, nz)) continue;
          seen.add(nk);
          queue.push({ x: nx, z: nz });
        }
      }
      roomCells[rid] = cells;
    }
  }
}

// Run on module load
tagRooms();

export function getRoomId(x, z) { return roomMap[`${x},${z}`]; }

export function getRoomCellCount(x, z) {
  const rid = roomMap[`${x},${z}`];
  return rid !== undefined ? (roomCells[rid] || []).length : 0;
}

/** Reveal all cells in the room containing (x,z) plus surrounding walls */
export function revealRoom(x, z, visited) {
  const rid = roomMap[`${x},${z}`];
  if (rid === undefined) {
    visited.add(`${x},${z}`);
    return;
  }

  const cells = roomCells[rid] || [];
  for (const c of cells) {
    visited.add(`${c.x},${c.z}`);
    // Reveal surrounding walls so room outline shows on minimap
    for (const [ddx, ddz] of [[0,-1],[1,0],[0,1],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]]) {
      const nx = c.x + ddx, nz = c.z + ddz;
      if (nx >= 0 && nx < COLS && nz >= 0 && nz < ROWS) {
        const nc = getCell(nx, nz);
        if (nc && nc.type === 'wall') visited.add(`${nx},${nz}`);
      }
    }
  }
  // Reveal the cell on the far side of each door (but not the room beyond)
  for (const c of cells) {
    const cell = getCell(c.x, c.z);
    if (!cell?.items) continue;
    for (const it of cell.items) {
      if (it.kind === 'door') {
        const wd = WALL_DIR_MAP[it.wall];
        if (wd) {
          const dx = c.x + wd[0], dz = c.z + wd[1];
          if (dx >= 0 && dx < COLS && dz >= 0 && dz < ROWS) {
            visited.add(`${dx},${dz}`);
          }
        }
      }
    }
  }
}
