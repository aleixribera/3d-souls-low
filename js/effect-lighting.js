'use strict';
// Shared shadowless lighting for emissive attacks and projectiles, including Low.
// A fixed pool keeps light counts stable while sources appear, move and disappear.
const effectLighting = (() => {
  const C = VIS.effectLight, tip = new THREE.Vector3(), color = new THREE.Color();
  const pool = Array.from({ length: Math.max(...Object.values(C.counts)) }, () => {
    const light = new THREE.PointLight(0xffffff, 0, C.range, 1);
    light.userData.effectLight = true; scene.add(light);
    return { light, key: null };
  });
  const storm = new THREE.DirectionalLight(0xffffff, 0);
  storm.position.fromArray(C.storm.direction); storm.userData.effectLight = true; scene.add(storm);
  const pulses = Array.from({ length: C.pulseSlots }, () => ({ x: 0, y: 0, z: 0, color: 0xffffff, intensity: 0, range: C.range }));
  let player = null;
  // Scratch reused every frame (nothing allocated per frame): unlit ambient lights nearest first, effect candidates.
  const idle = [], candidates = [], candidateSlots = [], selected = [];
  let sortAt = null;
  const byDistance = (a, b) => a.position.distanceToSquared(sortAt) - b.position.distanceToSquared(sortAt);
  const byScore = (a, b) => b.score - a.score;
  const reserved = () => C.counts[visuals.quality().label.toLowerCase()];
  function clear() {
    for (const s of pool) { s.light.intensity = 0; s.key = null; }
    for (const p of pulses) p.intensity = 0;
    storm.intensity = 0;
  }
  function quality() {
    clear();
    pool.forEach((s, i) => { s.light.visible = i < reserved(); });
    scene.traverse(o => { if (o.userData.legacyEffectLight) o.visible = false; });
  }
  function flash(at, tint, intensity, range = C.range) {
    const p = pulses.reduce((a, b) => a.intensity < b.intensity ? a : b);
    Object.assign(p, { x: at.x, y: at.y, z: at.z, color: tint, intensity, range });
  }
  visuals.hooks.stage.push(clear); visuals.hooks.quality.push(quality);
  // When the pool has no effect to draw, lend its slots back to nearby ambient sources.
  visuals.hooks.beforeDraw.push(() => {
    if (player !== Game.player) { clear(); player = Game.player; }
    if (!stage || !Game.player) return;
    // A culled level's fallbacks come from visuals (records { source, fade }); otherwise the unlit lights, nearest first.
    const fallbacks = stage.lightPool ? stage.lightFallbacks || idle : null;
    if (!fallbacks) {
      idle.length = 0; for (const l of visuals.lights()) if (!l.visible) idle.push(l);
      sortAt = Game.player; idle.sort(byDistance);
    }
    let i = 0;
    for (const s of pool) {
      if (!s.light.visible || s.key !== null) continue;
      const list = fallbacks || idle, entry = list[i++];
      if (!entry) { s.light.intensity = 0; continue; }
      const source = fallbacks ? entry.source : entry, fade = fallbacks ? entry.fade : 1;
      source.getWorldPosition(s.light.position); s.light.color.copy(source.color);
      s.light.intensity = source.intensity * fade; s.light.distance = source.distance; s.light.decay = source.decay;
    }
    idle.length = 0;
  });
  quality();
  events.on('enemyBlink', d => flash(d.enemy, FX_ELEMENTS.holy.glow, C.intensity));
  events.on('parry', d => { if (!visuals.quality().combatFx && Game.player) flash(d.player || Game.player, FX_ELEMENTS.holy.glow, C.intensity); });
  events.on('execution', d => { if (!visuals.quality().combatFx && d.at) flash(d.at, FX_ELEMENTS.fire.glow, C.intensity); });
  // An effect that wants light this frame, as a reused candidate record (scored by power and nearness to the player p;
  // a source already holding a slot is favoured, so lights do not flicker between near equals).
  function offer(p, key, at, tint, power, range = C.range) {
    const d = Math.hypot(at.x - p.x, at.y - p.y, at.z - p.z);
    if (d > C.maxDistance || power <= 0) return;
    let held = false;
    for (const s of pool) if (s.key === key) { held = true; break; }
    const c = candidateSlots[candidates.length] || (candidateSlots[candidates.length] = {});
    c.key = key; c.x = at.x; c.y = at.y + C.floor; c.z = at.z; c.color = tint; c.power = power; c.range = range;
    c.score = power / (1 + d) * (held ? C.sourceRetention : 1); c.used = false;
    candidates.push(c);
  }
  const ownOf = key => { for (const c of selected) if (c.key === key) return c; return null; };
  const firstFree = () => { for (const c of selected) if (!c.used) return c; return null; };
  Game.renderHooks.push(game => {
    const dt = Math.min(C.maxDt, effectSlots.real());   // the shared effect clock (one step a frame when stepped by hand)
    if (!game.player || game.mode === 'menu') { clear(); return; }
    if (player !== game.player) { clear(); player = game.player; }
    const p = game.player;
    candidates.length = 0;
    for (const pulse of pulses) {
      pulse.intensity *= Math.exp(-C.decay * dt);
      if (pulse.intensity < C.minPower) pulse.intensity = 0;
      offer(p, pulse, pulse, pulse.color, pulse.intensity, pulse.range);
    }
    for (const e of game.enemies) {
      if (!e.alive() || e.asleep || !e.rig.root.visible || !e.attack || (e.state !== ES.WINDUP && e.state !== ES.ACTIVE)) continue;
      const a = e.attack, hit = a.hits[e.hitIndex] || a.hits[0], look = ultraBoss.look(e);
      const element = a.breath ? 'fire' : a.sphere ? 'black' : a.spectral ? (a.spectral === 'aeonia' || a.spectral === 'phantom' ? 'rot' : 'holy') : look && look.name;
      if (!C.elements.includes(element)) continue;
      const power = C.intensity * (e.state === ES.ACTIVE ? C.active : C.windup + (1 - C.windup) * clamp(e.stateTime / hit.startup, 0, 1));
      const tint = FX_ELEMENTS[element].glow;
      if (e.rig.holySigil && e.rig.holySigil.g.visible) {
        e.rig.holySigil.g.getWorldPosition(tip); offer(p, e, tip, tint, power * C.sigil);
      } else if (a.breath || a.sphere) {
        const f = a.breath ? a.breath.len / 2 : a.sphere.fwd;
        tip.set(e.x + Math.sin(e.yaw) * f, e.y, e.z + Math.cos(e.yaw) * f);
        offer(p, e, tip, tint, power * C.breath);
      } else {
        e.rig.weapon.updateWorldMatrix(true, false); tip.set(0, 0, C.tip).applyMatrix4(e.rig.weapon.matrixWorld);
        offer(p, e, tip, tint, power);
      }
    }
    for (const bolt of projectiles.flying()) {
      const look = ultraBoss.look(bolt.owner), element = look && look.name;
      offer(p, bolt, bolt, element && FX_ELEMENTS[element] ? FX_ELEMENTS[element].glow : CONFIG.projectile.glow, C.intensity * C.projectile);
    }
    candidates.sort(byScore);
    selected.length = 0;
    for (let n = Math.min(reserved(), candidates.length), i = 0; i < n; i++) { candidates[i].used = false; selected.push(candidates[i]); }
    // Keep a moving source in the same light slot, even if its priority changes.
    for (const s of pool) {
      if (!s.light.visible) continue;
      const own = ownOf(s.key);
      if (own) own.used = true;
    }
    for (const s of pool) {
      if (!s.light.visible) continue;
      const source = ownOf(s.key) || firstFree();
      const k = 1 - Math.exp(-C.fade * dt);
      if (source) {
        source.used = true; s.key = source.key;
        s.light.position.set(source.x, source.y, source.z); s.light.distance = source.range;
        s.light.color.lerp(color.set(source.color), k); s.light.intensity += (source.power - s.light.intensity) * k;
      } else {
        s.light.intensity *= Math.exp(-C.decay * dt);
        if (s.light.intensity < C.minPower) { s.light.intensity = 0; s.key = null; }
      }
    }
    for (const c of candidates) c.key = c.color = null;   // the records keep no bodies or bolts past the frame
    candidates.length = selected.length = 0;
    const R = realms.state;
    storm.intensity = R && R.flash ? R.flash.intensity / C.storm.ambient * C.storm.intensity : 0;
    if (R && R.flash) storm.color.copy(R.flash.color);
  });
  return { flash, reserved, info: () => ({ reserved: reserved(), activeEffects: pool.filter(s => s.key !== null).length,
           lights: pool.map(s => ({ intensity: s.light.intensity, visible: s.light.visible, shadow: s.light.castShadow })), storm: storm.intensity }),
           get lights() { return pool.map(s => s.light); } };
})();
