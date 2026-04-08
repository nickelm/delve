import * as THREE from 'three';
import { CELL_SIZE, DEFAULT_CEILING, WALL_DIRS, WALL_ROT, WALL_NORM } from './constants.js';
import { cellWorldPos, doorStates } from './grid.js';

/**
 * Create Three.js meshes for a dungeon item.
 * Returns { meshes, type, light?, doorId? } or null.
 */
export function createItemMesh(item, cx, cz, cell, scene) {
  const [wx, wz] = cellWorldPos(cx, cz);
  const fh = cell.floorHeight || 0;

  if (item.kind === 'torch') {
    const wd = WALL_DIRS[item.wall], nm = WALL_NORM[item.wall];
    const px = wx + wd[0] * CELL_SIZE, pz = wz + wd[1] * CELL_SIZE;

    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.25, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.7, metalness: 0.4 }),
    );
    bracket.position.set(px, fh + item.height, pz);
    bracket.castShadow = true;
    scene.add(bracket);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff8833 }),
    );
    flame.position.set(px + nm[0] * 2, fh + item.height + 0.18, pz + nm[1] * 2);
    flame.userData.isFlame = true;
    scene.add(flame);

    const light = new THREE.PointLight(0xff6622, 1.5, 6, 1.8);
    light.position.set(px + nm[0] * 2, fh + item.height + 0.15, pz + nm[1] * 2);
    scene.add(light);

    return { meshes: [bracket, flame, light], light, type: 'torch' };
  }

  if (item.kind === 'rune') {
    const wd = WALL_DIRS[item.wall], nm = WALL_NORM[item.wall];
    const px = wx + wd[0] * CELL_SIZE, pz = wz + wd[1] * CELL_SIZE;

    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    );
    m.position.set(px + nm[0], fh + item.height, pz + nm[1]);
    m.rotation.y = WALL_ROT[item.wall];
    m.userData.isRune = true;
    scene.add(m);

    const glow = new THREE.PointLight(0x4488ff, 0.4, 3, 2);
    glow.position.set(px + nm[0], fh + item.height, pz + nm[1]);
    scene.add(glow);

    return { meshes: [m, glow], type: 'rune' };
  }

  if (item.kind === 'button') {
    const wd = WALL_DIRS[item.wall], nm = WALL_NORM[item.wall];
    const px = wx + wd[0] * CELL_SIZE, pz = wz + wd[1] * CELL_SIZE;

    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.5, metalness: 0.3 }),
    );
    b.position.set(px + nm[0], fh + item.height, pz + nm[1]);
    b.rotation.y = WALL_ROT[item.wall];
    b.castShadow = true;
    scene.add(b);

    return { meshes: [b], type: 'button' };
  }

  if (item.kind === 'pushplate') {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.03, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.6, metalness: 0.3 }),
    );
    p.position.set(wx, fh + 0.015, wz);
    p.receiveShadow = true;
    scene.add(p);

    return { meshes: [p], type: 'pushplate' };
  }

  if (item.kind === 'banner') {
    const wd = WALL_DIRS[item.wall], nm = WALL_NORM[item.wall];
    const px = wx + wd[0] * CELL_SIZE, pz = wz + wd[1] * CELL_SIZE;

    const bm = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.8, side: THREE.DoubleSide }),
    );
    bm.position.set(px + nm[0], fh + item.height, pz + nm[1]);
    bm.rotation.y = WALL_ROT[item.wall];
    bm.castShadow = true;
    scene.add(bm);

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x444433, metalness: 0.5 }),
    );
    rod.rotation.z = Math.PI / 2;
    rod.position.set(px + nm[0], fh + item.height + 0.45, pz + nm[1]);
    scene.add(rod);

    return { meshes: [bm, rod], type: 'banner' };
  }

  if (item.kind === 'chain') {
    const ch = cell.ceilingHeight || DEFAULT_CEILING;
    const cm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, ch * 0.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 }),
    );
    cm.position.set(wx + (Math.random() - 0.5) * 0.5, fh + ch * 0.8, wz + (Math.random() - 0.5) * 0.5);
    cm.castShadow = true;
    scene.add(cm);

    return { meshes: [cm], type: 'chain' };
  }

  if (item.kind === 'skull') {
    const wd = WALL_DIRS[item.wall], nm = WALL_NORM[item.wall];
    const px = wx + wd[0] * CELL_SIZE, pz = wz + wd[1] * CELL_SIZE;

    const sm = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.8 }),
    );
    sm.position.set(px + nm[0], fh + item.height, pz + nm[1]);
    sm.scale.set(1, 1.15, 0.9);
    sm.castShadow = true;
    scene.add(sm);

    const eyeGeo = new THREE.SphereGeometry(0.02, 4, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(px + nm[0] * 3 - 0.035, fh + item.height + 0.03, pz + nm[1] * 3);
    eyeR.position.set(px + nm[0] * 3 + 0.035, fh + item.height + 0.03, pz + nm[1] * 3);
    scene.add(eyeL);
    scene.add(eyeR);

    return { meshes: [sm, eyeL, eyeR], type: 'skull' };
  }

  if (item.kind === 'door') {
    const wd = WALL_DIRS[item.wall];
    const px = wx + wd[0] * CELL_SIZE, pz = wz + wd[1] * CELL_SIZE;
    const isNS = item.wall === 'N' || item.wall === 'S';
    const dw = isNS ? CELL_SIZE * 0.85 : 0.1;
    const dd = isNS ? 0.1 : CELL_SIZE * 0.85;
    const dh = DEFAULT_CEILING * 0.85;

    const dm = new THREE.Mesh(
      new THREE.BoxGeometry(dw, dh, dd),
      new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7, metalness: 0.1 }),
    );
    dm.position.set(px, fh + dh / 2, pz);
    dm.castShadow = true;
    dm.receiveShadow = true;
    dm.userData.isDoor = true;
    dm.userData.doorId = item.id;
    scene.add(dm);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 0.6, metalness: 0.2 });
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(isNS ? CELL_SIZE : 0.15, 0.12, isNS ? 0.15 : CELL_SIZE),
      frameMat,
    );
    frame.position.set(px, fh + DEFAULT_CEILING * 0.87, pz);
    scene.add(frame);

    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xaa8844, metalness: 0.5, roughness: 0.3 }),
    );
    const ho = isNS ? [0.3, 0, 0.06] : [0.06, 0, 0.3];
    handle.position.set(px + ho[0], fh + dh * 0.45, pz + ho[2]);
    handle.userData.isDoor = true;
    handle.userData.doorId = item.id;
    scene.add(handle);

    doorStates[item.id] = {
      state: 'closed', mesh: dm, handle,
      closedPos: dm.position.clone(),
      isNS, cellX: cx, cellZ: cz, wall: item.wall, fh,
    };

    return { meshes: [dm, frame, handle], type: 'door', doorId: item.id };
  }

  return null;
}
