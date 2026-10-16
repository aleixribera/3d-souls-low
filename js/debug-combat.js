'use strict';
// Developer-only combat debugging (open the game with #dev). Draws only; never changes the fight.
//   F6  slow motion (CONFIG.debug.slowMo of normal speed)
//   F7  a light over each attacking enemy: yellow while it still turns to follow you, red once it has committed;
//       also names the player's current attack phase in the corner
//   H   hitboxes (any build): yellow = yours, red = enemies', green = bodies
const combatDebug = (() => {
  const S = { slow: false, track: false };
  const geo = new THREE.SphereGeometry(0.16, 10, 8), lights = [];
  const label = document.createElement('div');
  label.style.cssText = 'position:fixed;left:12px;top:12px;z-index:50;font:600 13px/1.5 monospace;color:#ffe9a0;'
    + 'background:rgba(0,0,0,0.55);padding:4px 8px;border-radius:4px;pointer-events:none;white-space:pre;display:none';
  document.body.appendChild(label);
  const YELLOW = 0xffd23a, RED = 0xff2a1a;
  const PHASE_NAMES = { [PHASE.STARTUP]: 'WIND-UP', [PHASE.ACTIVE]: 'ACTIVE', [PHASE.FOLLOW]: 'FOLLOW-THROUGH', [PHASE.RECOVERY]: 'RECOVERY' };

  function render(game, placed) {
    let n = 0;
    if (S.track) for (const [b, q] of placed) {
      if (b === game.player || !b.alive() || b.asleep || (b.state !== ES.WINDUP && b.state !== ES.ACTIVE)) continue;
      const m = lights[n] || (lights[n] = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ depthTest: false, transparent: true })));
      if (!m.parent) scene.add(m);
      m.renderOrder = 999; m.visible = true; n++;
      m.material.color.setHex(b.isTracking() ? YELLOW : RED);
      m.position.set(q.x, q.y + b.height + 0.45, q.z);
    }
    for (let i = n; i < lights.length; i++) lights[i].visible = false;
    const lines = [];
    if (S.slow) lines.push(`SLOW MOTION ${Math.round(CONFIG.debug.slowMo * 100)}%  (F6)`);
    if (S.track) {
      const p = game.player;
      const tl = p && p.state === PS.ATTACK && p.attack ? attackTimeline(p.attack, p.stateTime) : null;
      lines.push('TRACKING: yellow = turning, red = committed  (F7)');
      lines.push(tl ? `you: ${p.attack.id} hit ${tl.hitIndex + 1} ${PHASE_NAMES[tl.phase]}${p.hitbox ? '  [HITBOX ON]' : ''}` : 'you: -');
    }
    label.textContent = lines.join('\n');
    label.style.display = lines.length ? 'block' : 'none';
  }
  Game.renderHooks.push(render);
  window.addEventListener('keydown', ev => {
    if (ev.code === 'F6') { ev.preventDefault(); S.slow = !S.slow; Game.timeScale = S.slow ? CONFIG.debug.slowMo : 1; }
    else if (ev.code === 'F7') { ev.preventDefault(); S.track = !S.track; }
  });
  return S;
})();
