'use strict';
// ============================================================================
// Boss v2 Simulation Engine: Stances, Timeline Tracks, Multi-Hitboxes & Synced World Hazards
// ============================================================================
// Deterministic 1/60 s simulation shared by browser, js/alone.js, and server/headless.cjs.
// Legacy v1 bosses are completely untouched; a boss opts in with `v2: true` in its ENEMY_DEFS entry.

const BossHazards = (() => {
  let seq = 0;
  let list = [];
  const strikeScratch = {
    attackId: 'hazard', air: false, riposte: false, rollOnly: true, shove: false,
    charge: 0, damage: 24, poise: 30, knock: 7, destined: false, heavy: true, hitstop: 0.06,
  };
  const fromScratch = { x: 0, z: 0 };

  function clear(ownerId = null) {
    if (ownerId == null) { list.length = 0; seq = 0; return; }
    list = list.filter(h => h.ownerId !== ownerId);
  }

  function spawn(owner, spec, target) {
    const yaw = spec.yaw ?? owner.yaw;
    let x = spec.x ?? owner.x, y = spec.y ?? owner.y, z = spec.z ?? owner.z;
    if (spec.at === 'target' && target) {
      x = target.x + (spec.ox || 0);
      y = target.y ?? owner.y;
      z = target.z + (spec.oz || 0);
    } else if (spec.fwd || spec.side) {
      const s = Math.sin(yaw), c = Math.cos(yaw);
      x += s * (spec.fwd || 0) + c * (spec.side || 0);
      z += c * (spec.fwd || 0) - s * (spec.side || 0);
    }
    const h = {
      id: `hz${++seq}`,
      ownerId: owner.netId || owner.key || owner.baseDef.id,
      kind: spec.kind || 'novaZone',
      style: spec.style || 'ember',
      x, y, z, yaw,
      tx: target ? target.x : x + Math.sin(yaw) * (spec.length || 8),
      tz: target ? target.z : z + Math.cos(yaw) * (spec.length || 8),
      radius: spec.radius ?? 2.2,
      length: spec.length ?? 7.5,
      age: 0,
      telegraph: spec.telegraph ?? 0.9,
      active: spec.active ?? 0.35,
      duration: spec.duration ?? ((spec.telegraph ?? 0.9) + (spec.active ?? 0.35) + 0.55),
      lockAt: spec.lockAt ?? 0.7,
      damage: spec.damage ?? 26,
      heavy: spec.heavy !== false,
      rollOnly: spec.rollOnly !== false,
      hit: new Set(),
      erupted: false,
    };
    list.push(h);
    events.emit('hazardSpawn', { hazard: h, owner });
    return h;
  }

  function overlaps(h, t) {
    if (!t || !t.alive || !t.alive() || h.hit.has(t)) return false;
    const r = t.radius || 0.4;
    if (h.kind === 'fissure') {
      const s = Math.sin(h.yaw), c = Math.cos(h.yaw);
      const x0 = h.x, z0 = h.z, x1 = h.x + s * h.length, z1 = h.z + c * h.length;
      const ax = x1 - x0, az = z1 - z0, len2 = ax * ax + az * az || 1;
      const k = clamp(((t.x - x0) * ax + (t.z - z0) * az) / len2, 0, 1);
      const px = x0 + ax * k, pz = z0 + az * k;
      return Math.hypot(t.x - px, t.z - pz) <= h.radius + r && t.y <= h.y + 2.8;
    }
    if (h.kind === 'beamAnchor') {
      const ax = h.tx - h.x, az = h.tz - h.z, len2 = ax * ax + az * az || 1;
      const k = clamp(((t.x - h.x) * ax + (t.z - h.z) * az) / len2, 0, 1);
      const px = h.x + ax * k, pz = h.z + az * k;
      return Math.hypot(t.x - px, t.z - pz) <= h.radius + r && t.y <= h.y + 3.2;
    }
    // novaZone (disc)
    return Math.hypot(t.x - h.x, t.z - h.z) <= h.radius + r && t.y <= h.y + 3.0;
  }

  function step(dt, targets, authoritative = true) {
    for (let i = list.length - 1; i >= 0; i--) {
      const h = list[i];
      h.age += dt;
      if (h.age >= h.duration) {
        list.splice(i, 1);
        continue;
      }
      if (!authoritative) continue;
      // Track target for beamAnchor before lockAt fraction of telegraph
      if (h.kind === 'beamAnchor' && h.age < h.telegraph * h.lockAt && targets && targets.length) {
        const tgt = targets.find(t => t && t.alive && t.alive());
        if (tgt) { h.tx = tgt.x; h.tz = tgt.z; }
      }
      const inActive = h.age >= h.telegraph && h.age < h.telegraph + h.active;
      if (inActive && !h.erupted) {
        h.erupted = true;
        events.emit('hazardErupt', { hazard: h });
      }
      if (!inActive || !targets) continue;
      for (const t of targets) {
        if (typeof t.takeHit !== 'function' || !overlaps(h, t)) continue;
        if (t.invulnerable && t.invulnerable()) {
          if (!h.hit.has(t)) {
            h.hit.add(t);
            events.emit('perfectDodge', { player: t, enemy: null, hazard: h });
            if (typeof t.openCounter === 'function') t.openCounter(CONFIG.parry.riposteTime, 'dodge', null);
          }
          continue;
        }
        h.hit.add(t);
        if (typeof t.takeHit === 'function') {
          strikeScratch.attackId = h.id;
          strikeScratch.damage = h.damage;
          strikeScratch.heavy = h.heavy;
          strikeScratch.rollOnly = h.rollOnly;
          fromScratch.x = h.x; fromScratch.z = h.z;
          t.takeHit(strikeScratch, fromScratch);
        }
      }
    }
  }

  function snapshot() {
    return list.map(h => ({
      id: h.id, o: h.ownerId, k: h.kind, st: h.style,
      x: h.x, y: h.y, z: h.z, yaw: h.yaw, tx: h.tx, tz: h.tz,
      r: h.radius, l: h.length, age: h.age, tel: h.telegraph, act: h.active, dur: h.duration,
      dmg: h.damage, hvy: h.heavy ? 1 : 0, ro: h.rollOnly ? 1 : 0, la: h.lockAt,
    }));
  }

  function applySnapshot(arr) {
    if ((!Array.isArray(arr) || !arr.length) && !list.length) return;
    if (!Array.isArray(arr) || !arr.length) { list.length = 0; return; }
    const seen = new Set();
    for (const s of arr) {
      seen.add(s.id);
      let h = list.find(x => x.id === s.id);
      if (!h) {
        h = {
          id: s.id, ownerId: s.o, kind: s.k, style: s.st || 'ember',
          x: s.x, y: s.y, z: s.z, yaw: s.yaw, tx: s.tx, tz: s.tz,
          radius: s.r, length: s.l, age: s.age, telegraph: s.tel, active: s.act, duration: s.dur,
          lockAt: s.la ?? 0.7, damage: s.dmg ?? 24, heavy: s.hvy !== 0, rollOnly: s.ro !== 0,
          hit: new Set(), erupted: s.age >= s.tel,
        };
        list.push(h);
        events.emit('hazardSpawn', { hazard: h, owner: null });
      } else {
        const wasTel = h.age < h.telegraph;
        h.x = s.x; h.y = s.y; h.z = s.z; h.yaw = s.yaw; h.tx = s.tx; h.tz = s.tz;
        h.age = s.age;
        if (wasTel && h.age >= h.telegraph && !h.erupted) {
          h.erupted = true;
          events.emit('hazardErupt', { hazard: h });
        }
      }
    }
    for (let i = list.length - 1; i >= 0; i--) if (!seen.has(list[i].id)) list.splice(i, 1);
  }

  return {
    get all() { return list; },
    clear, spawn, step, snapshot, applySnapshot,
  };
})();

const BossV2 = (() => {
  const DEFAULT_STANCE = { altitude: 0, speedMul: 1, orbit: 0 };

  function init(e) {
    if (!e.baseDef || !e.baseDef.v2) return;
    const stances = e.baseDef.stances || { ground: DEFAULT_STANCE };
    const first = e.baseDef.initialStance || Object.keys(stances)[0] || 'ground';
    e.v2 = {
      stance: first,
      stanceTime: 0,
      altitude: stances[first]?.altitude || 0,
      targetAlt: stances[first]?.altitude || 0,
      orbitDir: 1,
      attackT: 0,
      prevT: -1,
      firedCues: new Set(),
      firedSpawns: new Set(),
      extraHitboxes: [],
      extraMap: new Map(),
    };
  }

  function stanceDef(e) {
    if (!e.v2 || !e.baseDef.stances) return DEFAULT_STANCE;
    return e.baseDef.stances[e.v2.stance] || DEFAULT_STANCE;
  }

  function setStance(e, next) {
    if (!e.v2 || e.v2.stance === next) return;
    const prev = e.v2.stance;
    const def = e.baseDef.stances && e.baseDef.stances[next];
    if (!def) return;
    e.v2.stance = next;
    e.v2.stanceTime = 0;
    e.v2.targetAlt = def.altitude || 0;
    e.v2.orbitDir = Math.random() < 0.5 ? 1 : -1;
    events.emit('bossStance', { enemy: e, from: prev, to: next });
  }

  function stepStance(e, dt, target, dist) {
    if (!e.v2) return;
    e.v2.stanceTime += dt;
    const sd = stanceDef(e);
    // Smooth altitude transition (attacks can temporarily override via yCurve)
    if (e.state !== ES.WINDUP && e.state !== ES.ACTIVE) {
      e.v2.targetAlt = sd.altitude || 0;
    }
    const climbRate = sd.climbRate || 4.2;
    e.v2.altitude += (e.v2.targetAlt - e.v2.altitude) * Math.min(1, dt * climbRate);
    // Evaluate stance transitions during chase
    if (e.state === ES.CHASE && Array.isArray(sd.transitions)) {
      const hpFrac = e.hp / Math.max(1, e.def.hp);
      for (const tr of sd.transitions) {
        if (tr.minTime != null && e.v2.stanceTime < tr.minTime) continue;
        if (tr.hpBelow != null && hpFrac > tr.hpBelow) continue;
        if (tr.distMin != null && dist < tr.distMin) continue;
        if (tr.distMax != null && dist > tr.distMax) continue;
        if (tr.phase && e.def.phaseId !== tr.phase) continue;
        const rate = tr.chance ?? 1;
        if (tr.maxTime != null && e.v2.stanceTime >= tr.maxTime) { setStance(e, tr.to); break; }
        if (Math.random() < rate * dt) { setStance(e, tr.to); break; }
      }
    }
  }

  function filterAttacks(e, list) {
    if (!e.v2) return list;
    const st = e.v2.stance;
    const filtered = list.filter(a => !a.stances || a.stances.includes(st));
    return filtered.length ? filtered : list;
  }

  function onAttackStart(e) {
    if (!e.v2) return;
    e.v2.attackT = 0;
    e.v2.prevT = -1e-4;
    e.v2.firedCues.clear();
    e.v2.firedSpawns.clear();
    e.v2.extraHitboxes.length = 0;
    e.v2.extraMap.clear();
  }

  function clearAttack(e) {
    if (!e.v2) return;
    e.v2.extraHitboxes.length = 0;
    e.v2.extraMap.clear();
  }

  function onAttackEnd(e) {
    if (!e.v2) return;
    clearAttack(e);
    const nextStance = e.attack && e.attack.endStance;
    if (nextStance) setStance(e, nextStance);
  }

  function stepAttack(e, dt, target) {
    if (!e.v2 || !e.attack) return;
    const tl = e.attack.timeline;
    const prev = e.v2.attackT;
    const now = prev + dt;
    e.v2.prevT = prev;
    e.v2.attackT = now;
    if (!tl) return;

    // 1. Cues -> synced event stream
    if (Array.isArray(tl.cues)) {
      for (let i = 0; i < tl.cues.length; i++) {
        const c = tl.cues[i];
        if (!e.v2.firedCues.has(i) && now >= c.at) {
          e.v2.firedCues.add(i);
          events.emit('bossCue', { enemy: e, attack: e.attack, cue: c, cueIndex: i });
        }
      }
    }

    // 2. Spawns -> synced World Hazards or projectile volleys
    if (Array.isArray(tl.spawns)) {
      for (let i = 0; i < tl.spawns.length; i++) {
        const sp = tl.spawns[i];
        if (!e.v2.firedSpawns.has(i) && now >= sp.at) {
          e.v2.firedSpawns.add(i);
          if (sp.kind === 'hazard') {
            const count = sp.count || 1;
            const spread = sp.spread || 0;
            for (let k = 0; k < count; k++) {
              const frac = count > 1 ? (k / (count - 1) - 0.5) : 0;
              const angle = (sp.yawOffset || 0) + frac * spread;
              const spec = { ...sp.hazard, yaw: e.yaw + angle };
              if (sp.ringRadius && target) {
                const a = (k / count) * Math.PI * 2 + e.yaw;
                spec.at = null;
                spec.x = target.x + Math.sin(a) * sp.ringRadius;
                spec.z = target.z + Math.cos(a) * sp.ringRadius;
                spec.y = target.y ?? e.y;
              }
              BossHazards.spawn(e, spec, target);
            }
          } else if (sp.kind === 'volley' && typeof projectiles !== 'undefined' && projectiles.fire) {
            const projSpec = sp.projectile || { speed: 18, gravity: 0, size: 0.24 };
            const count = sp.count || 3, span = sp.spread || 0.45;
            const angles = Array.isArray(span) ? span : Array.from({ length: count }, (_, k) => (count > 1 ? k / (count - 1) - 0.5 : 0) * span);
            const tgt = target || {
              x: e.x + Math.sin(e.yaw) * 14,
              y: e.y,
              z: e.z + Math.cos(e.yaw) * 14,
              height: 1.8,
            };
            const projAttack = {
              ...e.attack,
              projectile: { ...projSpec, spread: angles },
              damage: sp.damage ?? e.attack.damage,
            };
            projectiles.fire(e, projAttack, tgt);
          }
        }
      }
    }

    // 3. Altitude / motion curve segments
    if (Array.isArray(tl.motion)) {
      for (const m of tl.motion) {
        if (now >= m.from && now <= m.to) {
          const p = clamp((now - m.from) / Math.max(0.001, m.to - m.from), 0, 1);
          if (m.altFrom != null && m.altTo != null) {
            e.v2.targetAlt = lerp(m.altFrom, m.altTo, p);
            e.v2.altitude = e.v2.targetAlt;
          }
          if (m.speed) {
            const dir = m.dir === 'back' ? -1 : m.dir === 'strafe' ? 0 : 1;
            const s = Math.sin(e.yaw), c = Math.cos(e.yaw);
            if (dir !== 0) { e.vx = s * m.speed * dir; e.vz = c * m.speed * dir; }
            else { e.vx = c * m.speed * e.v2.orbitDir; e.vz = -s * m.speed * e.v2.orbitDir; }
          }
        }
      }
    }

    // 4. Concurrent extra hitboxes (stored per-enemy in e.v2.extraMap, never mutating shared ENEMY_DEFS)
    e.v2.extraHitboxes.length = 0;
    if (Array.isArray(tl.extraHits)) {
      for (let i = 0; i < tl.extraHits.length; i++) {
        const eh = tl.extraHits[i];
        if (now >= eh.from && now <= eh.to) {
          let hb = e.v2.extraMap.get(i);
          if (!hb) {
            hb = new Hitbox(e, eh.box, makeStrike({ ...e.attack, damage: eh.damage ?? e.attack.damage, heavy: eh.heavy ?? e.attack.heavy, rollOnly: eh.rollOnly ?? e.attack.rollOnly }));
            e.v2.extraMap.set(i, hb);
          }
          e.v2.extraHitboxes.push(hb);
        }
      }
    }
  }

  return { init, stanceDef, setStance, stepStance, filterAttacks, onAttackStart, clearAttack, onAttackEnd, stepAttack };
})();
