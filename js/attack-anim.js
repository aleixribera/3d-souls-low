'use strict';
// ============================================================================
// Four-phase attack animation: key poses, easing, overlapping action and event markers
// ============================================================================
// An attack with `pose` (js/data/attack-poses.js) is drawn by blending its key poses along attackTimeline
// (js/character.js); the same timeline opens and closes the hitbox, so the blade and the damage always agree.
// Markers (`markers: [{ at, t, hit?, event, ... }]` on the attack) fire as `attackMarker` events when the timeline
// crosses them: `sound` (sound id, vel?), `shake` (time, amp), `glint` (drawn here as a blade flash; with `parry: true`
// it flashes as the parry window opens instead of at `at`/`t`).
// Every phase change also fires `attackPhase` {actor, attack, phase, hitIndex}.

// Easing curves, by name (0..1 -> 0..1).
const EASE = {
  linear: p => p,
  inQuad: p => p * p,
  outQuad: p => 1 - (1 - p) * (1 - p),
  inCubic: p => p * p * p,
  outCubic: p => 1 - Math.pow(1 - p, 3),
  inOutCubic: p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  inOutSine: p => -(Math.cos(Math.PI * p) - 1) / 2,
  outExpo: p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p),
  inBack: p => 2.2 * p * p * p - 1.2 * p * p,   // pulls back a little before going
  outBack: p => 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2),   // snaps past and settles back (the Puppet Knight's strings)
};
const PHASE_EASE_KEY = { [PHASE.STARTUP]: 'windup', [PHASE.ACTIVE]: 'active', [PHASE.FOLLOW]: 'follow', [PHASE.RECOVERY]: 'recovery' };
const MARKER_PHASES = ['windup', 'active', 'follow', 'recovery'];
const MARKER_EVENTS = ['sound', 'shake', 'glint'];
const POSE_BONES = ['tip', 'spin', 'chest', 'neck', 'head', 'armL', 'armR', 'elbowL', 'elbowR', 'legL', 'legR', 'kneeL', 'kneeR', 'weapon', 'haft'];   // what a key pose may name

const attackHasMarker = (a, event) => !!(a.markers && a.markers.some(m => m.event === event));

// Seconds from the start of the attack to where a phase of hit `i` begins, and how long it lasts.
function phaseSpan(a, at, i) {
  let t = 0;
  for (let k = 0; k < a.hits.length; k++) {
    const h = a.hits[k];
    if (k === i && at === 'windup') return [t, h.startup];
    t += h.startup;
    if (k === i && at === 'active') return [t, h.active];
    t += h.active;
    if (k === i && at === 'follow') return [t, h.follow || 0];
    t += h.follow || 0;
  }
  return [t, a.recovery];   // recovery
}
// The last key pose of an attack (where its follow-through leaves the body), or null for a legacy attack.
const attackEndPose = a => { const P = a && a.pose && ATTACK_POSES[a.pose]; if (!P) return null; const h = P.hits[a.hits.length - 1]; return h.follow || h.strike; };
// A `parry: true` glint flashes exactly as the parry window opens (CONFIG.parry.lead before its hit goes active).
const markerTime = (a, m) => {
  if (m.parry) return phaseSpan(a, 'active', m.hit ?? 0)[0] - CONFIG.parry.lead;
  const [t0, len] = phaseSpan(a, m.at, m.hit ?? 0); return t0 + len * (m.t ?? 0);
};

// Fixed-step side: announce phase changes and markers crossed between t0 and t1 (s into the attack).
function emitAttackEvents(actor, a, t0, t1) {
  const was = attackTimeline(a, t0), now = attackTimeline(a, t1);
  if (t0 <= 0 || was.phase !== now.phase || was.hitIndex !== now.hitIndex)
    events.emit('attackPhase', { actor, attack: a, phase: now.phase, hitIndex: now.hitIndex });
  if (!a.markers) return;
  for (const m of a.markers) {
    if (m.event === 'glint') continue;   // drawn, not announced
    const T = markerTime(a, m);
    if (T >= t0 && T < t1) events.emit('attackMarker', { actor, attack: a, marker: m });
  }
}

// One still key pose, weighted k (0..1), added onto the rig as poseAttackKeys adds its keys (pass 55: a boss's own
// `brokenPose`). `kneel` sets one knee down that far (Rig.kneel) before the rest is added.
function applyKeyPose(rig, pose, k) {
  if (pose.kneel) rig.kneel(pose.kneel * k);
  for (const name in pose) {
    if (name === 'kneel') continue;
    if (name === 'crouch' || name === 'lean') continue;
    const bone = rig.bones ? rig.bones[name] : rig[name], v = pose[name];
    if (bone) { bone.rotation.x += v[0] * k; bone.rotation.y += v[1] * k; bone.rotation.z += v[2] * k; }
  }
  if (pose.crouch > 0) rig.crouch(pose.crouch * k);
  if (pose.lean) rig.lean(pose.lean * k);
}

// In-between keys (pass 111, docs/bosses/system.md): a hit's `via: { windup | active | follow | recovery: [{ t, ...pose }] }`
// puts extra key poses inside a phase, at `t` (0..1 of the phase's eased progress), so a move can anticipate, overshoot
// and settle, or follow a captured motion (tools/motion/fit-poses.cjs) instead of one straight blend. The body passes
// through every key on a smooth curve (Catmull-Rom). A key that leaves a channel out keeps the straight blend there. A
// key with `rel: true` holds offsets from the straight blend instead: a captured motion's shape (its arcs, its dip before
// the rise) carried onto any two authored ends (tools/motion/via-keys.cjs).
// One channel of a pose: c -1 a scalar (crouch, lean), else that axis of a [x, y, z].
const poseCh = (pose, name, c) => { const v = pose && pose[name]; return v == null ? null : c < 0 ? v : v[c]; };
// Key j's value and time (-1 and keys.length are the phase's ends f and g). Module level: nothing allocated per frame.
function viaAt(keys, j, f, g, name, c) {
  if (j < 0) return f; if (j >= keys.length) return g;
  const K = keys[j], v = poseCh(K, name, c), s = lerp(f, g, K.t);
  return K.rel ? s + (v ?? 0) : v ?? s;
}
const viaT = (keys, j) => j < 0 ? 0 : j >= keys.length ? 1 : keys[j].t;
function viaValue(f, g, keys, name, c, k) {
  const n = keys.length;
  let i = 0; while (i < n && keys[i].t <= k) i++;   // keys[i - 1] .. keys[i] bracket k; -1 and n are the phase's ends
  const a = Math.max(-1, i - 2), b = i - 1, d = Math.min(n, i + 1);
  const ta = viaT(keys, a), tb = viaT(keys, b), tc = viaT(keys, i), td = viaT(keys, d), span = tc - tb;
  const p0 = viaAt(keys, a, f, g, name, c), p1 = viaAt(keys, b, f, g, name, c);
  const p2 = viaAt(keys, i, f, g, name, c), p3 = viaAt(keys, d, f, g, name, c);
  if (!(span > 0)) return p2;
  const u = (k - tb) / span, u2 = u * u, u3 = u2 * u;
  const m1 = tc > ta ? (p2 - p0) / (tc - ta) * span : 0, m2 = td > tb ? (p3 - p1) / (td - tb) * span : 0;   // tangents
  return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
}
// A phase's via: its own list of keys, or a POSE_LIBRARY entry's by name (js/data/pose-library.js).
const viaList = v => typeof v === 'string' ? POSE_LIBRARY[v] && POSE_LIBRARY[v].keys : v;
const VIA_NAMES = new WeakMap();   // the channels a via list names, found once per list
const viaNames = keys => { let n = VIA_NAMES.get(keys); if (!n) { n = [...new Set(keys.flatMap(q => Object.keys(q).filter(x => x !== 't' && x !== 'rel')))]; VIA_NAMES.set(keys, n); } return n; };

// Draw side: the blended key pose at time tt into the attack. Bones the rig lacks (a box body has no chest or elbows)
// are skipped. Returns the blade glint strength (0..1) from `glint` markers.
// charge: 0..1 of a held heavy; the pose's `charge` key pose is added that much through the wind-up and unwinds
// through the strike. fromPose: where a chained attack's first wind-up starts (the previous swing's last key pose).
// style: easings by phase that win over the pose's own (the player's, ANIM_SETTINGS.playerEase).
function poseAttackKeys(rig, a, tt, charge = 0, fromPose = null, style = null) {
  const P = ATTACK_POSES[a.pose], S = POSE_SETTINGS, tl = attackTimeline(a, tt), i = tl.hitIndex, H = P.hits;
  const after = h => h.follow || h.strike;   // where a hit leaves the body
  let from, to;
  if (tl.phase === PHASE.STARTUP) { from = i ? after(H[i - 1]) : fromPose; to = H[i].windup; }
  else if (tl.phase === PHASE.ACTIVE) { from = H[i].windup; to = H[i].strike; }
  else if (tl.phase === PHASE.FOLLOW) { from = H[i].strike; to = H[i].follow; }
  else { from = after(H[H.length - 1]); to = null; }
  const vh = tl.phase === PHASE.RECOVERY ? H[H.length - 1] : H[i], vph = PHASE_EASE_KEY[tl.phase];
  const vl = vh && vh.via && viaList(vh.via[vph]), via = vl && vl.length ? vl : null;   // in-between keys (viaValue)
  const blend = (f, g, k, name, c) => via ? viaValue(f, g, via, name, c, k) : lerp(f, g, k);
  const ph = PHASE_EASE_KEY[tl.phase], ease = EASE[(style && style[ph]) || (P.ease && P.ease[ph]) || S.ease[ph]];
  const lagOf = name => (P.lag && P.lag[name]) ?? S.lag[name] ?? 0;
  // A ground ring lives as long as it spreads; the blow that starts it lands in CONFIG.enemy.ringStrike s.
  const B = tl.phase === PHASE.ACTIVE && a.hits[i] ? a.hits[i].box || a.box : null;
  const p = B && B.ring ? Math.min(1, tl.p * a.hits[i].active / CONFIG.enemy.ringStrike) : tl.p;
  const at = name => { const lag = lagOf(name); return ease(clamp((clamp(p, 0, 1) - lag) / (1 - lag), 0, 1)); };
  const sc = a.poseScale ?? 1;   // bigger bodies (bosses) exaggerate the same key poses
  const val = (pose, name) => pose && pose[name];
  const cw = !P.charge || charge <= 0 ? 0 : tl.phase === PHASE.STARTUP ? charge : tl.phase === PHASE.ACTIVE ? charge * (1 - at('chest')) : 0;
  const names = new Set([...Object.keys(from || {}), ...Object.keys(to || {}), ...(cw ? Object.keys(P.charge) : []), ...(via ? viaNames(via) : [])]);
  let crouch = 0, lean = 0;
  for (const name of names) {
    const f = val(from, name), g = val(to, name), k = at(name), c = cw ? val(P.charge, name) : null;
    if (name === 'haft' || name === 'grip') continue;   // a two-handed haft's (below)
    if (name === 'crouch' || name === 'lean') {
      const v = (blend(f || 0, g || 0, k, name, -1) + (c || 0) * cw) * sc;
      if (name === 'crouch') crouch = v; else lean = v;
      continue;
    }
    const bone = rig.bones ? rig.bones[name] : rig[name];
    if (!bone) continue;
    const fz = f || [0, 0, 0], gz = g || [0, 0, 0], cz = c || [0, 0, 0];
    // Returning to guard from past a full turn (a spin) takes the short way round.
    const fy = to === null ? angDiff(fz[1], 0) : fz[1];
    bone.rotation.x += (blend(fz[0], gz[0], k, name, 0) + cz[0] * cw) * sc; bone.rotation.y += (blend(fy, gz[1], k, name, 1) + cz[1] * cw) * sc; bone.rotation.z += (blend(fz[2], gz[2], k, name, 2) + cz[2] * cw) * sc;
  }
  if (crouch > 0) rig.crouch(crouch);
  if (lean) rig.lean(lean);
  // A two-handed haft (a model's `grip`, pass 53; drawn by Rig.holdHaft): a key pose's `haft` [pitch, yaw, roll] is where
  // the haft points, in the chest's heading; `grip: false` lets the left hand go (it holds on otherwise). A missing
  // key pose (the guard before and after) is the model's rest: the haft at grip.rest, the left hand free.
  if (rig.grip) {
    const G = rig.grip, k = at('weapon'), hf = (from && from.haft) || G.rest, hg = (to && to.haft) || G.rest;
    for (let j = 0; j < 3; j++) rig.haftNow[j] = blend(hf[j], hg[j], k, 'haft', j);
    rig.gripW = lerp(from && from.grip !== false ? 1 : 0, to && to.grip !== false ? 1 : 0, k);
  }
  let glint = 0;
  if (a.markers) for (const m of a.markers) if (m.event === 'glint') {
    const d = Math.abs(tt - markerTime(a, m)) / (m.time ?? S.glintTime);
    glint = Math.max(glint, Math.pow(clamp(1 - d, 0, 1), 2));
  }
  return glint;
}

// Load-time checks for the optional four-phase fields of one attack (called from validateData).
function checkAttackAnim(a, tag, need) {
  const num = v => typeof v === 'number' && Number.isFinite(v);
  need(a.hits.every(h => !('follow' in h) || (num(h.follow) && h.follow >= 0)), `${tag}: a hit's follow must be a number of 0 or more (s).`);
  if ('pose' in a) {
    const P = ATTACK_POSES[a.pose];
    need(!!P, `${tag}: unknown pose "${a.pose}" (known: ${Object.keys(ATTACK_POSES).join(', ')}).`);
    if (P) {
      need(Array.isArray(P.hits) && P.hits.length >= a.hits.length && P.hits.every(h => h.windup && h.strike),
        `${tag}: pose "${a.pose}" needs { windup, strike } key poses for each of the attack's ${a.hits.length} hit(s).`);
      for (const h of P.hits || []) if ('via' in h) {   // in-between keys (pass 111)
        const ok = h.via && typeof h.via === 'object' && Object.keys(h.via).every(ph => MARKER_PHASES.includes(ph) && (Array.isArray(h.via[ph]) || typeof h.via[ph] === 'string'));
        need(ok, `${tag}: pose "${a.pose}": via must be { windup | active | follow | recovery: [{ t, ...key pose }] or a POSE_LIBRARY name }.`);
        if (ok) for (const ph in h.via) {
          const L = viaList(h.via[ph]);
          need(Array.isArray(L), `${tag}: pose "${a.pose}": via.${ph} names "${h.via[ph]}", not in POSE_LIBRARY (known: ${Object.keys(POSE_LIBRARY).join(', ')}).`);
          if (!Array.isArray(L)) continue;
          need(L.every((q, j) => q && num(q.t) && q.t > 0 && q.t < 1 && (!j || q.t > L[j - 1].t)), `${tag}: pose "${a.pose}": via.${ph} keys need t between 0 and 1, rising.`);
          for (const q of L) for (const [b, v] of Object.entries(q || {})) {
            if (b === 't') continue;
            if (b === 'rel') { need(v === true, `${tag}: pose "${a.pose}": via.${ph} rel can only be true (the key's values are offsets from the straight blend).`); continue; }
            if (b === 'crouch' || b === 'lean') need(num(v), `${tag}: pose "${a.pose}": via.${ph} ${b} must be a number.`);
            else need(POSE_BONES.includes(b) && Array.isArray(v) && v.length === 3 && v.every(num), `${tag}: pose "${a.pose}": via.${ph} key "${b}" must be a bone (${POSE_BONES.join(', ')}) as [x, y, z].`);
          }
        }
      }
      for (const h of P.hits || []) for (const q of [h.windup, h.strike, h.follow, ...Object.values(h.via || {}).map(viaList).filter(Array.isArray).flat()]) if (q) {   // a two-handed haft's keys (pass 53)
        if ('haft' in q) need(Array.isArray(q.haft) && q.haft.length === 3 && q.haft.every(num), `${tag}: pose "${a.pose}": haft must be [pitch, yaw, roll].`);
        if ('grip' in q) need(q.grip === false, `${tag}: pose "${a.pose}": grip can only be false (the left hand lets go of the haft).`);
      }
      for (const k of Object.values({ ...POSE_SETTINGS.ease, ...(P.ease || {}) })) need(k in EASE, `${tag}: pose "${a.pose}" uses unknown easing "${k}" (known: ${Object.keys(EASE).join(', ')}).`);
    }
  }
  if ('poseScale' in a) need(num(a.poseScale) && a.poseScale > 0, `${tag}: poseScale must be a number above 0.`);
  need(a.hits.every(h => !('hold' in h) || (h.hold && num(h.hold.at) && h.hold.at > 0 && h.hold.at < 1 && Array.isArray(h.hold.time)
    && num(h.hold.time[0]) && num(h.hold.time[1]) && h.hold.time[0] <= h.hold.time[1] && num(h.hold.chance))),
    `${tag}: a hit's hold needs at (0 to 1 of its wind-up), time [min, max] (s) and chance (0 to 1).`);
  need(a.hits.every(h => !h.hold || !('creep' in h.hold) || (num(h.hold.creep) && h.hold.creep > 0 && h.hold.creep < 1)),
    `${tag}: a hold's creep must be between 0 and 1 (the share of its pace the wind-up keeps while held).`);
  if ('tracking' in a) need(a.tracking && num(a.tracking.rate) && a.tracking.rate > 0 && num(a.tracking.commit) && a.tracking.commit >= 0 && a.tracking.commit <= 1,
    `${tag}: tracking needs rate (rad/s) and commit (0 to 1: the share of the wind-up spent turning before it locks).`);
  if (a.markers && a.markers.some(m => m && m.parry)) need(canParryAttack(a), `${tag}: a parry glint on an attack that cannot be parried.`);
  for (const m of a.markers || []) if (m && m.parry && Number.isInteger(m.hit ?? 0)) need(canParryHit(a, m.hit ?? 0), `${tag}: a parry glint on hit ${m.hit ?? 0}, which cannot be parried (pull, noParry, echo, erupt or bolt).`);
  if ('charge' in a) {
    const C = a.charge;
    need(C && ['at', 'hold', 'mul', 'hitstopMul'].every(k => num(C[k])) && C.at > 0 && C.at < 1 && C.hold > 0 && typeof C.action === 'string',
      `${tag}: charge needs action (the held input), at (0 to 1 of the wind-up), hold (s), mul and hitstopMul.`);
  }
  if ('markers' in a) {
    need(Array.isArray(a.markers), `${tag}: markers must be a list.`);
    for (const m of a.markers || []) {
      need(m && (m.parry || MARKER_PHASES.includes(m.at)), `${tag}: a marker's "at" must be one of ${MARKER_PHASES.join(', ')}.`);
      need(m && MARKER_EVENTS.includes(m.event), `${tag}: a marker's "event" must be one of ${MARKER_EVENTS.join(', ')}.`);
      need(m && (!('t' in m) || (num(m.t) && m.t >= 0 && m.t <= 1)), `${tag}: a marker's "t" must be 0 to 1 (through its phase).`);
      need(m && (!('hit' in m) || (Number.isInteger(m.hit) && m.hit >= 0 && m.hit < a.hits.length)), `${tag}: a marker's "hit" must be a hit index of the attack.`);
      if (m && m.event === 'sound') need(typeof m.sound === 'string' && m.sound in AUDIO.sounds, `${tag}: sound marker needs a known "sound" id.`);
      if (m && m.event === 'shake') need(num(m.time) && num(m.amp), `${tag}: shake marker needs time and amp.`);
    }
  }
}
