'use strict';
// ============================================================================
// Impact feel: camera shake by hit strength, the struck body's shudder during hit-pause, enemy weapon trails
// ============================================================================
// Listens to combat events and draws; it never changes the fight (the hit-pause itself is Game.hitstop).
const impactFx = (() => {
  const F = CONFIG.fx, trails = new Map(), spare = [];
  let struck = null, struckK = 0, made = 0, roster = null;
  events.on('strike', d => {
    if (d.blocked) return;
    const S = F.strikeShake, k = clamp((d.strike.damage - S.from) / (S.full - S.from), 0, 1);
    if (k > 0) Game.addShake(S.time, S.amp * k);
    struck = d.target; struckK = clamp(d.strike.damage / S.full, 0.35, 1);
  });
  const trailFor = e => {
    let t = trails.get(e);
    if (!t && (t = spare.pop() || (made < F.enemyTrail.trails && (made++, makeSwordTrail(F.enemyTrail.color, F.enemyTrail.opacity))))) trails.set(e, t);
    return t;
  };
  Game.renderHooks.push((game, placed) => {
    if (roster !== game.enemies) { roster = game.enemies; for (const t of trails.values()) { t.clear(); spare.push(t); } trails.clear(); struck = null; }
    for (const [b] of placed) {
      if (b === game.player) continue;
      const on = !visuals.quality().ultra && b.state === ES.ACTIVE && !!b.hitbox && !b.asleep;
      const t = on ? trailFor(b) : trails.get(b);
      if (!t) continue;
      t.update(on, b.rig);
      if (!on && !t.busy()) { trails.delete(b); spare.push(t); }
    }
    if (game.hitstop > 0 && struck && struck.alive()) {   // shudder in place while the world is frozen
      const J = F.hitJitter, a = J.amp * struckK * Math.sin(performance.now() / 1000 * J.rate);
      struck.rig.root.position.x += a * Math.cos(struck.yaw); struck.rig.root.position.z -= a * Math.sin(struck.yaw);
    } else struck = null;
  });
  return { trails };
})();
