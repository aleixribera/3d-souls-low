'use strict';
// ============================================================================
// 11b. Finale: Level 5's own script (v4.3)
// ============================================================================
// Everything here reads the level's data (js/levels/final-castle.js) and the game's events; none of it decides a fight.
// It only opens and closes the throne room's fog gate, and draws: the sightings of Aldric on the way (`spectators`), the
// ambush hints (`hints`), the throne room and its transition (`finaleRoom`), the burning look of a boss phase with
// `ignite`, the boss pulse, the perched enemies' warning grit, and the ending with its credits. Developer builds (#dev)
// get the Level 5 jumps (Test Grounds) and F10, which empties the current boss bar.
const finale = (() => {
  const F = CONFIG.finale, V3 = THREE.Vector3;
  const onlineGame = () => typeof multiplayer !== 'undefined' && multiplayer.active();
  let L = null;         // the level being scripted (one with `ending`), or null
  let group = null;     // this level's own drawn things
  let st = null;        // its state; rebuilt on every level start
  const sprites = [];   // a small pool of rising embers (additive glows)
  const rings = [];     // fire rings drawn over a ring hit (exactly its radius)
  const STORE = 'combatArena.complete';
  const storeKey = id => id === 'final-castle' ? STORE : `${STORE}.${id}`;   // the road's last level (Ashmere's keeps the old key)

  // ---- helpers ------------------------------------------------------------------------------------------------
  const isBoss = e => !!e && !!e.phaseIds;
  const burning = e => isBoss(e) && !!e.def.ignite && (e.state !== ES.PHASE || e.stateTime >= F.igniteAt);
  const play = (id, pos, vel = 1) => { try { audio.play(id, { pos, vel }); } catch (err) { /* sound never breaks the game */ } };
  function ember(x, y, z, color = 0xff8a30, up = 1.6, life = 1.6, size = 0.22) {
    let s = sprites.find(q => q.life <= 0);
    if (!s) {
      if (sprites.length >= 160) return;
      const m = glowSprite(color, 2.2, size, 0.9, null); scene.add(m);
      s = { mesh: m, life: 0, max: 1, vx: 0, vy: 0, vz: 0 }; sprites.push(s);
    }
    s.mesh.material.color.set(color).multiplyScalar(2.2); s.mesh.scale.setScalar(size);
    s.mesh.position.set(x, y, z); s.mesh.visible = true;
    s.vx = rand(-0.5, 0.5); s.vz = rand(-0.5, 0.5); s.vy = up * rand(0.6, 1.3); s.life = s.max = life * rand(0.7, 1.2);
  }
  function fireRing(x, y, z, from, to, time) {
    let r = rings.find(q => q.t >= q.time + 0.5);
    if (!r) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({ color: 0xff7a28, transparent: true, depthWrite: false,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2; scene.add(m); r = { mesh: m, t: 0, time: 1, from: 0, to: 0 }; rings.push(r);
    }
    Object.assign(r, { t: 0, time, from, to }); r.mesh.position.set(x, y + 0.06, z); r.mesh.visible = true;
  }

  // ---- building the level's own things --------------------------------------------------------------------------
  function clear() {
    if (group) {
      scene.remove(group);
      group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
    if (st) { for (const s of st.spectators) if (s.rig) s.rig.dispose(); for (const c of st.corpses) c.rig.dispose(); }
    for (const s of sprites) { s.life = 0; s.mesh.visible = false; }
    for (const r of rings) { r.t = r.time + 1; r.mesh.visible = false; }
    group = null; st = null;
  }
  const box = (g, w, h, d, color, x, y, z, emissive) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive: emissive || 0x000000 }));
    m.position.set(x, y, z); g.add(m); return m;
  };
  function buildRoom(R) {
    const g = new THREE.Group(), y = R.y, out = { group: g, windows: [], pillars: [], fires: [], marks: [] };
    // The throne on its dais, facing the door, and the glow behind it that leads the eye down the room.
    const [tx, tz] = R.throne;
    box(g, 3.4, 0.5, 4.4, 0x2a2220, tx, y + 0.25, tz); box(g, 2.2, 0.5, 3.2, 0x3a2e28, tx, y + 0.75, tz);
    box(g, 1.2, 1.0, 1.6, 0x4a3a2a, tx, y + 1.5, tz); box(g, 0.35, 3.4, 1.8, 0x4a3a2a, tx + 0.55, y + 2.7, tz);
    for (const s of [-1, 1]) box(g, 1.2, 0.8, 0.2, 0x4a3a2a, tx, y + 2.0, tz + s * 0.85);
    const halo = glowSprite(0xffb060, 1.6, 9, 0.5, null); halo.position.set(tx + 1.2, y + 4, tz); g.add(halo); out.halo = halo;
    // Stained glass: tall panes in the long walls, lit from outside.
    const colors = [0x7a3a2a, 0x2a4a7a, 0x8a6a2a, 0x3a6a4a, 0x6a2a5a, 0x2a5a6a];
    R.windows.forEach(([wx, wz], i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 6), new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      m.position.set(wx, y + 6.5, wz); g.add(m);
      const frame = box(g, 2.7, 0.2, 0.3, 0x1a1614, wx, y + 9.6, wz); box(g, 2.7, 0.2, 0.3, 0x1a1614, wx, y + 3.4, wz);
      out.windows.push({ mesh: m, frame, x: wx, z: wz, color: colors[i % colors.length] });
    });
    // The pillars that fall: each lies along x when it lands (dir), in the strip by the wall, which glows red as a mark
    // while the transition runs. They are drawn only: nothing collides with them and nothing they do can hurt.
    for (const [px, pz, dir] of R.pillars) {
      const pivot = new THREE.Group(); pivot.position.set(px, y, pz); g.add(pivot);
      box(pivot, 1.1, 11, 1.1, 0x4a4440, 0, 5.5, 0); box(pivot, 1.5, 0.5, 1.5, 0x2a2826, 0, 0.25, 0); box(pivot, 1.5, 0.5, 1.5, 0x2a2826, 0, 10.8, 0);
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.6), new THREE.MeshBasicMaterial({ color: 0xff3018, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      mark.rotation.x = -Math.PI / 2; mark.position.set(px + dir * 6, y + 0.05, pz); g.add(mark);
      out.pillars.push({ pivot, dir, x: px, z: pz, t: -1, mark });
    }
    // Columns of fire over the braziers: low until he burns.
    for (const [fx, fz] of R.fires) {
      const s = glowSprite(0xff7a30, 2, 2.2, 0.0, null); s.position.set(fx, y + 3.4, fz); g.add(s);
      out.fires.push({ sprite: s, x: fx, z: fz });
    }
    // The room's fire light, dark until the second phase (added at load, so no shader rebuilds mid-fight).
    out.light = new THREE.PointLight(0xff6a28, 0, 46, 1.2); out.light.position.set(R.glow[0], y + 7, R.glow[1]); g.add(out.light);
    return out;
  }
  // The fog over the throne room's door: a pale curtain of light, there while the fight is still to be won.
  function buildFog(gate) {
    const alongX = gate.box.x1 - gate.box.x0 > gate.box.z1 - gate.box.z0, w = alongX ? gate.box.x1 - gate.box.x0 : gate.box.z1 - gate.box.z0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 5.5), new THREE.MeshBasicMaterial({ color: 0xffe8c0, transparent: true, opacity: 0.35,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    m.position.set(gate.x + (alongX ? 0 : -0.4), gate.y + 2.75, gate.z); if (!alongX) m.rotation.y = Math.PI / 2;
    group.add(m);
    return m;
  }

  // ---- the level's state, from its start --------------------------------------------------------------------------
  function reset(game) {
    clear();
    hideEnding();
    game.camFocus = null;
    // v7.0: any level with a fog gate, sightings or ambush hints is scripted too (the Lands Between's boss lands), not only
    // the one with the `ending`; the throne room dressing and its transition stay Level 5's (`finaleRoom`).
    const lv = game.kind === 'level' ? game.level : null;
    L = lv && (lv.ending || (lv.sealed || []).some(s => s.fog) || (lv.spectators || []).length || (lv.hints || []).length) ? lv : null;
    if (!L) return;
    group = new THREE.Group(); scene.add(group);
    const rigOf = (id, variant) => { const d = ENEMY_BY_ID[id]; return new Rig({ scale: d.scale, bulk: d.bulk, color: d.color, weapon: d.weapon, offhand: d.offhand, visual: d.visual, model: d.model, variant }); };
    st = {
      spectators: (L.spectators || []).map(s => ({ def: s, rig: rigOf(s.enemy), state: 'wait', t: 0, phase: 0 })),
      corpses: (L.hints || []).filter(h => h.kind === 'corpse').map(h => ({ def: h, rig: rigOf('hollow'), y: world.floorY(h.x, h.z, h.y) })),
      fog: null, room: L.finaleRoom ? buildRoom(L.finaleRoom) : null, pulse: 0, grit: new Map(), trans: null, ending: null,
    };
    if (st.room) group.add(st.room.group);
    // Each sighting stands against a dim glow of firelight behind him, so his silhouette reads against the dark stone.
    for (const s of st.spectators) {
      s.rig.root.visible = true;
      s.halo = glowSprite(s.def.halo ?? 0xff9a50, 1.4, 5.5, 0.4, null); s.halo.position.set(s.def.x - Math.sin(s.def.yaw) * 1.2, s.def.y + 2.2, s.def.z - Math.cos(s.def.yaw) * 1.2); group.add(s.halo);
    }
    const fogEntry = (L.sealed || []).find(s => s.fog);
    if (fogEntry) {
      const gate = world.gates.find(g => g.id === fogEntry.id);
      gate.open = true; gate.lift = 1;
      st.fog = { gate, zoneId: fogEntry.fog, plane: buildFog(gate), sealed: false };
    }
  }

  // ---- every fixed step of a level ------------------------------------------------------------------------------
  function update(game, dt, online = false) {
    if (!st) return;
    const p = game.player;
    // The fog gate: open until the player is inside the throne room with the fight on; then it drops behind them and
    // stays down until they win or die (the respawn puts them back at the bonfire outside, the gate open again).
    if (st.fog && !online) {
      const f = st.fog, zone = game.zones.find(z => z.id === f.zoneId), won = zone.gate.open;
      // Inside: in the zone, on the gate's floor and clear of the gate's own doorway (on whichever side the room lies).
      const b = f.gate.box, pad = 0.3, clear = p.x < b.x0 - pad || p.x > b.x1 + pad || p.z < b.z0 - pad || p.z > b.z1 + pad;
      const inside = p.alive() && inArea(zone.trigger, p.x, p.z) && Math.abs(p.y - f.gate.y) < 3 && clear;
      const fight = zone.actors.some(a => a.alive());
      if (won || !p.alive()) f.sealed = false;
      else if (inside && fight) f.sealed = true;
      f.gate.open = !f.sealed;
      if (f.sealed) f.gate.lift = Math.max(0, f.gate.lift - dt / F.fogClose);
    }
    // Sightings: each waits, watches for `watch` s once the player is in its trigger, then walks off and is gone.
    for (const s of st.spectators) {
      if (s.state === 'gone') continue;
      if (s.state === 'wait' && p.alive() && inRect(s.def.trigger, p.x, p.z)) { s.state = 'watch'; s.t = 0; }
      s.t += dt;
      if (s.state === 'watch' && s.t >= s.def.watch) { s.state = 'leave'; s.t = 0; }
      if (s.state === 'leave' && s.t >= 3) { s.state = 'gone'; s.rig.dispose(); s.rig = null; s.halo.visible = false; }
    }
    // Perched enemies: grit falls and stone grinds while the player is near enough to be sprung on.
    for (const e of game.enemies) {
      if (e.behavior !== 'perch' || e.state !== ES.LURK || e.asleep) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d > e.notice + F.grit.range || Math.abs(e.y - p.y) > 6) continue;
      const t = (st.grit.get(e) || 0) - dt;
      if (t <= 0) {
        groundFx.puff(e.x, e.z, F.grit.dust, e.y, 0.4);
        for (let i = 0; i < 3; i++) ember(e.x + rand(-0.4, 0.4), e.y + 1.4, e.z + rand(-0.4, 0.4), 0x8a8270, -0.6, 0.9, 0.08);
        play('stoneGrind', { x: e.x, y: e.y + 1, z: e.z }, 0.7);
      }
      st.grit.set(e, t <= 0 ? F.grit.every : t);
    }
    // Aldric's retreat: the camera follows his leap onto the wall and over it, then lets go a moment after he is gone.
    const fleeing = game.enemies.find(e => isBoss(e) && (e.state === ES.RETREAT || (e.state === ES.GONE && e.stateTime < 0.8)));
    game.camFocus = fleeing ? { x: fleeing.x, y: fleeing.y, z: fleeing.z } : null;
    if (fleeing && game.lock) game.setLock(null);
    // The boss pulse while Aldric fights, quicker and hotter once he burns.
    const boss = game.enemies.find(e => isBoss(e) && e.alive() && (e.fightingPlayer() || e.state === ES.PHASE));
    if (boss && p.alive()) {
      st.pulse -= dt;
      if (st.pulse <= 0) { const hot = burning(boss); play(hot ? 'bossPulseHot' : 'bossPulse', null, 0.8); st.pulse = hot ? F.pulse.hot : F.pulse.calm; }
    } else st.pulse = 0.4;
    // The transition into the next phase: the room's timeline, once per transition, keyed to his clock.
    if (boss && boss.state === ES.PHASE && st.room) {
      if (!st.trans || st.trans.boss !== boss) st.trans = { boss, done: new Set() };
      F.timeline.forEach((ev, i) => { if (!st.trans.done.has(i) && boss.stateTime >= ev.at) { st.trans.done.add(i); act(ev, boss); } });
    }
    if (st.room) for (const P of st.room.pillars) if (P.t >= 0) P.t += dt;
    if (st.ending) updateEnding(game, dt);
  }
  // One beat of the transition. Drawn and heard only.
  function act(ev, boss) {
    const R = st.room, at = { x: boss.x, y: boss.y + 2, z: boss.z };
    if (ev.act === 'toll') { play('bellToll', null, 1); Game.addShake(0.6, 0.05); }
    else if (ev.act === 'shatter' && R) {
      play('glassShatter', null, 1);
      for (const w of R.windows) {
        w.mesh.visible = false;
        spawnBurst({ x: w.x, y: L.finaleRoom.y + 6.5, z: w.z - Math.sign(w.z) * 0.6 }, { color: w.color | 0x404040, count: 26, speed: 5 });
      }
      for (const P of R.pillars) P.mark.material.opacity = 0.35;   // mark where the pillars will land
    }
    else if (ev.act === 'pillar' && R && R.pillars[ev.i]) { R.pillars[ev.i].t = 0; play('stoneFall', { x: R.pillars[ev.i].x, y: L.finaleRoom.y + 4, z: R.pillars[ev.i].z }, 1); }
    else if (ev.act === 'ignite') { play('fireRoar', at, 1); spawnBurst(at, { color: 0xff7a28, count: 40, speed: 7 }); Game.addShake(0.5, 0.08); }
    else if (ev.act === 'roar') { play('fireRoar', null, 0.9); if (R) for (const P of R.pillars) P.mark.material.opacity = 0; }
  }
  // Back at the bonfire after a death: the throne room is whole again for the next attempt.
  function restoreRoom() {
    if (st && st.fog) { st.fog.sealed = false; st.fog.gate.open = true; }   // the way back in is open again
    if (!st || !st.room) return;
    const R = st.room;
    for (const w of R.windows) w.mesh.visible = true;
    for (const P of R.pillars) { P.t = -1; P.pivot.rotation.set(0, 0, 0); P.mark.material.opacity = 0; }
    st.trans = null;
  }

  // ---- drawing, every frame -------------------------------------------------------------------------------------
  const tmp = new V3();
  function render(game, placed) {
    const dt = 1 / 60, t = performance.now() / 1000;
    // Any boss that burns (a phase with `ignite`), in a level or a duel: glowing armour, embers on the blade and off him.
    for (const [e] of placed) {
      if (!isBoss(e) || !e.rig || e.asleep) continue;
      const hot = burning(e) && e.alive();
      if (e.rig.embers) e.rig.embers.visible = hot;
      if (!hot) continue;
      const G = F.glow, k = G.base + G.pulse * Math.sin(t * G.rate);
      for (const m of e.rig.bodyMats) m.emissive.r += ((G.color >> 16) & 255) / 255 * k, m.emissive.g += ((G.color >> 8) & 255) / 255 * k, m.emissive.b += (G.color & 255) / 255 * k;
      // Modern presets already supply pooled ignition embers; avoid creating duplicate sprite roots during combat.
      if (!visuals.quality().combatFx) {
        if (Math.random() < F.embers * dt) ember(e.x + rand(-0.6, 0.6), e.y + rand(0.6, 2.8), e.z + rand(-0.6, 0.6));
        if (e.rig.weapon && Math.random() < F.embers * 0.5 * dt) { e.rig.weapon.getWorldPosition(tmp); ember(tmp.x, tmp.y, tmp.z, 0xffa040, 1.2, 0.9, 0.16); }
      }
    }
    for (const s of sprites) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) { s.mesh.visible = false; continue; }
      s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt;
      s.mesh.material.opacity = 0.9 * clamp(s.life / s.max, 0, 1);
    }
    for (const r of rings) {
      if (!r.mesh.visible) continue;
      r.t += dt;
      const k = clamp(r.t / r.time, 0, 1), rad = lerp(r.from, r.to, k);
      r.mesh.scale.set(rad + 0.6, rad + 0.6, 1); r.mesh.material.opacity = 0.95 * (1 - clamp((r.t - r.time) / 0.5, 0, 1));
      if (r.t >= r.time + 0.5) r.mesh.visible = false;
    }
    if (!st) return;
    // The retreating boss stands against a glow of firelight, so the camera's subject reads against the dark walls.
    const fl = game.enemies.find(e => isBoss(e) && e.state === ES.RETREAT);
    if (fl && !st.fleeHalo) { st.fleeHalo = glowSprite(0xff9a50, 1.6, 7, 0.45, null); group.add(st.fleeHalo); }
    if (st.fleeHalo) { st.fleeHalo.visible = !!fl; if (fl) st.fleeHalo.position.set(fl.x + 1, fl.y + 2.4, fl.z); }
    // Sightings and corpses.
    for (const s of st.spectators) {
      if (!s.rig) continue;
      const D = s.def, r = s.rig, leaving = s.state === 'leave', k = leaving ? clamp(s.t / 3, 0, 1) : 0;
      const x = D.x + D.leave[0] * k, z = D.z + D.leave[1] * k, p = game.player;
      const yaw = leaving ? Math.atan2(D.leave[0], D.leave[1]) : s.state === 'watch' ? Math.atan2(p.x - x, p.z - z) : D.yaw;
      r.reset(); r.setOpacity(1 - clamp((k - 0.6) / 0.4, 0, 1));
      if (leaving) { s.phase += dt * 4; r.walk(s.phase, 0.5); }
      else { r.head.rotation.x = s.state === 'watch' ? 0.15 : 0; r.armR.rotation.x = -0.3; r.weapon.rotation.x = 1.2; }
      r.place(x, D.y, z, yaw, D.y); r.shadow.visible = false;
      s.halo.material.opacity = 0.4 * (1 - k);
    }
    for (const c of st.corpses) {
      const r = c.rig; r.reset(); r.setOpacity(1); r.tip.rotation.x = -Math.PI / 2; r.armL.rotation.x = -0.4; r.armR.rotation.x = 0.6; r.legL.rotation.x = 0.3;
      r.place(c.def.x, c.y, c.def.z, c.def.yaw, c.y);
    }
    if (st.fog) {
      const zone = game.zones.find(z => z.id === st.fog.zoneId);
      st.fog.plane.visible = !zone.gate.open;
      st.fog.plane.material.opacity = 0.28 + 0.08 * Math.sin(t * 1.7);
    }
    const R = st.room;
    if (R) {
      const boss = game.enemies.find(e => isBoss(e) && e.alive());
      const hot = boss && burning(boss), heat = hot ? 1 : 0;
      R.light.intensity += (heat * F.roomLight - R.light.intensity) * 0.04;
      for (const f of R.fires) {
        f.sprite.material.opacity = 0.15 + heat * (0.55 + 0.15 * Math.sin(t * 9 + f.x));
        f.sprite.scale.setScalar(2.2 + heat * (2.6 + 0.4 * Math.sin(t * 7 + f.z)));
        if (hot && Math.random() < 6 * dt) ember(f.x + rand(-0.3, 0.3), L.finaleRoom.y + 3, f.z + rand(-0.3, 0.3), 0xff8a30, 2.4, 1.8, 0.2);
      }
      for (const P of R.pillars) {
        if (P.t < 0) continue;
        const k = clamp(P.t / F.pillarFall, 0, 1);
        P.pivot.rotation.z = -P.dir * (Math.PI / 2) * k * k;   // topples faster as it goes, along x
        if (k >= 1 && !P.landed) { P.landed = true; groundFx.puff(P.x + P.dir * 6, P.z, 26, L.finaleRoom.y, 1.6); Game.addShake(0.5, 0.1); }
        if (k < 1) P.landed = false;
      }
      R.halo.material.opacity = 0.4 + 0.1 * Math.sin(t * 1.3);
    }
    if (st.ending) renderEnding(game);
  }

  // ---- events ------------------------------------------------------------------------------------------------------
  events.on('bossRetreat', d => { Game.addShake(0.4, 0.06); play('postureBreak', { x: d.enemy.x, y: d.enemy.y + 1.5, z: d.enemy.z }, 1); });
  events.on('bossLeap', d => { groundFx.puff(d.enemy.x, d.enemy.z, 14, d.enemy.y, 1.2); if (burning(d.enemy)) spawnBurst({ x: d.enemy.x, y: d.enemy.y + 0.5, z: d.enemy.z }, { color: 0xff7a28, count: 18, speed: 5 }); });
  // He is gone over the wall: the gate gives way (it lifts as its zone is won), dust and a crash where it stands.
  events.on('bossGone', () => {
    if (!st) return;
    const z = Game.zones.find(q => q.actors.some(a => a.state === ES.GONE));
    if (!z) return;
    const g = z.gate;
    play('gateBreak', { x: g.x, y: g.y + 2, z: g.z }, 1);
    groundFx.puff(g.x, g.z, 30, g.y, 2); spawnBurst({ x: g.x, y: g.y + 2.5, z: g.z }, { color: 0x8a8070, count: 30, speed: 6 });
    Game.addShake(0.8, 0.12);
  });
  events.on('bossPhase', d => { Game.addShake(0.6, 0.08); spawnBurst({ x: d.enemy.x, y: d.enemy.y + 1.8, z: d.enemy.z }, { color: 0xffd090, count: 30, speed: 6 }); });
  // Every strike of a burning boss throws fire; a ring hit draws its ring of fire at exactly the hitbox's radius.
  events.on('attackPhase', d => {
    const e = d.actor;
    if (!isBoss(e) || d.phase !== PHASE.ACTIVE) return;
    const hit = d.attack.hits[d.hitIndex], ring = hit && hit.box && hit.box.ring;
    if (ring) fireRing(e.x, e.y, e.z, ring.from, ring.to, ring.time);
    if (burning(e) && e.rig && e.rig.weapon) { e.rig.weapon.getWorldPosition(tmp); spawnBurst({ x: tmp.x, y: tmp.y, z: tmp.z }, { color: 0xff8a30, count: 14, speed: 4 }); }
  });
  // The wind-up of a ring hit glows on the floor round him first: the telegraph for the rings.
  events.on('attackStart', d => {
    if (!isBoss(d.enemy)) return;
    if (d.attack.hits.some(h => h.box && h.box.ring)) groundFx.ring(d.enemy.x, d.enemy.z, 4, 0xff5a20, 0.7, d.enemy.y);
  });
  events.on('impact', d => { if (burning(d.enemy)) { groundFx.ring(d.x, d.z, d.fx.ring * 1.4, 0xff6a20, 0.8, d.y); spawnBurst({ x: d.x, y: d.y + 0.4, z: d.z }, { color: 0xff7a28, count: 24, speed: 6 }); } });
  // A burning boss's bolt is a wave of fire.
  events.on('shot', d => {
    const b = d.bolt, hot = burning(d.enemy);
    if (hot && !b.fire) { b.fire = glowSprite(0xff6a20, 2.4, 2.2, 0.9, null); b.mesh.add(b.fire); }
    if (b.fire) b.fire.visible = hot;
  });
  events.on('respawn', () => restoreRoom());
  // Aldric's last bar is gone: his death, then the ending.
  events.on('enemyDeath', d => {
    const e = d.enemy;
    if (!st || !isBoss(e) || !e.lastPhase() || !L.ending) return;
    st.ending = { boss: e, t: 0, stage: 0 };
    if (!onlineGame()) try { localStorage.setItem(storeKey(L.id), '1'); } catch (err) { /* private window: the flag is just not kept */ }
  });

  // ---- the ending ------------------------------------------------------------------------------------------------------
  // In the world first (the player keeps control): he staggers, sinks to his knees, rises with his arms flung out as
  // light and fire pour from the cracks, and breaks up into ash; the bell tolls once and falls silent; his blade stays
  // standing in the floor. Then the fade, the ending cards, the credits, and the way back to the title.
  function updateEnding(game, dt) {
    const E = st.ending, D = F.death;
    E.t += dt;
    const b = E.boss, at = { x: b.x, y: b.y + 1.6, z: b.z };
    if (E.stage === 0 && E.t >= D.stagger) { E.stage = 1; Game.addShake(0.4, 0.05); }
    if (E.stage === 1 && E.t >= D.kneel) { E.stage = 2; play('fireRoar', at, 1); spawnBurst(at, { color: 0xffe0a0, count: 50, speed: 8 }); Game.addShake(0.8, 0.1); }
    if (E.stage === 2 && E.t >= D.blaze) {
      E.stage = 3; play('bellToll', null, 1);
      const blade = new THREE.Group(); blade.position.set(b.x, b.y, b.z); blade.rotation.set(0.12, rand(0, 6), 0.08); group.add(blade);
      box(blade, 0.07, 1.7, 0.18, 0x8a8a8e, 0, 0.6, 0); box(blade, 0.6, 0.08, 0.1, 0x5a5048, 0, 1.45, 0); box(blade, 0.06, 0.4, 0.06, 0x4e4a44, 0, 1.7, 0);
    }
    if (E.stage === 3 && E.t >= D.fade) { E.stage = 4; $('fade').classList.add('show'); }
    if (E.stage === 4 && E.t >= D.overlay) { E.stage = 5; showEnding(); }
  }
  function renderEnding() {
    const E = st.ending, D = F.death, b = E.boss, r = b.rig, t = E.t;
    if (!r || E.stage >= 5) return;
    // Over the generic death pose: his own last moments.
    r.reset(); r.root.visible = true;
    const fade = clamp((t - D.blaze) / (D.fade - 1 - D.blaze), 0, 1);
    r.setOpacity(1 - fade);
    if (t < D.stagger) { const k = ease(t / D.stagger); r.lean(-0.35 * k); r.head.rotation.x = -0.4 * k; r.armR.rotation.x = -0.2; r.weapon.rotation.x = 0.4; }
    else if (t < D.kneel) { const k = ease((t - D.stagger) / (D.kneel - D.stagger)); r.kneel(k); r.lean(0.4 * k); r.head.rotation.x = 0.5 * k; r.armR.rotation.x = lerp(-0.2, 0.3, k); }
    else {
      const k = ease(clamp((t - D.kneel) / 1.2, 0, 1));
      r.kneel(1 - 0.5 * k); r.lean(lerp(0.4, -0.3, k)); r.head.rotation.x = lerp(0.5, -0.6, k);
      r.armL.rotation.z = 1.4 * k; r.armR.rotation.z = -1.4 * k; r.armL.rotation.x = r.armR.rotation.x = -0.4 * k;
      const glow = 0.6 + 1.6 * k;
      for (const m of r.bodyMats) { m.emissive.setRGB(1.0 * glow, 0.75 * glow, 0.45 * glow); }
      if (Math.random() < 0.9) for (let i = 0; i < 3; i++) {
        const a = t * 3 + i * 2.1, rr = 0.6 + (t - D.kneel) * 0.25;
        ember(b.x + Math.cos(a) * rr, b.y + rand(0.3, 2.6), b.z + Math.sin(a) * rr, i % 2 ? 0xffd8a0 : 0x8a8478, 1.8, 2.2, 0.2);
      }
    }
    if (r.weapon && t >= D.blaze) r.weapon.visible = false;   // the blade stays behind, standing in the floor
  }
  let overlay = null, overlayTimer = null, padLoop = 0, overlayCleanup = null;
  function hideEnding() {
    if (overlayCleanup) { overlayCleanup(); overlayCleanup = null; }
    if (overlay) overlay.remove();
    overlay = null; clearTimeout(overlayTimer); cancelAnimationFrame(padLoop);
  }
  function showEnding() {
    hideEnding();
    Game.mode = 'ending'; input.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    const E = F.ending;
    const online = onlineGame();
    const cards = (LORE.endings && LORE.endings[L.id]) || LORE.ending;   // the ending's words are data (js/data/lore.js, from LORE.md)
    // The credits: the road the level ends (its campaign's chapters), who walked beside you, who stood in the way.
    const road = story.owner(L.id) || story.campaigns[STORY.id], R = road.def;
    const credits = `<h2>THE ROAD</h2>${road.chapterIds().map(id => `<p>${road.levelName(id)}</p>`).join('')}
        <h2>WHO WALKED BESIDE YOU</h2><p>${R.credits.companion}</p>
        <h2>THOSE WHO STOOD IN THE WAY</h2>${R.credits.foes.map(f => `<p>${f}</p>`).join('')}`;
    overlay = document.createElement('div');
    overlay.id = 'ending';
    overlay.innerHTML = `<style>
      #ending { position: fixed; inset: 0; z-index: 20; background: #000; color: #c9b88a; font-family: Georgia, 'Times New Roman', serif;
        display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden; }
      #ending .card { position: absolute; left: 10%; right: 10%; font-size: clamp(18px, 2.6vw, 30px); line-height: 1.6; opacity: 0; transition: opacity 1.4s; }
      #ending .card.show { opacity: 1; }
      #ending .roll { position: absolute; left: 0; right: 0; top: 100%; letter-spacing: 2px; }
      #ending .roll h1 { font-size: clamp(28px, 4vw, 48px); letter-spacing: 10px; color: #d8c48e; font-weight: normal; margin: 0 0 40px; }
      #ending .roll h2 { font-size: 15px; letter-spacing: 6px; color: #8a7e62; font-weight: normal; margin: 48px 0 12px; }
      #ending .roll p { font-size: 18px; margin: 6px 0; color: #b8a87e; }
      #ending .thanks { position: absolute; left: 0; right: 0; top: 42%; font-size: clamp(24px, 3.4vw, 40px); letter-spacing: 8px; opacity: 0; transition: opacity 2s; }
      #ending .thanks.show { opacity: 1; }
      #ending .back { position: absolute; left: 0; right: 0; bottom: 14%; font-size: 16px; letter-spacing: 3px; color: #8a7e62; opacity: 0; transition: opacity 1.2s; }
      #ending .back.show { opacity: 1; }
      #ending button { margin-top: 14px; background: none; border: 1px solid #6a5e48; color: #c9b88a; font: inherit; letter-spacing: 3px; padding: 10px 26px; cursor: pointer; }
      #ending button:hover, #ending button:focus { border-color: #c9b88a; outline: none; }
    </style>` + cards.map(c => `<div class="card">${c}</div>`).join('') +
      `<div class="roll"><h1>COMBAT ARENA 3D</h1>
        ${credits}
        <h2>MADE BY</h2><p>Aleix</p><p>with Claude</p>
        <h2>BUILT WITH</h2><p>Three.js, and nothing to download</p></div>
      <div class="thanks">THANK YOU FOR PLAYING</div>
      <div class="back">Press any key to return to ${online ? 'the lobby' : 'the title'}<br><button type="button">${online ? 'Return to lobby' : 'Return to title'}</button></div>`;
    document.body.appendChild(overlay);
    const cardEls = [...overlay.querySelectorAll('.card')], roll = overlay.querySelector('.roll'), thanks = overlay.querySelector('.thanks'), back = overlay.querySelector('.back');
    let i = 0, canLeave = false;
    const nextCard = () => {
      cardEls.forEach((c, k) => c.classList.toggle('show', k === i));
      if (i < cardEls.length) { i++; overlayTimer = setTimeout(nextCard, E.card * 1000); return; }
      cardEls.forEach(c => c.classList.remove('show'));
      roll.style.transition = `transform ${E.credits}s linear`;
      requestAnimationFrame(() => { roll.style.transform = `translateY(-${window.innerHeight + roll.offsetHeight + 40}px)`; });
      overlayTimer = setTimeout(() => {
        thanks.classList.add('show');
        overlayTimer = setTimeout(() => { back.classList.add('show'); canLeave = true; back.querySelector('button').focus(); }, E.hold * 1000);
      }, E.credits * 1000);
    };
    nextCard();
    const leave = () => {
      if (!canLeave || !overlay) return;
      hideEnding();
      events.emit('endingDone');   // Story mode (js/story.js) marks the story complete and shows its own screen
      if (onlineGame()) { Game.mode = 'play'; $('fade').classList.remove('show'); multiplayer.show(); }
      else if (Game.mode === 'ending') { Game.reset(); Game.showMenu('main'); }
    };
    const onKey = ev => { if (canLeave) { ev.preventDefault(); ev.stopPropagation(); leave(); } };
    window.addEventListener('keydown', onKey, true); window.addEventListener('pointerdown', onKey, true);
    overlayCleanup = () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', onKey, true); };
    // A gamepad: any button once the way back shows.
    const pads = () => { padLoop = requestAnimationFrame(pads); if (!canLeave) return;
      for (const g of (navigator.getGamepads ? navigator.getGamepads() : [])) if (g && g.buttons.some(b => b.pressed)) { leave(); return; } };
    padLoop = requestAnimationFrame(pads);
  }

  // ---- developer tools (#dev) --------------------------------------------------------------------------------------
  // Start the level at a bonfire with the zones before it already won (dispersed enemies of won zones stay away).
  function jump(j) {
    const lvl = ALL_LEVELS.find(l => l.devJumps && l.devJumps.includes(j));
    Game.startLevel(lvl.id);
    for (const z of Game.zones) if (j.won.includes(z.id)) {
      z.gate.open = true; z.gate.lift = 1; z.beaten = true;
      for (const m of z.members) Game.cleared.add(Game.placementKey({ ...m, ...m.spawn }, z.id + '/'));   // as if rested past them
      for (const a of z.actors) a.rig.dispose();
      Game.enemies = Game.enemies.filter(e => !z.actors.includes(e)); z.actors = [];
    }
    Game.respawnEnemies();
    if (j.at) { const b = lvl.bonfires.find(q => q.id === j.at); Game.spawn = { ...b.spawn }; Game.spawnPlayer(); }
    if (st && j.seen) skipSightings(j.seen);   // a jump may name the sightings already passed
    else if (st) skipSightings(st.spectators.filter(s => j.won.includes('zone-hall') || (j.won.includes('zone-upper') && s.def.id === 'sighting-chapel')).map(s => s.def.id));
  }
  // Sightings already seen (Story mode saves them so Continue does not play them again), and putting them away.
  function seenSightings() { return st ? st.spectators.filter(s => s.state !== 'wait').map(s => s.def.id) : []; }
  function skipSightings(ids) {
    if (st) for (const s of st.spectators) if (ids.includes(s.def.id)) { s.state = 'gone'; s.halo.visible = false; if (s.rig) { s.rig.dispose(); s.rig = null; } }
  }
  function devItems() {
    if (!DEV) return [];
    return ALL_LEVELS.filter(l => l.devJumps).flatMap(l => l.devJumps.map(j => ({ name: j.name, desc: 'Developer jump. In game, F10 empties the current boss bar (phase change, retreat or death).', go: () => jump(j) })));
  }
  // F10: the boss in the fight loses its current bar at once.
  function depleteBoss() {
    const e = Game.enemies.find(q => isBoss(q) && q.alive() && !q.invulnerable() && q.fightingPlayer()) || Game.enemies.find(q => isBoss(q) && q.alive() && !q.invulnerable());
    if (e) e.deplete();
    return e || null;
  }
  if (DEV) window.addEventListener('keydown', ev => { if (ev.code === 'F10' && Game.mode === 'play') { ev.preventDefault(); depleteBoss(); } });

  Game.renderHooks.push(render);
  return {
    reset, update, devItems, jump, depleteBoss, seenSightings, skipSightings,
    updateOnline: (game, dt) => update(game, dt, true),
    cancelEnding() { if (st) st.ending = null; hideEnding(); $('fade').classList.remove('show'); },
    completed(id = 'final-castle') { try { return localStorage.getItem(storeKey(id)) === '1'; } catch (err) { return false; } },
    get state() { return st; },
  };
})();
