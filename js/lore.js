'use strict';
// ============================================================================
// 11c. Lore (v5.1): the NPC, inscriptions, wordless scenes and the seamless subtitles
// ============================================================================
// Reads LORE (js/data/lore.js) for the level being played. Never pauses, never locks the camera, never blocks a path:
// one press of Talk near Ysolde (or an inscription) plays every line as subtitles, each held for a time by its
// length, while the player keeps full control. Lines cannot be skipped. Walking away, an enemy turning on the player,
// or dying fades the subtitles out; Talk again starts over. Scenes and inscriptions are drawn only, and only near the
// player. The one thing here that touches the world is an NPC's `solid` rect (the bars of her cell in Level 1),
// which the player is kept out of. Tuning: CONFIG.lore. Developer builds (#dev) get "Lore:" jumps to each NPC.
const lore = (() => {
  const C = CONFIG.lore;
  let L = null;          // this level's lore, or null
  let group = null;      // its drawn things (scenes, tablets)
  let st = null;         // its state, rebuilt on every level start
  const UNIT = new THREE.BoxGeometry(1, 1, 1); UNIT.userData.shared = true;

  // ---- drawing helpers ---------------------------------------------------------------------------------------------
  const mats = {};
  const mat = (color, rough = 0.9, emissive = 0) => {
    const k = `${color}/${rough}/${emissive}`;
    return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.1, emissive }));
  };
  const box = (g, w, h, d, m, x, y, z, ry = 0, rx = 0, rz = 0) => {
    const b = new THREE.Mesh(UNIT, m); b.scale.set(w, h, d); b.position.set(x, y, z); b.rotation.set(rx, ry, rz); g.add(b); return b;
  };
  const rigOf = (id, scale = 1) => {
    const d = ENEMY_BY_ID[id];
    return new Rig({ scale: d.scale * scale, bulk: d.bulk, color: d.color, weapon: d.weapon, offhand: d.offhand, visual: d.visual, model: d.model });
  };
  // The floor at or just below `y` (default 0, the ground: never a roof that happens to lie overhead).
  const floor = (x, z, y = 0) => { const f = world.floorY(x, z, y + 0.1); return Number.isFinite(f) ? f : y; };

  // Each scene kind builds a group at the origin (local +z faces `yaw`) and may hand back a rig to pose.
  const SCENE = {
    corpse(s) { return { rig: rigOf('hollow', s.pose === 'child' ? 0.6 : 1) }; },
    shackles(s, g) {
      const iron = mat(0x4a4440, 0.6);
      for (let i = 0; i < 5; i++) box(g, 0.32, 0.06, 0.08, iron, rand(-0.3, 0.3), 0.04 + i * 0.03, rand(-0.25, 0.25), rand(0, 3));
      for (let i = 0; i < 4; i++) box(g, 0.14, 0.14, 0.03, iron, rand(-0.3, 0.3), 0.08, rand(-0.25, 0.25), rand(0, 3), Math.PI / 2);
    },
    barricade(s, g) {   // a doorway in the wall, planked over from this side
      const wood = mat(0x4a3826), dark = mat(0x161210);
      box(g, 1.8, 2.6, 0.06, dark, 0, 1.3, 0.02);
      box(g, 0.2, 2.8, 0.2, wood, -1.0, 1.4, 0.1); box(g, 0.2, 2.8, 0.2, wood, 1.0, 1.4, 0.1); box(g, 2.2, 0.2, 0.2, wood, 0, 2.8, 0.1);
      for (const [y, r] of [[0.5, 0.15], [1.1, -0.1], [1.7, 0.2], [2.3, -0.18]]) box(g, 2.4, 0.18, 0.07, wood, 0, y, 0.2, 0, 0, r);
    },
    candle(s, g) {
      box(g, 0.06, 0.16, 0.06, mat(0xd8ccb0), 0, 0.08, 0);
      const f = glowSprite(0xffb060, 2, 0.35, 0.8, null); f.position.set(0, 0.22, 0); g.add(f);
      return { flame: f };
    },
    sacks(s, g) {
      const cloth = mat(0x6a5a42);
      for (const [x, z, k] of [[0, 0, 1], [0.6, 0.2, 0.9], [-0.5, 0.3, 0.8], [0.2, 0.55, 0.85]]) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.32 * k, 8, 6), cloth); m.scale.y = 0.8; m.position.set(x, 0.26 * k, z); g.add(m);
      }
    },
    crates(s, g) {
      const wood = mat(0x5a4630);
      box(g, 0.8, 0.8, 0.8, wood, 0, 0.4, 0, 0.1); box(g, 0.7, 0.7, 0.7, wood, 0.9, 0.35, 0.2, -0.3); box(g, 0.6, 0.6, 0.6, wood, 0.2, 1.1, 0.1, 0.5);
    },
    bell(s, g) {   // a looted parish bell on its side
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 0.6, 12, 1, true), mat(0x6a7a52, 0.45));
      m.material.side = THREE.DoubleSide; m.rotation.z = Math.PI / 2 - 0.2; m.position.y = 0.36; g.add(m);
    },
    hearth(s, g) {
      const stone = mat(0x3a3430);
      box(g, 1.4, 0.3, 0.8, stone, 0, 0.15, 0); box(g, 0.2, 1.2, 0.8, stone, -0.6, 0.6, 0); box(g, 0.2, 1.2, 0.8, stone, 0.6, 0.6, 0); box(g, 1.4, 0.3, 0.8, stone, 0, 1.3, 0);
      const f = glowSprite(0xff8a40, 2, 1.0, 0.75, null); f.position.set(0, 0.45, 0); g.add(f);
      for (let i = 0; i < 4; i++) box(g, 0.5, 0.08, 0.08, mat(0x2a1a10, 0.9, 0x401808), rand(-0.2, 0.2), 0.34, rand(-0.15, 0.15), rand(0, 3));
      return { flame: f };
    },
    chair(s, g) {
      const wood = mat(0x4a3826);
      box(g, 0.5, 0.06, 0.5, wood, 0, 0.48, 0); box(g, 0.5, 0.6, 0.06, wood, 0, 0.8, -0.22);
      for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(g, 0.05, 0.48, 0.05, wood, x, 0.24, z);
    },
    rope(s, g) {   // a bell rope hanging from the dark, its end in a dead ringer's hands
      box(g, 0.04, s.top, 0.04, mat(0x8a7a5a), 0, s.top / 2, 0);
    },
    chains(s, g) {   // broken chains bolted to the floor, where the Bell Warden was bound
      const iron = mat(0x3a3836, 0.55);
      box(g, 0.3, 0.12, 0.3, iron, 0, 0.06, 0);
      for (let i = 0; i < 7; i++) box(g, 0.08, 0.04, 0.16, iron, Math.sin(i * 0.9) * 0.2, 0.03, 0.2 + i * 0.15, i * 0.7);
    },
    portrait(s, g) {   // a gilt frame high on the wall; the canvas cut out, or (one only) kept
      const gilt = mat(0x7a6030, 0.5);
      box(g, 1.8, 0.14, 0.1, gilt, 0, 4.6, 0); box(g, 1.8, 0.14, 0.1, gilt, 0, 2.2, 0);
      box(g, 0.14, 2.5, 0.1, gilt, -0.85, 3.4, 0); box(g, 0.14, 2.5, 0.1, gilt, 0.85, 3.4, 0);
      if (s.kept) {
        box(g, 1.56, 2.26, 0.03, mat(0x3a3020), 0, 3.4, -0.02);
        box(g, 0.34, 1.1, 0.02, mat(0x5a2a2a), -0.3, 3.1, 0); box(g, 0.2, 0.2, 0.02, mat(0xb8a088), -0.3, 3.8, 0);   // a queen
        box(g, 0.2, 0.6, 0.02, mat(0x2a3a5a), 0.25, 2.85, 0); box(g, 0.14, 0.14, 0.02, mat(0xb8a088), 0.25, 3.25, 0);   // a small boy
      } else {
        box(g, 1.56, 2.26, 0.02, mat(0x1a1410), 0, 3.4, -0.04);
        for (const y of [2.5, 4.3]) box(g, 1.3, 0.12, 0.02, mat(0x4a3a28), rand(-0.1, 0.1), y, 0, 0, 0, rand(-0.2, 0.2));   // ragged canvas edges
      }
    },
    crown(s, g) {   // a crown of seven points, broken in two
      const gold = mat(0x8a7030, 0.4);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 1.2, side = i < 4 ? 0 : 0.5;
        box(g, 0.1, 0.06, 0.03, gold, Math.cos(a) * 0.16 + side, 0.03, Math.sin(a) * 0.16, -a);
        box(g, 0.025, 0.1, 0.025, gold, Math.cos(a) * 0.16 + side, 0.1, Math.sin(a) * 0.16);
      }
    },
    statue(s, g) {   // the champion: hooded, a round shield, the scarf painted red, the face struck off
      const stone = mat(0x6a6660);
      box(g, 1.4, 0.9, 1.0, stone, 0, 0.45, 0); box(g, 1.6, 0.12, 1.2, stone, 0, 0.94, 0);
      const r = new Rig({ scale: 1.15, bulk: 1, color: 0x6a6660, weapon: 'sword', model: PLAYER_DEF.look.model });
      for (const m of r.mats) {
        const red = m.color && m.color.r > m.color.g * 1.6 && m.color.r > 0.3;
        if (m.color) m.color.setHex(red ? 0x9a4436 : 0xb0aca4);
        if (m.emissive) m.emissive.setHex(0);
      }
      const scar = box(new THREE.Group(), 0.2, 0.2, 0.08, mat(0x3a3836), 0, 0.12, 0.1); r.head.add(scar);   // the hacked-off face
      r.statue = true;
      return { rig: r, lift: 1.0 };
    },
  };

  function clear() {
    if (group) { scene.remove(group); group.traverse(o => { if (o.isMesh && o.geometry !== UNIT) o.geometry.dispose(); }); }
    if (st) { for (const N of st.npcs) N.rig.dispose(); for (const s of st.scenes) if (s.rig) s.rig.dispose(); }
    group = null; st = null; L = null;
    hud.subtitle(null);
  }

  // ---- the level's state, from its start ----------------------------------------------------------------------------
  function reset(game) {
    clear();
    const data = game.kind === 'level' && LORE.levels[game.level.id];
    if (!data) return;
    L = data; group = new THREE.Group(); scene.add(group);
    st = { npcs: [], inscriptions: [], scenes: [], talk: null, near: null, clock: 0 };
    for (const D of L.npcs || []) {   // one or more places she waits in this level (Level 5 has two)
      const N = LORE.npc;
      const rig = new Rig({ scale: N.scale, bulk: N.bulk, color: 0x5a6a7a, weapon: 'sword', model: N.model });
      if (rig.weapon) rig.weapon.visible = false;
      const ny = floor(D.x, D.z, D.y), g = new THREE.Group(); group.add(g);
      if (D.bars) {   // the bars of her cell, floor to lintel
        const [x0, z0, x1, z1] = D.bars, n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.22), y = floor(x0, z0, D.y), iron = mat(0x2e2c2a, 0.5);
        for (let i = 0; i <= n; i++) box(g, 0.05, 2.9, 0.05, iron, lerp(x0, x1, i / n), y + 1.45, lerp(z0, z1, i / n));
        for (const h of [0.15, 1.5, 2.85]) box(g, Math.hypot(x1 - x0, z1 - z0), 0.06, 0.06, iron, (x0 + x1) / 2, y + h, (z0 + z1) / 2, Math.atan2(z1 - z0, x1 - x0) * -1);
      }
      // A dim pool of candlelight behind her, so her shape reads against the dark (the sightings of Level 5 do the same).
      const halo = glowSprite(0xffc890, 1.3, 3.2, 0.32, null);
      halo.position.set(D.x - Math.sin(D.yaw) * 0.7, ny + (D.pose === 'sit' ? 1.0 : 1.5), D.z - Math.cos(D.yaw) * 0.7); g.add(halo);
      if (D.pose === 'sit') box(g, 0.5, 0.42, 0.42, mat(0x4a3826), D.x - Math.sin(D.yaw) * 0.12, ny + 0.21, D.z - Math.cos(D.yaw) * 0.12, D.yaw);   // an upturned crate
      st.npcs.push({ def: D, rig, props: g, x: D.x, z: D.z, y: ny, yaw: D.yaw, name: N.name, kind: 'npc', heard: false, wasNear: false, gesture: 0 });
    }
    for (const I of L.inscriptions || []) {
      const y = floor(I.x, I.z, I.y), g = new THREE.Group(); g.position.set(I.x, y, I.z); g.rotation.y = I.yaw; group.add(g);
      if (I.mount === 'wall') box(g, 0.9, 0.6, 0.06, mat(0x5a544c), 0, 1.5, -0.03);
      else if (I.mount === 'floor') box(g, 0.8, 0.12, 0.5, mat(0x5a544c), 0, 0.06, 0);
      const glow = glowSprite(0xe8dcc0, 1.2, 0.7, 0, null); glow.position.set(0, I.mount === 'floor' ? 0.3 : I.mount === 'wall' ? 1.5 : 1.1, 0.1); g.add(glow);
      st.inscriptions.push({ def: I, x: I.x, y, z: I.z, glow, name: I.label, kind: 'inscription' });
    }
    for (const S of L.scenes || []) {
      const y = floor(S.x, S.z, S.y), g = new THREE.Group(); g.position.set(S.x, y, S.z); g.rotation.y = S.yaw || 0; group.add(g);
      const out = SCENE[S.kind](S, g) || {};
      st.scenes.push({ def: S, group: g, y, ...out });
    }
  }

  // ---- talking ---------------------------------------------------------------------------------------------------------
  const lineTime = text => clamp(C.lineBase + text.length * C.perChar, C.lineMin, C.lineMax);
  // Something hostile is on the player: subtitles must clear for the fight.
  const threatened = game => game.enemies.some(e => e.fightingPlayer() && Math.hypot(e.x - game.player.x, e.z - game.player.z) < C.threatRange);
  const dist = (p, s) => Math.hypot(p.x - s.x, p.z - s.z);
  const sameFloor = (p, s) => Math.abs(p.y - s.y) < C.floorGap;
  // `after: '<zone id>'`: she waits there only once that zone is won (Level 5: past Aldric's first retreat).
  const present = (game, N) => !N.def.after || game.zones.some(z => z.id === N.def.after && z.gate.open);
  function nearest(game, p) {
    let best = null, bd = Infinity;
    for (const s of [...st.npcs.filter(N => present(game, N)), ...st.inscriptions]) {
      if (!sameFloor(p, s)) continue;
      const d = dist(p, s), r = s.kind === 'npc' ? C.talkRange : C.readRange;
      if (d < r && d < bd) { best = s; bd = d; }
    }
    return best;
  }
  function begin(src, lines, full = true) { st.talk = { src, lines, i: 0, t: 0, gap: false, full }; if (src.kind === 'npc') src.gesture = 1; }
  function fade() { st.talk = null; }
  function next() {
    const T = st.talk; T.i++; T.t = 0; T.gap = false;
    if (T.i >= T.lines.length) { if (T.full && T.src.kind === 'npc') T.src.heard = true; st.talk = null; }
  }

  // Every fixed step of a level.
  function update(game, dt) {
    const pressed = input.consume('talk');
    if (!st) return;
    st.clock += dt;
    const p = game.player;
    // The bars of a cell: the player is kept outside the rect.
    for (const N of st.npcs) {
      const solid = N.def.solid;
      if (!solid || !p.alive()) continue;
      const [x0, x1, z0, z1] = solid, r = C.solidPad;
      if (p.x > x0 - r && p.x < x1 + r && p.z > z0 - r && p.z < z1 + r) {
        const out = [[p.x - (x0 - r), 'x', x0 - r], [(x1 + r) - p.x, 'x', x1 + r], [p.z - (z0 - r), 'z', z0 - r], [(z1 + r) - p.z, 'z', z1 + r]].sort((a, b) => a[0] - b[0])[0];
        p[out[1]] = out[2];
      }
    }
    const busy = !p.alive() || threatened(game);
    const near = busy ? null : nearest(game, p);
    st.near = near;
    // Coming back to her after hearing it all: a short idle line, once per approach.
    for (const N of st.npcs) {
      const here = near === N;
      if (here && !N.wasNear && N.heard && !st.talk && N.def.idle) begin(N, [N.def.idle], false);
      N.wasNear = here || (N.wasNear && dist(p, N) < C.leaveRange);   // until she is left behind
    }
    if (pressed && near && !busy) {
      if (!(st.talk && st.talk.src === near && st.talk.full)) begin(near, near.def.lines);   // no skipping: it plays at its own pace
    }
    const T = st.talk;
    if (T && (busy || dist(p, T.src) > C.leaveRange || !sameFloor(p, T.src))) fade();
    else if (T) {
      T.t += dt;
      if (!T.gap && T.t >= lineTime(T.lines[T.i])) { T.gap = true; T.t = 0; }
      else if (T.gap && T.t >= C.lineGap) next();
    }
    hud.subtitle(st.talk ? { name: st.talk.src.name, text: st.talk.lines[st.talk.i], show: !st.talk.gap } : null);
  }
  // The Talk / Read prompt (js/hud.js reads it): what pressing Talk would do now, or null.
  function prompt() {
    if (!st || !st.near) return null;
    const s = st.near;
    if (st.talk && st.talk.src === s && st.talk.full) return null;   // already speaking: nothing to press
    return s.kind === 'npc' ? `Talk to ${s.name.split(' ')[0]}` : `Read: ${s.name}`;
  }

  // ---- drawing, every frame --------------------------------------------------------------------------------------------
  function render(game) {
    if (!st) return;
    const p = game.player, t = performance.now() / 1000, dt = 1 / 60;
    // Scenes: only near the player.
    for (const s of st.scenes) {
      const on = Math.hypot(p.x - s.def.x, p.z - s.def.z) < C.sceneRange;
      s.group.visible = on;
      if (s.flame) s.flame.material.opacity = 0.6 + 0.2 * Math.sin(t * 11 + s.def.x);
      if (!s.rig) continue;
      s.rig.root.visible = s.rig.shadow.visible = on;
      if (!on) continue;
      const r = s.rig, D = s.def;
      r.reset(); r.setOpacity(1);
      if (r.statue) {   // the champion, on guard
        r.armL.rotation.x = -0.6; r.armR.rotation.x = -0.2; r.head.rotation.x = 0.12;
        r.place(D.x, s.y + s.lift, D.z, D.yaw || 0, s.y + s.lift);
        r.shadow.visible = false;
        continue;
      }
      if (D.pose === 'seated') {   // slumped against a wall, legs out, head down
        r.spin.position.y = 0.32; r.legL.rotation.x = r.legR.rotation.x = -1.45; r.lean(-0.25); r.head.rotation.x = 0.7; r.armL.rotation.x = r.armR.rotation.x = 0.1;
        r.legL.rotation.x = r.legR.rotation.x = -1.45;
      } else {   // lying face down; `reaching` with one arm out ahead
        r.tip.rotation.x = Math.PI / 2; r.armL.rotation.x = D.pose === 'reaching' ? -2.9 : -0.4; r.armR.rotation.x = 0.4; r.legL.rotation.x = 0.25;
      }
      r.place(D.x, s.y + (D.pose === 'seated' ? 0 : 0.12), D.z, D.yaw || 0, s.y);
    }
    // Inscriptions glow faintly when near, brighter when the prompt is up.
    for (const I of st.inscriptions) {
      const d = Math.hypot(p.x - I.x, p.z - I.z), k = clamp(1 - d / C.glowRange, 0, 1);
      I.glow.material.opacity = (st.near === I ? 0.55 : 0.18 * k) * (0.85 + 0.15 * Math.sin(t * 2 + I.x));
    }
    for (const N of st.npcs) drawNpc(game, N, p, t, dt);
  }
  function drawNpc(game, N, p, t, dt) {
    const r = N.rig, near = Math.hypot(p.x - N.x, p.z - N.z), on = near < C.sceneRange * 1.5 && present(game, N);
    r.root.visible = r.shadow.visible = N.props.visible = on;
    if (!on) return;
    // Turn to face the player while they are near; back to her own way otherwise.
    const want = near < C.faceRange && p.alive() ? Math.atan2(p.x - N.x, p.z - N.z) : N.def.yaw;
    N.yaw += angDiff(want, N.yaw) * (1 - Math.exp(-C.turnRate * dt));
    r.reset();
    const sit = N.def.pose === 'sit';
    if (sit) { r.spin.position.y = 0.45; r.legL.rotation.x = r.legR.rotation.x = -1.5; r.kneeL.rotation.x = r.kneeR.rotation.x = 1.4; r.lean(0.12); }
    if (r.anim) { r.anim.idleLayer(t + 3, 1); }
    // Talking: small nods and a hand that lifts now and then; the head follows the player.
    const talking = st.talk && st.talk.src === N && !st.talk.gap;
    if (talking) {
      r.head.rotation.x += 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 3.1);
      r.head.rotation.y += 0.08 * Math.sin(t * 1.7);
      const lift = Math.max(0, Math.sin(t * 0.9 + st.talk.i));
      r.armR.rotation.x -= 0.7 * lift; if (r.elbowR) r.elbowR.rotation.x -= 0.6 * lift;
    }
    // A greeting (a bow of the head) when she starts or is heard again.
    N.gesture = Math.max(0, N.gesture - dt * 0.8);
    if (N.gesture > 0) r.head.rotation.x += 0.35 * Math.sin(N.gesture * Math.PI);
    if (!sit && !talking) r.armL.rotation.x -= 0.25;   // hands held together before her
    if (r.anim) r.anim.updateCloth({ vx: 0, vz: 0, yaw: N.yaw }, { t, dt, yaw: N.yaw }, dt);
    r.place(N.x, N.y, N.z, N.yaw, N.y);
  }

  // ---- developer jumps (#dev): the level, at the NPC ----------------------------------------------------------------
  // i: which of the level's places (Level 5 has two). A level with dev jumps (Level 5) starts at her bonfire with the
  // zones before it won.
  function jumpTo(id, i = 0) {
    const lvl = LEVELS.find(l => l.id === id), N = LORE.levels[id].npcs[i];
    if (lvl.devJumps) finale.jump(lvl.devJumps.find(q => q.at === N.bonfire) || lvl.devJumps[lvl.devJumps.length - 1]);
    else Game.startLevel(id);
    Game.spawn = { x: N.x + Math.sin(N.yaw) * 2.6, y: N.y, z: N.z + Math.cos(N.yaw) * 2.6, yaw: N.yaw + Math.PI };   // a few steps in front of her
    Game.spawnPlayer();
  }
  function devItems() {
    if (!DEV) return [];
    return Object.keys(LORE.levels).flatMap(id => (LORE.levels[id].npcs || []).map((N, i, all) => {
      const lvl = LEVELS.find(l => l.id === id);
      return { name: `Lore: ${LORE.npc.name.split(' ')[0]} in ${lvl.name}${all.length > 1 ? ` (${i + 1})` : ''}`, desc: 'Developer jump: start the level next to the NPC.', go: () => jumpTo(id, i) };
    }));
  }

  Game.renderHooks.push(render);
  // Distance to what Talk would reach now (Infinity if nothing): the bonfire shares the key (Game.restWins).
  function nearDist(p) { return st && st.near ? dist(p, st.near) : Infinity; }
  return { reset, update, prompt, nearDist, devItems, jumpTo, get state() { return st; } };
})();
