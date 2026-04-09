import DUNGEON from '../dungeon.js';
import { ROWS, COLS, getCell, getRoomCellCount, doorStates } from '../grid.js';
import { DIR_VEC } from '../constants.js';
import { party } from '../gameState.js';
import { getTheme, getMode, subscribeTheme } from './theme.js';

// Direction offsets: N, E, S, W
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DIR_NAMES = ['N', 'E', 'S', 'W'];
// Map direction index → angle (0=N=up on screen)
const DIR_ANGLES = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
// Wall edge endpoints (relative to cell top-left, in cell units)
const WALL_EDGES = {
  N: { x1: 0, y1: 0, x2: 1, y2: 0 },
  E: { x1: 1, y1: 0, x2: 1, y2: 1 },
  S: { x1: 0, y1: 1, x2: 1, y2: 1 },
  W: { x1: 0, y1: 0, x2: 0, y2: 1 },
};

function hashWobble(x, z, dirIdx) {
  const h = ((x * 7919 + z * 104729 + dirIdx * 31) & 0x7fffffff) % 1000;
  return (h / 1000) * 3 - 1.5;
}

export default class ParchmentMap {
  constructor(canvas, gameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gs = gameState;
    this.zoom = 1.0;
    this.offsetX = 0; // relative offset from party position
    this.offsetY = 0;
    this.cellPx = 24; // base pixels per grid cell at zoom 1.0
    this.dirty = true;

    this._wobbleCache = new Map();
    this._hatchPattern = null;
    this._noiseCanvas = null;
    this._themeMode = null;

    this._pointerDown = false;
    this._lastPointerX = 0;
    this._lastPointerY = 0;
    this._pinchDist = 0;

    this._buildThemeCaches();
    this._setupInput();
    this.onResize();

    this._unsub = gameState.subscribe(() => { this.dirty = true; });
    this._themeUnsub = subscribeTheme(() => {
      this._buildThemeCaches();
      this.dirty = true;
    });

    this._rafId = null;
    this._startLoop();
  }

  // ─── Theme-dependent caches ─────────────────────────

  _buildThemeCaches() {
    const t = getTheme();
    this._themeMode = getMode();

    // Cross-hatch pattern
    const sz = 12;
    const hc = document.createElement('canvas');
    hc.width = sz; hc.height = sz;
    const hctx = hc.getContext('2d');
    hctx.strokeStyle = t.hatchColor;
    hctx.globalAlpha = 0.22;
    hctx.lineWidth = 0.5;
    for (let i = -sz; i < sz * 2; i += 6) {
      hctx.beginPath(); hctx.moveTo(i, 0); hctx.lineTo(i + sz, sz); hctx.stroke();
    }
    for (let i = -sz; i < sz * 2; i += 6) {
      hctx.beginPath(); hctx.moveTo(i, sz); hctx.lineTo(i + sz, 0); hctx.stroke();
    }
    this._hatchPattern = this.ctx.createPattern(hc, 'repeat');

    // Rebuild noise if canvas is sized
    if (this.canvas.width > 0 && this.canvas.height > 0) {
      this._buildNoise(this.canvas.width, this.canvas.height);
    }
  }

  _buildNoise(w, h) {
    const t = getTheme();
    const nc = document.createElement('canvas');
    nc.width = w; nc.height = h;
    const nctx = nc.getContext('2d');
    const count = Math.floor(w * h * 0.003);
    for (let i = 0; i < count; i++) {
      const px = Math.random() * w;
      const py = Math.random() * h;
      const r = Math.random() * 1.5 + 0.5;
      nctx.globalAlpha = 0.02 + Math.random() * 0.04;
      nctx.fillStyle = t.ink;
      nctx.beginPath();
      nctx.arc(px, py, r, 0, Math.PI * 2);
      nctx.fill();
    }
    this._noiseCanvas = nc;
  }

  _getWobble(x, z, dirIdx) {
    const key = `${x},${z},${dirIdx}`;
    let v = this._wobbleCache.get(key);
    if (v === undefined) {
      v = hashWobble(x, z, dirIdx);
      this._wobbleCache.set(key, v);
    }
    return v;
  }

  // ─── Coordinate transforms ──────────────────────────

  _getViewCenter() {
    const [tx, tz] = this._getTokenPos();
    return [tx + 0.5 + this.offsetX, tz + 0.5 + this.offsetY];
  }

  _gridToScreen(gx, gz) {
    const cp = this.cellPx * this.zoom;
    const cx = this.canvas.width / (2 * this._dpr);
    const cy = this.canvas.height / (2 * this._dpr);
    const [vcx, vcy] = this._getViewCenter();
    return [
      cx + (gx - vcx) * cp,
      cy + (gz - vcy) * cp,
    ];
  }

  // ─── Input ──────────────────────────────────────────

  _setupInput() {
    const c = this.canvas;

    this._onWheel = (e) => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const oldZoom = this.zoom;
      this.zoom = Math.max(0.5, Math.min(20, this.zoom * (1 - e.deltaY * 0.001)));
      // Zoom toward cursor: adjust offset so point under cursor stays fixed
      const cp = this.cellPx;
      const cx = this.canvas.width / (2 * this._dpr);
      const cy = this.canvas.height / (2 * this._dpr);
      // Grid coord under cursor before and after zoom
      const gxBefore = (mx - cx) / (cp * oldZoom);
      const gxAfter = (mx - cx) / (cp * this.zoom);
      const gzBefore = (my - cy) / (cp * oldZoom);
      const gzAfter = (my - cy) / (cp * this.zoom);
      this.offsetX += gxBefore - gxAfter;
      this.offsetY += gzBefore - gzAfter;
      this.dirty = true;
    };
    c.addEventListener('wheel', this._onWheel, { passive: false });

    this._onPointerDown = (e) => {
      if (e.pointerType === 'touch' && e.isPrimary === false) return;
      this._pointerDown = true;
      this._lastPointerX = e.clientX;
      this._lastPointerY = e.clientY;
    };
    this._onPointerMove = (e) => {
      if (!this._pointerDown) return;
      const dx = e.clientX - this._lastPointerX;
      const dy = e.clientY - this._lastPointerY;
      this._lastPointerX = e.clientX;
      this._lastPointerY = e.clientY;
      const cp = this.cellPx * this.zoom;
      this.offsetX -= dx / cp;
      this.offsetY -= dy / cp;
      this.dirty = true;
    };
    this._onPointerUp = () => { this._pointerDown = false; };

    c.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);

    this._onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this._pinchDist = Math.hypot(dx, dy);
      }
    };
    this._onTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (this._pinchDist > 0) {
          this.zoom = Math.max(0.5, Math.min(20, this.zoom * (dist / this._pinchDist)));
          this.dirty = true;
        }
        this._pinchDist = dist;
      }
    };
    this._onTouchEnd = () => { this._pinchDist = 0; };

    c.addEventListener('touchstart', this._onTouchStart, { passive: true });
    c.addEventListener('touchmove', this._onTouchMove, { passive: false });
    c.addEventListener('touchend', this._onTouchEnd, { passive: true });
  }

  // ─── Lifecycle ──────────────────────────────────────

  onResize() {
    this._dpr = Math.min(window.devicePixelRatio, 2);
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = Math.floor(w * this._dpr);
    this.canvas.height = Math.floor(h * this._dpr);
    this._buildNoise(this.canvas.width, this.canvas.height);
    this.dirty = true;
  }

  destroy() {
    cancelAnimationFrame(this._rafId);
    this._unsub();
    this._themeUnsub();
    const c = this.canvas;
    c.removeEventListener('wheel', this._onWheel);
    c.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    c.removeEventListener('touchstart', this._onTouchStart);
    c.removeEventListener('touchmove', this._onTouchMove);
    c.removeEventListener('touchend', this._onTouchEnd);
  }

  _startLoop() {
    const tick = () => {
      this._rafId = requestAnimationFrame(tick);
      const isMoving = this._isTokenAnimating();
      const isLooking = !!this.gs.isLooking;
      if (this.dirty || isMoving || isLooking) {
        this._render();
        if (!isMoving && !isLooking) this.dirty = false;
      }
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _isTokenAnimating() {
    if (!this.gs.moveStartTime || !this.gs.moveDuration) return false;
    return performance.now() - this.gs.moveStartTime < this.gs.moveDuration;
  }

  // ─── Rendering ──────────────────────────────────────

  _render() {
    const ctx = this.ctx;
    const dpr = this._dpr;
    const cw = this.canvas.width / dpr;
    const ch = this.canvas.height / dpr;
    const t = getTheme();

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Background
    ctx.fillStyle = t.parchment;
    ctx.fillRect(0, 0, cw, ch);

    // 2. Noise overlay
    if (this._noiseCanvas) {
      ctx.globalAlpha = 1.0;
      ctx.drawImage(this._noiseCanvas, 0, 0, cw, ch);
    }

    // 3. Visited floor cells
    const cp = this.cellPx * this.zoom;
    const visited = this.gs.visited;

    for (const key of visited) {
      const [xs, zs] = key.split(',').map(Number);
      const cell = DUNGEON[zs]?.[xs];
      if (!cell || cell.type === 'wall') continue;

      const [sx, sy] = this._gridToScreen(xs, zs);

      // Floor fill
      const roomSize = getRoomCellCount(xs, zs);
      ctx.fillStyle = roomSize >= 4 ? t.roomFill : t.corridorFill;
      ctx.fillRect(sx, sy, cp, cp);

      // Grid lines
      ctx.strokeStyle = t.gridLine;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, cp, cp);

      // Cross-hatch
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = this._hatchPattern;
      ctx.fillRect(sx, sy, cp, cp);
      ctx.restore();
    }

    // 4. Light sources
    for (const key of visited) {
      const [xs, zs] = key.split(',').map(Number);
      const cell = DUNGEON[zs]?.[xs];
      if (!cell || !cell.items) continue;
      for (const item of cell.items) {
        if (item.kind === 'torch') {
          const [cx, cy] = this._gridToScreen(xs + 0.5, zs + 0.5);
          const r = cp * 1.5;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, t.glow);
          grad.addColorStop(1, t.glow.replace(/[\d.]+\)$/, '0)'));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. Walls
    ctx.strokeStyle = t.ink;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const drawnWalls = new Set();

    for (const key of visited) {
      const [x, z] = key.split(',').map(Number);
      const cell = DUNGEON[z]?.[x];
      if (!cell || cell.type === 'wall') continue;

      for (let di = 0; di < 4; di++) {
        const [dx, dz] = DIRS[di];
        const nx = x + dx, nz = z + dz;
        const nc = (nx >= 0 && nx < COLS && nz >= 0 && nz < ROWS) ? DUNGEON[nz][nx] : null;
        if (!nc || nc.type === 'wall') {
          const dir = DIR_NAMES[di];
          if (this._hasDoorOnWall(x, z, dir)) {
            this._drawDoorGap(ctx, x, z, di, cp, t);
          } else {
            const wallKey = this._wallKey(x, z, di);
            if (drawnWalls.has(wallKey)) continue;
            drawnWalls.add(wallKey);

            const edge = WALL_EDGES[dir];
            const [sx1, sy1] = this._gridToScreen(x + edge.x1, z + edge.y1);
            const [sx2, sy2] = this._gridToScreen(x + edge.x2, z + edge.y2);

            const wb = this._getWobble(x, z, di);
            const mx = (sx1 + sx2) / 2, my = (sy1 + sy2) / 2;
            const perpX = -(sy2 - sy1), perpY = sx2 - sx1;
            const pLen = Math.hypot(perpX, perpY) || 1;
            const wmx = mx + (perpX / pLen) * wb;
            const wmy = my + (perpY / pLen) * wb;

            ctx.strokeStyle = t.ink;
            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.quadraticCurveTo(wmx, wmy, sx2, sy2);
            ctx.stroke();
          }
        }

        // Doors between two floor cells
        if (nc && nc.type !== 'wall') {
          const dir = DIR_NAMES[di];
          if (this._hasDoorOnWall(x, z, dir)) {
            this._drawDoorGap(ctx, x, z, di, cp, t);
          }
        }
      }
    }

    // 6. View cone
    this._drawViewCone(ctx, cp, t);

    // 7. Party token
    this._drawPartyToken(ctx, cp, t);

    // 8. Compass rose
    this._drawCompassRose(ctx, cw, ch, t);

    // 9. Vignette
    const vcx = cw / 2, vcy = ch / 2;
    const vr = Math.max(cw, ch) * 0.7;
    const vgrad = ctx.createRadialGradient(vcx, vcy, vr * 0.3, vcx, vcy, vr);
    vgrad.addColorStop(0, 'rgba(0,0,0,0)');
    vgrad.addColorStop(1, t.vignetteEnd);
    ctx.fillStyle = vgrad;
    ctx.fillRect(0, 0, cw, ch);

    ctx.restore();
  }

  // ─── Token position with lerp ───────────────────────

  _getTokenPos() {
    const gs = this.gs;
    if (gs.moveStartTime && gs.moveDuration) {
      const elapsed = performance.now() - gs.moveStartTime;
      let t = Math.min(elapsed / gs.moveDuration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return [
        gs.prevPx + (gs.px - gs.prevPx) * ease,
        gs.prevPz + (gs.pz - gs.prevPz) * ease,
      ];
    }
    return [gs.px, gs.pz];
  }

  _getTokenDirAngle() {
    const gs = this.gs;
    if (gs.moveStartTime && gs.moveDuration) {
      const elapsed = performance.now() - gs.moveStartTime;
      let t = Math.min(elapsed / gs.moveDuration, 1);
      if (t >= 1) return DIR_ANGLES[gs.dir];
      if (gs.prevDir !== gs.dir) {
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        let from = DIR_ANGLES[gs.prevDir], to = DIR_ANGLES[gs.dir];
        let diff = to - from;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        return from + diff * ease;
      }
    }
    return DIR_ANGLES[gs.dir];
  }

  // ─── Party token ────────────────────────────────────

  _drawPartyToken(ctx, cp, t) {
    const [tx, tz] = this._getTokenPos();
    const [cx, cy] = this._gridToScreen(tx + 0.5, tz + 0.5);
    const radius = cp * 1.1;
    const dirAngle = this._getTokenDirAngle();

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = t.tokenFill;
    ctx.fill();
    ctx.strokeStyle = t.ink;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Facing chevron
    const chevLen = radius * 0.55;
    const chevW = radius * 0.35;
    const tipX = cx + Math.sin(dirAngle) * chevLen;
    const tipY = cy - Math.cos(dirAngle) * chevLen;
    const lx = cx + Math.sin(dirAngle - 2.5) * chevW;
    const ly = cy - Math.cos(dirAngle - 2.5) * chevW;
    const rx = cx + Math.sin(dirAngle + 2.5) * chevW;
    const ry = cy - Math.cos(dirAngle + 2.5) * chevW;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.closePath();
    ctx.fillStyle = t.ink;
    ctx.fill();

    // 4 portrait discs — rotate with party facing
    const portraits = party;
    const baseOffsets = [
      [0, -0.55],  // forward
      [0.55, 0],   // right
      [0, 0.55],   // back
      [-0.55, 0],  // left
    ];

    const cosA = Math.cos(dirAngle);
    const sinA = Math.sin(dirAngle);

    for (let i = 0; i < portraits.length; i++) {
      const p = portraits[i];
      const bx = baseOffsets[i][0] * radius;
      const by = baseOffsets[i][1] * radius;
      // Rotate offset by dirAngle (screen coords: Y down, positive angle = CW)
      const ox = bx * cosA - by * sinA;
      const oy = bx * sinA + by * cosA;
      const pr = cp * 0.38;

      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, pr, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = t.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(8, pr * 0.85)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.abbr, cx + ox, cy + oy + 1);
    }
  }

  // ─── View cone ──────────────────────────────────────

  _getCameraYawAngle() {
    // Party-direction angle (lerped during turns) plus the free-look offset.
    // Note: camYawOffset uses Three.js convention (rotation around +Y, CCW from above),
    // while the minimap uses screen convention (CW from north). They're opposite, so subtract.
    return this._getTokenDirAngle() - (this.gs.camYawOffset || 0);
  }

  _drawViewCone(ctx, cp, t) {
    const [tx, tz] = this._getTokenPos();
    const [cx, cy] = this._gridToScreen(tx + 0.5, tz + 0.5);
    const dirAngle = this._getCameraYawAngle();
    const fovHalf = (70 / 2) * (Math.PI / 180);
    const coneLen = cp * 6;

    const lx = cx + Math.sin(dirAngle - fovHalf) * coneLen;
    const ly = cy - Math.cos(dirAngle - fovHalf) * coneLen;
    const rx = cx + Math.sin(dirAngle + fovHalf) * coneLen;
    const ry = cy - Math.cos(dirAngle + fovHalf) * coneLen;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.closePath();
    ctx.fillStyle = t.coneFill;
    ctx.fill();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = t.coneStroke;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ─── Compass rose ───────────────────────────────────

  _drawCompassRose(ctx, cw, ch, t) {
    const cx = 56, cy = ch - 56;
    const r = 34;

    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = t.compassBg;
    ctx.fill();

    ctx.strokeStyle = t.ink;
    ctx.fillStyle = t.ink;
    ctx.lineWidth = 1.2;

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 - Math.PI / 2;
      const isMajor = i % 2 === 0;
      const len = isMajor ? r : r * 0.55;
      const baseW = isMajor ? 6 : 3;

      const tipX = cx + Math.cos(angle) * len;
      const tipY = cy + Math.sin(angle) * len;
      const lAngle = angle - Math.PI / 2;
      const rAngle = angle + Math.PI / 2;

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(cx + Math.cos(lAngle) * baseW, cy + Math.sin(lAngle) * baseW);
      ctx.lineTo(cx + Math.cos(rAngle) * baseW, cy + Math.sin(rAngle) * baseW);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = t.parchment;
    ctx.fill();
    ctx.strokeStyle = t.ink;
    ctx.stroke();

    ctx.fillStyle = t.ink;
    ctx.font = 'bold 11px "Palatino Linotype", "Book Antiqua", Palatino, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - r - 9);
    ctx.fillText('S', cx, cy + r + 10);
    ctx.fillText('E', cx + r + 9, cy);
    ctx.fillText('W', cx - r - 9, cy);
  }

  // ─── Door helpers ───────────────────────────────────

  _hasDoorOnWall(cx, cz, wall) {
    const cell = DUNGEON[cz]?.[cx];
    if (!cell || !cell.items) return false;
    return cell.items.some(it => it.kind === 'door' && it.wall === wall);
  }

  _getDoorOnWall(cx, cz, wall) {
    const cell = DUNGEON[cz]?.[cx];
    if (!cell || !cell.items) return null;
    return cell.items.find(it => it.kind === 'door' && it.wall === wall) || null;
  }

  _drawDoorGap(ctx, x, z, di, cp, t) {
    const dir = DIR_NAMES[di];
    const edge = WALL_EDGES[dir];
    const [sx1, sy1] = this._gridToScreen(x + edge.x1, z + edge.y1);
    const [sx2, sy2] = this._gridToScreen(x + edge.x2, z + edge.y2);

    const gapFrac = 0.30;
    const mx = (sx1 + sx2) / 2, my = (sy1 + sy2) / 2;
    const dx = sx2 - sx1, dy = sy2 - sy1;
    const halfGap = gapFrac / 2;

    const g1x = mx - dx * halfGap, g1y = my - dy * halfGap;
    const g2x = mx + dx * halfGap, g2y = my + dy * halfGap;

    ctx.strokeStyle = t.ink;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(g1x, g1y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g2x, g2y); ctx.lineTo(sx2, sy2); ctx.stroke();

    const doorItem = this._getDoorOnWall(x, z, dir);
    if (doorItem) {
      const ds = doorStates[doorItem.id];
      const isOpen = ds?.state === 'open';
      if (!isOpen) {
        const perpX = -dy, perpY = dx;
        const pLen = Math.hypot(perpX, perpY) || 1;
        const tickLen = cp * 0.12;
        const nx = (perpX / pLen) * tickLen;
        const ny = (perpY / pLen) * tickLen;

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(g1x - nx, g1y - ny); ctx.lineTo(g1x + nx, g1y + ny); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(g2x - nx, g2y - ny); ctx.lineTo(g2x + nx, g2y + ny); ctx.stroke();
      }
    }
  }

  _wallKey(x, z, di) {
    const [dx, dz] = DIRS[di];
    const nx = x + dx, nz = z + dz;
    const oppDi = (di + 2) % 4;
    if (nx < x || (nx === x && nz < z)) return `${nx},${nz},${oppDi}`;
    return `${x},${z},${di}`;
  }
}
