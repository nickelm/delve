import * as THREE from 'three';

// ============================================================
// Procedural textures (to be replaced with real textures later)
// ============================================================

export function makeBrickTex() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3632';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 600; i++) {
    const b = 40 + Math.random() * 30;
    ctx.fillStyle = `rgb(${b},${b - 5},${b - 8})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  ctx.strokeStyle = '#2a2622';
  ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) {
    const y = r * 32 + 16;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
    const off = r % 2 === 0 ? 0 : 32;
    for (let col = 0; col < 5; col++) {
      ctx.beginPath(); ctx.moveTo(col * 64 + off, y); ctx.lineTo(col * 64 + off, y + 32); ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function makeRoughTex() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2a2825';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1200; i++) {
    const b = 25 + Math.random() * 40;
    ctx.fillStyle = `rgb(${b},${b - 2 + Math.random() * 4},${b - 6})`;
    const s = 1 + Math.random() * 6;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, s, s * (0.5 + Math.random()));
  }
  ctx.strokeStyle = '#1a1816';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = Math.random() * 128, y = Math.random() * 128;
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += (Math.random() - 0.5) * 30;
      y += (Math.random() - 0.5) * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function makeFloorTex() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2e2b27';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 400; i++) {
    const b = 30 + Math.random() * 25;
    ctx.fillStyle = `rgb(${b},${b - 3},${b - 5})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 4, 1 + Math.random() * 3);
  }
  ctx.strokeStyle = '#252220';
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, 124, 124);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function makeRoughFloorTex() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#252220';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 800; i++) {
    const b = 22 + Math.random() * 30;
    ctx.fillStyle = `rgb(${b},${b - 2},${b - 5})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 5, 1 + Math.random() * 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ============================================================
// Vaulted ceiling geometry (half-cylinder arch)
// ============================================================

export function makeVaultGeo(width, height, depth) {
  const segs = 8;
  const geo = new THREE.BufferGeometry();
  const verts = [];
  const uvs = [];
  const indices = [];
  const halfW = width / 2;
  const halfD = depth / 2;

  for (let zi = 0; zi <= 1; zi++) {
    const zPos = -halfD + zi * depth;
    for (let i = 0; i <= segs; i++) {
      const angle = (i / segs) * Math.PI;
      const x = Math.cos(angle) * halfW;
      const y = Math.sin(angle) * height * 0.4;
      verts.push(x, y, zPos);
      uvs.push(i / segs, zi);
    }
  }
  for (let zi = 0; zi < 1; zi++) {
    for (let i = 0; i < segs; i++) {
      const a = zi * (segs + 1) + i;
      const b = a + 1;
      const c = a + segs + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
