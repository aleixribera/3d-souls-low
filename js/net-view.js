'use strict';
// ============================================================================
// The server's state put on bodies (drawing only)
// ============================================================================
// One place that turns a snapshot's enemy and a teammate's pose into what the renderer draws, shared by the online
// client (js/multiplayer.js) and the replay viewer (js/replay.js), so a replay looks exactly like the match.
// `ctx`: { self (this browser's player id, or null), bodyOf(id) (a player's body, or null) }.
// Boss Rush's fight as the HUD and the kill moment see it: the replay's while one plays, else the online run's.
const rushNow = () => (typeof replayView !== 'undefined' && replayView.rush) || (typeof multiplayer !== 'undefined' && multiplayer.rush) || null;
const netView = {
  // One enemy at `alpha` between snapshot values `s` and `q`; `since` s after `s` was taken (its clock runs on).
  enemy(e, s, q, alpha, since, ctx) {
    const priorState = e.state;
    if (e.phase !== s.phase && s.phase >= 0 && e.phaseIds && s.phase < e.phaseIds.length) e.enterPhase(s.phase);   // a stand-in (an old replay) has fewer
    e.x = lerp(s.x, q.x, alpha); e.y = lerp(s.y, q.y, alpha); e.z = lerp(s.z, q.z, alpha);
    e.yaw = s.yaw + angDiff(q.yaw, s.yaw) * alpha;
    e.state = s.state;
    e.stateTime = s.state === q.state && s.serial === q.serial && s.hitIndex === q.hitIndex
      ? lerp(s.stateTime, q.stateTime, alpha) : s.stateTime + Math.max(0, since);
    e.holdLeft = s.holdLeft; e.retreatHop = s.retreatHop; e.blinkLeft = s.blinkLeft;
    e.vx = s.vx; e.vy = s.vy; e.vz = s.vz;
    e.hp = s.hp; e.poise = s.poise; e.frozen = s.frozen || 0;
    if ((s.cracks || 0) !== e.cracks) {   // pass 100: the server's cracks; `by` the striker (this player, or another's id)
      e.cracks = s.cracks || 0; e.crack = e.cracks ? 1 : 0;
      events.emit('guardCrack', { enemy: e, cracks: e.cracks, by: s.crackBy && s.crackBy === ctx.self ? Game.player : s.crackBy ?? 'server' });
    }
    e.resonance = s.resonance || 0;   // pass 68 (the Bell Warden)
    e.mendPool = s.mend || 0;   // pass 75 (Aldric)
    if (s.learned) { e.learned.length = 0; e.learned.push(...s.learned); } else if (e.learned.length) e.learned.length = 0;   // pass 77 (the Antlered Hunger)
    // An attack id this release no longer has plays as no attack (an old replay), never as an error.
    e.attack = s.attack ? e.baseDef.attacks.find(x => x.id === s.attack) || null : null;
    if (s.attack && !e.attack && (e.state === ES.WINDUP || e.state === ES.ACTIVE || e.state === ES.RECOVER || e.state === ES.PARRIED)) e.state = ES.CHASE;
    e.hitIndex = s.hitIndex; e.netSerial = s.serial; e.attackNo = s.serial; e.netTarget = s.target; e.grounded = s.grounded;
    e.walkPhase = s.walkPhase; e.leaping = s.leaping; e.asleep = false;
    // A bolt's mark (pass 48): noted from the target the snapshot names, as the server notes it from the same body.
    const wh = e.state === ES.WINDUP && e.attack && e.attack.hits[e.hitIndex];
    if (wh && wh.bolt) e.noteBolt(s.lure || ctx.bodyOf(s.target));   // `lure`: a summon draws it
    if (e.netParried === s.serial && [ES.WINDUP, ES.ACTIVE].includes(s.state)) { e.state = ES.PARRIED; e.stateTime = 0; }
    const boxKey = `${s.serial}/${s.hitIndex}`;
    // Each cut is noted where it was first seen striking, hitbox or not, so that a later `echo` of it hangs there.
    if (e.state === ES.ACTIVE && e.attack && e.netCutKey !== boxKey) { e.netCutKey = boxKey; e.noteCut(); }
    if (s.hitbox && e.state === ES.ACTIVE && e.attack && e.netParried !== s.serial && e.netJoinSerial !== s.serial) {
      if (e.netBoxKey !== boxKey || !e.hitbox) {
        e.hitbox = e.makeHitbox(); e.netBoxKey = boxKey;   // notes where it stands for a later `echo` too
      }
    } else e.hitbox = null;
    if (e.state === ES.DEAD && priorState !== ES.DEAD && !e.rewarded) { e.rewarded = true; events.emit('enemyDeath', { enemy: e }); }
  },
  // A teammate's body between their poses `a` and `b` at `f`, `since` s after `a` (its clocks run on).
  body(p, a, b, f, since) {
    p.x = lerp(a.x, b.x, f); p.y = lerp(a.y, b.y, f); p.z = lerp(a.z, b.z, f); p.yaw = a.yaw + angDiff(b.yaw, a.yaw) * f;
    p.state = a.state; p.stateTime = a.stateTime + Math.max(0, since); p.hp = a.hp; p.attackT = a.attackT + (a.charge === 1 ? 0 : Math.max(0, since));
    p.attack = ArenaNet.own(PLAYER_DEF.moveset.attacks, a.attack) || null; p.charge = a.charge; p.chargeT = a.chargeT + (a.charge === 1 ? Math.max(0, since) : 0); p.walkPhase = lerp(a.walkPhase, b.walkPhase, f);
    p.vx = a.vx; p.vy = a.vy; p.vz = a.vz;
    p.usingItem = ITEMS.flask; p.landTime = a.landTime; p.stunTime = a.stunTime;
    p.activeAt = a.activeAt < 0 ? Infinity : a.activeAt;
    p.exec = a.execEnemy ? { enemy: Game.enemies.find(e => e.netId === a.execEnemy), aim: 0 } : null;
    if ([PS.ATTACK, PS.JUMP_ATTACK, PS.LAND, PS.EXECUTE].includes(p.state) && !p.attack) p.state = PS.IDLE;
  },
  // A legendary, anyone's (js/ability-fx.js draws it).
  ability(d, e, ctx) {
    if (!ArenaNet.own(ABILITY_BY_ID, d.power) || !d.v || typeof d.v !== 'object') return;
    const body = d.holder === ctx.self ? Game.player : ctx.bodyOf(d.holder);
    if (d.then === 'bloodMoon' && body === Game.player && ctx.self) { body.perk.moon = d.v.time; body.perk.moonV = d.v; }
    events.emit('abilityPower', { ...d, body, enemy: e });
  },
  // The events and bolts an enemy's sample carries: others' blows and parries, its own attacks' moments.
  events(sample, ctx) {
    for (const d of sample.events) {
      const e = Game.enemies.find(e => e.netId === d.enemy);
      if (d.type === 'strike' && d.player !== ctx.self && e) {
        const attacker = ctx.bodyOf(d.player);
        if (attacker) events.emit('strike', { ...d, attacker, player: attacker, target: e });
      // A teammate's parry names its body (or id), so camera feedback for the local player's own parries stays theirs.
      } else if (d.type === 'parry' && d.player !== ctx.self && e) events.emit('parry', { target: e, player: ctx.bodyOf(d.player) || d.player });
      else if (d.type === 'abilityPower' && e) netView.ability(d, e, ctx);
      if (['attackStart', 'attackPhase', 'bossPhase', 'bossRetreat', 'bossGone', 'enemyBlink'].includes(d.type) && e) {
        const attack = sample.value.attack ? e.baseDef.attacks.find(a => a.id === sample.value.attack) : e.attack;
        events.emit(d.type, { enemy: e, actor: e, attack, phase: PHASE.ACTIVE, hitIndex: d.hitIndex, seamless: d.seamless, out: d.out });
      } else if (d.type === 'impact') events.emit('impact', { ...d, enemy: e });
      else if (d.type === 'attackMarker' && e) {
        // Wire values: the attack by id from this enemy's own data, the marker index bounds-checked.
        const attack = e.baseDef.attacks.find(a => a.id === d.attackId) || e.def.attacks?.find(a => a.id === d.attackId);
        const marker = attack && Array.isArray(attack.markers) && Number.isInteger(d.marker) && d.marker >= 0 && d.marker < attack.markers.length ? attack.markers[d.marker] : null;
        if (marker) events.emit('attackMarker', { actor: e, attack, marker });
      }
    }
    for (const shot of sample.shots) {
      const e = Game.enemies.find(e => e.netId === shot.enemy), attack = e?.baseDef.attacks.find(a => a.id === shot.attack);
      if (e && attack) projectiles.fire(e, attack, shot.target);
    }
  },
};
