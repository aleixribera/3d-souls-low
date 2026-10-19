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
};
const PHASE_EASE_KEY = { [PHASE.STARTUP]: 'windup', [PHASE.ACTIVE]: 'active', [PHASE.FOLLOW]: 'follow', [PHASE.RECOVERY]: 'recovery' };
const MARKER_PHASES = ['windup', 'active', 'follow', 'recovery'];
const MARKER_EVENTS = ['sound', 'shake', 'glint'];

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

// Draw side: the blended key pose at time tt into the attack. Bones the rig lacks (a box body has no chest or elbows)
// are skipped. Returns the blade glint strength (0..1) from `glint` markers.
// charge: 0..1 of a held heavy; the pose's `charge` key pose is added that much through the wind-up and unwinds
// through the strike. fromPose: where a chained attack's first wind-up starts (the previous swing's last key pose).
function poseAttackKeys(rig, a, tt, charge = 0, fromPose = null) {
  const P = ATTACK_POSES[a.pose], S = POSE_SETTINGS, tl = attackTimeline(a, tt), i = tl.hitIndex, H = P.hits;
  const after = h => h.follow || h.strike;   // where a hit leaves the body
  let from, to;
  if (tl.phase === PHASE.STARTUP) { from = i ? after(H[i - 1]) : fromPose; to = H[i].windup; }
  else if (tl.phase === PHASE.ACTIVE) { from = H[i].windup; to = H[i].strike; }
  else if (tl.phase === PHASE.FOLLOW) { from = H[i].strike; to = H[i].follow; }
  else { from = after(H[H.length - 1]); to = null; }
  const ease = EASE[(P.ease && P.ease[PHASE_EASE_KEY[tl.phase]]) || S.ease[PHASE_EASE_KEY[tl.phase]]];
  const lagOf = name => (P.lag && P.lag[name]) ?? S.lag[name] ?? 0;
  const at = name => { const lag = lagOf(name); return ease(clamp((clamp(tl.p, 0, 1) - lag) / (1 - lag), 0, 1)); };
  const sc = a.poseScale ?? 1;   // bigger bodies (bosses) exaggerate the same key poses
  const val = (pose, name) => pose && pose[name];
  const cw = !P.charge || charge <= 0 ? 0 : tl.phase === PHASE.STARTUP ? charge : tl.phase === PHASE.ACTIVE ? charge * (1 - at('chest')) : 0;
  const names = new Set([...Object.keys(from || {}), ...Object.keys(to || {}), ...(cw ? Object.keys(P.charge) : [])]);
  let crouch = 0, lean = 0;
  for (const name of names) {
    const f = val(from, name), g = val(to, name), k = at(name), c = cw ? val(P.charge, name) : null;
    if (name === 'crouch' || name === 'lean') {
      const v = (lerp(f || 0, g || 0, k) + (c || 0) * cw) * sc;
      if (name === 'crouch') crouch = v; else lean = v;
      continue;
    }
    const bone = rig.bones ? rig.bones[name] : rig[name];
    if (!bone) continue;
    const fz = f || [0, 0, 0], gz = g || [0, 0, 0], cz = c || [0, 0, 0];
    // Returning to guard from past a full turn (a spin) takes the short way round.
    const fy = to === null ? angDiff(fz[1], 0) : fz[1];
    bone.rotation.x += (lerp(fz[0], gz[0], k) + cz[0] * cw) * sc; bone.rotation.y += (lerp(fy, gz[1], k) + cz[1] * cw) * sc; bone.rotation.z += (lerp(fz[2], gz[2], k) + cz[2] * cw) * sc;
  }
  if (crouch > 0) rig.crouch(crouch);
  if (lean) rig.lean(lean);
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
      for (const k of Object.values({ ...POSE_SETTINGS.ease, ...(P.ease || {}) })) need(k in EASE, `${tag}: pose "${a.pose}" uses unknown easing "${k}" (known: ${Object.keys(EASE).join(', ')}).`);
    }
  }
  if ('poseScale' in a) need(num(a.poseScale) && a.poseScale > 0, `${tag}: poseScale must be a number above 0.`);
  need(a.hits.every(h => !('hold' in h) || (h.hold && num(h.hold.at) && h.hold.at > 0 && h.hold.at < 1 && Array.isArray(h.hold.time)
    && num(h.hold.time[0]) && num(h.hold.time[1]) && h.hold.time[0] <= h.hold.time[1] && num(h.hold.chance))),
    `${tag}: a hit's hold needs at (0 to 1 of its wind-up), time [min, max] (s) and chance (0 to 1).`);
  if ('tracking' in a) need(a.tracking && num(a.tracking.rate) && a.tracking.rate > 0 && num(a.tracking.commit) && a.tracking.commit >= 0 && a.tracking.commit <= 1,
    `${tag}: tracking needs rate (rad/s) and commit (0 to 1: the share of the wind-up spent turning before it locks).`);
  if (a.markers && a.markers.some(m => m && m.parry)) need(canParryAttack(a), `${tag}: a parry glint on an attack that cannot be parried.`);
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
