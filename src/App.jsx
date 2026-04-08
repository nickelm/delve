import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

import DUNGEON from './dungeon.js';
import {
  CELL_SIZE, DEFAULT_CEILING, MOVE_DURATION, TURN_DURATION, DOOR_ANIM_DUR,
  DIR_VEC, DIR_ANGLE, WALL_DIR_MAP,
} from './constants.js';
import {
  ROWS, COLS, getCell, isPassable, isPit, cellWorldPos, getFloorHeightAt,
  doorStates, isDoorBlocking, revealRoom,
} from './grid.js';
import {
  makeBrickTex, makeRoughTex, makeFloorTex, makeRoughFloorTex, makeVaultGeo,
} from './textures.js';
import { createItemMesh } from './items.js';
import gameState from './gameState.js';
import ParchmentMap from './ui/ParchmentMap.js';
import MessageLogOverlay, { log } from './ui/MessageLog.jsx';
import PartyBar from './ui/PartyBar.jsx';
import FloatingPanel from './ui/FloatingPanel.jsx';
import { getTheme, toggleTheme, subscribeTheme } from './ui/theme.js';

const PARTY_BAR_H = 82;

export default function App() {
  const mountRef = useRef(null);
  const parchmentRef = useRef(null);
  const parchmentMapRef = useRef(null);
  const [fps, setFps] = useState(0);
  const [isDead, setIsDead] = useState(false);
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => subscribeTheme(() => setTheme(getTheme())), []);

  // Reveal starting room
  useEffect(() => {
    revealRoom(gameState.px, gameState.pz, gameState.visited);
  }, []);

  // Build Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const gs = gameState;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    container.appendChild(renderer.domElement);
    gs.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.09);
    gs.scene = scene;

    const fh = getFloorHeightAt(gs.px, gs.pz);
    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 30);
    const [sx, sz] = cellWorldPos(gs.px, gs.pz);
    camera.position.set(sx, fh + 1.4, sz);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = DIR_ANGLE[gs.dir];
    gs.camera = camera;
    gs.raycaster = new THREE.Raycaster();

    scene.add(new THREE.AmbientLight(0x111122, 0.12));

    const torchLight = new THREE.PointLight(0xff9944, 3.5, 14, 1.5);
    torchLight.castShadow = true;
    torchLight.shadow.mapSize.set(512, 512);
    torchLight.shadow.camera.near = 0.1;
    torchLight.shadow.camera.far = 14;
    torchLight.shadow.bias = -0.002;
    torchLight.position.set(sx, fh + 1.8, sz);
    scene.add(torchLight);
    gs.torchLight = torchLight;

    const brickMat = new THREE.MeshStandardMaterial({ map: makeBrickTex(), roughness: 0.9, metalness: 0.05 });
    const roughMat = new THREE.MeshStandardMaterial({ map: makeRoughTex(), roughness: 0.95, metalness: 0.02 });
    const floorMat = new THREE.MeshStandardMaterial({ map: makeFloorTex(), roughness: 0.95, metalness: 0.02 });
    const roughFloorMat = new THREE.MeshStandardMaterial({ map: makeRoughFloorTex(), roughness: 0.98, metalness: 0.01 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 1.0 });
    const roughCeilMat = new THREE.MeshStandardMaterial({ color: 0x151310, roughness: 1.0 });
    const floorGeo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);

    for (let z = 0; z < ROWS; z++) {
      for (let x = 0; x < COLS; x++) {
        const cell = DUNGEON[z][x];
        const [cwx, cwz] = cellWorldPos(x, z);
        const isRough = cell.wallStyle === 'rough';

        if (cell.type === 'wall') {
          let maxCH = DEFAULT_CEILING;
          for (const [dx, dz] of [[0,-1],[0,1],[-1,0],[1,0]]) {
            const nc = getCell(x + dx, z + dz);
            if (nc && nc.type !== 'wall') {
              const nch = nc.ceilingHeight || DEFAULT_CEILING;
              if (nch > maxCH) maxCH = nch;
            }
          }
          const mat = isRough ? roughMat : brickMat;
          const geo = new THREE.BoxGeometry(CELL_SIZE, maxCH, CELL_SIZE);
          const wall = new THREE.Mesh(geo, mat);
          wall.position.set(cwx, maxCH / 2, cwz);
          wall.castShadow = true;
          wall.receiveShadow = true;
          scene.add(wall);

        } else if (cell.type === 'floor' || cell.type === 'ramp') {
          const cellFH = cell.floorHeight || 0;
          const ch = cell.ceilingHeight || DEFAULT_CEILING;
          const fm = isRough ? roughFloorMat : floorMat;

          if (cell.type === 'ramp') {
            const rampGeo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
            const ramp = new THREE.Mesh(rampGeo, fm);
            ramp.receiveShadow = true;
            const midH = (cell.floorHeight + cell.toHeight) / 2;
            ramp.position.set(cwx, midH, cwz);
            const rise = cell.toHeight - cell.floorHeight;
            const dv = WALL_DIR_MAP[cell.rampDir];
            if (dv) {
              ramp.rotation.x = -Math.PI / 2;
              if (dv[1] !== 0) {
                ramp.rotation.x += -Math.atan2(rise, CELL_SIZE) * dv[1];
              } else {
                ramp.rotation.y = Math.PI / 2;
                ramp.rotation.x += -Math.atan2(rise, CELL_SIZE) * dv[0];
              }
            }
            scene.add(ramp);
          } else {
            const floor = new THREE.Mesh(floorGeo, fm);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(cwx, cellFH, cwz);
            floor.receiveShadow = true;
            scene.add(floor);
          }

          if (cell.ceilingStyle === 'vaulted') {
            const vaultGeo = makeVaultGeo(CELL_SIZE, ch - cellFH, CELL_SIZE);
            const cm = isRough ? roughCeilMat : ceilMat;
            const vault = new THREE.Mesh(vaultGeo, cm);
            vault.position.set(cwx, ch - (ch - cellFH) * 0.4, cwz);
            vault.receiveShadow = true;
            scene.add(vault);
          } else {
            const cm = isRough ? roughCeilMat : ceilMat;
            const ceiling = new THREE.Mesh(floorGeo, cm);
            ceiling.rotation.x = Math.PI / 2;
            ceiling.position.set(cwx, ch, cwz);
            ceiling.receiveShadow = true;
            scene.add(ceiling);
          }

          for (const item of cell.items) {
            const inst = createItemMesh(item, x, z, cell, scene);
            if (inst) gs.itemInstances.push(inst);
          }

        } else if (cell.type === 'pit') {
          const pf = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x080706, roughness: 1.0 }));
          pf.rotation.x = -Math.PI / 2;
          pf.position.set(cwx, cell.floorHeight, cwz);
          scene.add(pf);

          const pc = new THREE.Mesh(floorGeo, ceilMat);
          pc.rotation.x = Math.PI / 2;
          pc.position.set(cwx, cell.ceilingHeight, cwz);
          scene.add(pc);

          const edgeGeo = new THREE.BoxGeometry(CELL_SIZE + 0.1, 0.05, 0.08);
          for (const d of [{ dx:0,dz:-1,r:0 },{ dx:0,dz:1,r:0 },{ dx:-1,dz:0,r:Math.PI/2 },{ dx:1,dz:0,r:Math.PI/2 }]) {
            const nc = getCell(x + d.dx, z + d.dz);
            if (nc && (nc.type === 'floor' || nc.type === 'ramp')) {
              const edge = new THREE.Mesh(edgeGeo, new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.9 }));
              edge.position.set(cwx + d.dx * CELL_SIZE * 0.48, 0.025, cwz + d.dz * CELL_SIZE * 0.48);
              edge.rotation.y = d.r;
              scene.add(edge);
            }
          }
        }
      }
    }

    // Animation loop
    let lt = performance.now(), fc = 0, fa = 0;
    function animate(time) {
      gs.animationId = requestAnimationFrame(animate);
      fc++; fa += time - lt; lt = time;
      if (fa > 1000) { setFps(Math.round(fc / (fa / 1000))); fc = 0; fa = 0; }
      if (gs.torchLight) {
        gs.torchLight.intensity = 3.5 + Math.sin(time * 0.01) * 0.4 + Math.sin(time * 0.023) * 0.3;
      }
      for (const inst of gs.itemInstances) {
        if (inst.type === 'torch' && inst.light) {
          inst.light.intensity = 1.5 + Math.sin(time * 0.012 + Math.random() * 0.01) * 0.3;
        }
        for (const m of inst.meshes) {
          if (m.userData?.isFlame) m.scale.setScalar(0.9 + Math.sin(time * 0.015) * 0.2);
          if (m.userData?.isRune && m.material) m.material.opacity = 0.4 + Math.sin(time * 0.003) * 0.25;
        }
      }
      renderer.render(scene, camera);
    }
    gs.animationId = requestAnimationFrame(animate);

    // Door click/tap
    const onClick = (e) => {
      if (gs.dead) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      gs.raycaster.setFromCamera(mouse, camera);
      gs.raycaster.far = 4;
      const hits = gs.raycaster.intersectObjects(scene.children, false);
      for (const hit of hits) {
        if (hit.object.userData?.isDoor) {
          const ds = doorStates[hit.object.userData.doorId];
          if (ds) toggleDoor(ds);
          break;
        }
      }
    };
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        onClick({ clientX: t.clientX, clientY: t.clientY });
      }
    });

    // ResizeObserver for 3D inset (handles FloatingPanel resizes)
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(container);

    // Window resize for parchment map
    const onResize = () => {
      if (parchmentMapRef.current) parchmentMapRef.current.onResize();
    };
    window.addEventListener('resize', onResize);

    // Initialize parchment map
    if (parchmentRef.current) {
      parchmentMapRef.current = new ParchmentMap(parchmentRef.current, gameState);
    }

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(gs.animationId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (parchmentMapRef.current) {
        parchmentMapRef.current.destroy();
        parchmentMapRef.current = null;
      }
    };
  }, []);

  function toggleDoor(ds) {
    if (ds.animating) return;
    ds.animating = true;
    const mesh = ds.mesh, handle = ds.handle;
    const opening = ds.state === 'closed';
    const startY = mesh.position.y;
    const targetY = opening ? ds.fh + DEFAULT_CEILING + 0.5 : ds.closedPos.y;
    const t0 = performance.now();

    log(opening ? 'the door grinds open...' : 'the door slams shut.');

    function step(now) {
      const t = Math.min((now - t0) / DOOR_ANIM_DUR, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      mesh.position.y = startY + (targetY - startY) * ease;
      handle.position.y = mesh.position.y - mesh.geometry.parameters.height * 0.05;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        ds.state = opening ? 'open' : 'closed';
        ds.animating = false;
        if (opening) {
          const wd = WALL_DIR_MAP[ds.wall];
          if (wd) {
            revealRoom(ds.cellX + wd[0], ds.cellZ + wd[1], gameState.visited);
            revealRoom(ds.cellX, ds.cellZ, gameState.visited);
            gameState.notify();
          }
        }
      }
    }
    requestAnimationFrame(step);
  }

  const doFall = useCallback(() => {
    const gs = gameState;
    gs.dead = true;
    const camera = gs.camera, torch = gs.torchLight;
    const startY = camera.position.y;
    const t0 = performance.now();
    function fallStep(now) {
      const t = Math.min((now - t0) / 1200, 1);
      camera.position.y = startY - t * t * 10;
      torch.position.y = camera.position.y + 0.4;
      camera.rotation.x = -t * 0.4;
      torch.intensity = 3.5 * (1 - t);
      if (t < 1) requestAnimationFrame(fallStep);
      else setIsDead(true);
    }
    requestAnimationFrame(fallStep);
  }, []);

  const doMove = useCallback((action) => {
    const gs = gameState;
    if (gs.animating || !gs.camera || gs.dead) return;

    let tx = gs.px, tz = gs.pz, td = gs.dir;
    if (action === 'forward') { tx += DIR_VEC[gs.dir][0]; tz += DIR_VEC[gs.dir][1]; }
    else if (action === 'back') { const bd = (gs.dir + 2) % 4; tx += DIR_VEC[bd][0]; tz += DIR_VEC[bd][1]; }
    else if (action === 'strafeLeft') { const ld = (gs.dir + 3) % 4; tx += DIR_VEC[ld][0]; tz += DIR_VEC[ld][1]; }
    else if (action === 'strafeRight') { const rd = (gs.dir + 1) % 4; tx += DIR_VEC[rd][0]; tz += DIR_VEC[rd][1]; }
    else if (action === 'turnLeft') { td = (gs.dir + 3) % 4; }
    else if (action === 'turnRight') { td = (gs.dir + 1) % 4; }

    if (action !== 'turnLeft' && action !== 'turnRight') {
      if (isDoorBlocking(gs.px, gs.pz, tx, tz)) {
        log('the door is closed.');
        return;
      }
      if (isPit(tx, tz)) {
        gs.animating = true;
        gs.prevPx = gs.px; gs.prevPz = gs.pz; gs.prevDir = gs.dir;
        gs.px = tx; gs.pz = tz;
        gs.moveStartTime = performance.now();
        gs.moveDuration = MOVE_DURATION;

        const camera = gs.camera, torch = gs.torchLight;
        const sp = camera.position.clone();
        const [twx, twz] = cellWorldPos(tx, tz);
        const ep = new THREE.Vector3(twx, camera.position.y, twz);
        const t0 = performance.now();
        function stepToPit(now) {
          const t = Math.min((now - t0) / MOVE_DURATION, 1);
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          camera.position.lerpVectors(sp, ep, ease);
          torch.position.set(camera.position.x, camera.position.y + 0.4, camera.position.z);
          if (t < 1) requestAnimationFrame(stepToPit);
          else {
            revealRoom(tx, tz, gs.visited);
            gameState.notify();
            doFall();
          }
        }
        requestAnimationFrame(stepToPit);
        return;
      }
      if (!isPassable(tx, tz)) return;
    }

    gs.animating = true;
    gs.prevPx = gs.px; gs.prevPz = gs.pz; gs.prevDir = gs.dir;
    const isTurn = action === 'turnLeft' || action === 'turnRight';
    const dur = isTurn ? TURN_DURATION : MOVE_DURATION;
    gs.moveStartTime = performance.now();
    gs.moveDuration = dur;
    gs.px = tx; gs.pz = tz; gs.dir = td;

    const camera = gs.camera, torch = gs.torchLight;
    const sp = camera.position.clone();
    const sr = camera.rotation.y;
    const [twx, twz] = cellWorldPos(tx, tz);
    const targetFH = getFloorHeightAt(tx, tz);
    const ep = new THREE.Vector3(twx, targetFH + 1.4, twz);

    let rd = DIR_ANGLE[td] - sr;
    while (rd > Math.PI) rd -= Math.PI * 2;
    while (rd < -Math.PI) rd += Math.PI * 2;

    const t0 = performance.now();

    function step(now) {
      const t = Math.min((now - t0) / dur, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(sp, ep, ease);
      camera.rotation.y = sr + rd * ease;
      torch.position.set(camera.position.x, camera.position.y + 0.4, camera.position.z);
      if (t < 1) requestAnimationFrame(step);
      else {
        revealRoom(tx, tz, gs.visited);
        gs.animating = false;
        gameState.notify();
      }
    }
    requestAnimationFrame(step);
  }, [doFall]);

  useEffect(() => {
    const onKey = (e) => {
      switch (e.key) {
        case 'w': case 'ArrowUp': e.preventDefault(); doMove('forward'); break;
        case 's': case 'ArrowDown': e.preventDefault(); doMove('back'); break;
        case 'a': case 'ArrowLeft': e.preventDefault(); doMove('strafeLeft'); break;
        case 'd': case 'ArrowRight': e.preventDefault(); doMove('strafeRight'); break;
        case 'q': doMove('turnLeft'); break;
        case 'e': doMove('turnRight'); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  const restart = useCallback(() => window.location.reload(), []);

  const DPadBtn = ({ label, action, style }) => {
    const t = theme;
    return (
      <button onPointerDown={(e) => { e.preventDefault(); doMove(action); }}
        style={{
          position: 'absolute', width: 48, height: 48,
          background: t.btnBg, border: `1px solid ${t.btnBorder}`,
          borderRadius: 8, color: t.btnColor, fontSize: 18, fontFamily: 'monospace',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', touchAction: 'none',
          userSelect: 'none', WebkitUserSelect: 'none', ...style,
        }}
      >{label}</button>
    );
  };

  const t = theme;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  return (
    <div style={{ width: '100%', height: '100vh', background: t.parchment, position: 'relative', overflow: 'hidden' }}>
      {/* Parchment map canvas — full screen background */}
      <canvas ref={parchmentRef} style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0,
      }} />

      {/* 3D Viewport — floating panel, default left half */}
      <FloatingPanel
        title="Dungeon View"
        defaultX={4} defaultY={4}
        defaultWidth={Math.floor(vw * 0.48) - 8}
        defaultHeight={vh - PARTY_BAR_H - 12}
        minWidth={200} minHeight={150}
      >
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      </FloatingPanel>

      {/* Navigation — floating panel, always on top */}
      <FloatingPanel
        title="Navigate"
        defaultX={vw - 192}
        defaultY={vh - PARTY_BAR_H - 210}
        defaultWidth={178}
        defaultHeight={138}
        resizable={false}
        alwaysOnTop
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <DPadBtn label="&#x21B6;" action="turnLeft" style={{ left: 4, top: 4 }} />
          <DPadBtn label="&#x21B7;" action="turnRight" style={{ right: 4, top: 4 }} />
          <DPadBtn label="&#x25B2;" action="forward" style={{ left: 62, top: 4 }} />
          <DPadBtn label="&#x25C0;" action="strafeLeft" style={{ left: 4, top: 56 }} />
          <DPadBtn label="&#x25B6;" action="strafeRight" style={{ right: 4, top: 56 }} />
          <DPadBtn label="&#x25BC;" action="back" style={{ left: 62, top: 56 }} />
        </div>
      </FloatingPanel>

      {/* Party — floating panel at bottom */}
      <FloatingPanel
        title="Party"
        defaultX={4}
        defaultY={vh - PARTY_BAR_H - 4}
        defaultWidth={vw - 8}
        defaultHeight={PARTY_BAR_H}
        minWidth={300} minHeight={60}
      >
        <PartyBar />
      </FloatingPanel>

      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{
        position: 'absolute', top: 12, left: 12, zIndex: 700,
        width: 44, height: 44, borderRadius: '50%',
        background: t.panelBg, border: `2px solid ${t.panelBorder}`,
        color: t.text, fontSize: 18, fontFamily: 'serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', userSelect: 'none',
        boxShadow: '1px 2px 8px rgba(0,0,0,0.3)',
      }} title="Toggle dark/light mode">&#x25D1;</button>

      {/* FPS counter */}
      <div style={{
        position: 'absolute', top: 62, left: 16, color: t.textFaint, fontSize: 10,
        fontFamily: 'monospace', zIndex: 700, pointerEvents: 'none',
      }}>{fps} fps</div>

      {/* Message log */}
      <MessageLogOverlay />

      {/* Death overlay */}
      {isDead && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(80,0,0,0.7)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            color: '#ff4444', fontSize: 48, fontFamily: 'serif', fontWeight: 'bold',
            textShadow: '0 0 20px #ff0000', marginBottom: 16,
          }}>YOU DIED</div>
          <div style={{ color: '#aa6666', fontSize: 14, fontFamily: 'monospace', marginBottom: 24 }}>
            You fell into a bottomless pit.
          </div>
          <button onClick={restart} style={{
            padding: '12px 32px', background: 'rgba(255,60,60,0.3)',
            border: '1px solid #ff4444', borderRadius: 8, color: '#ff8888',
            fontSize: 16, fontFamily: 'monospace', cursor: 'pointer',
          }}>Try Again</button>
        </div>
      )}
    </div>
  );
}
