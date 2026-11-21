'use strict';
// The lobby's scene (pass 165, PLAN Later item 2: the cel style carried to the levels). While the lobby is open with no
// run on, the party stands in the duel arena among its Blender ruins against the sunset, one wanderer per player (up to
// CONFIG.VISUALS.lobbyScene.slots), drawn in the game's style between the lobby's columns; the camera drifts slowly
// (still with reduced motion). Drawing only: no world, no simulation, nothing sent. It reuses the arena's stage, so a
// Boss Rush started from here loads no second copy; a run that loads another level replaces it as any level does.
// boot.js calls `frame(dt)` on every frame the simulation is idle (menus); the scene draws only while `wanted()`.
const lobbyScene = (() => {
  let bodies = [], on = false, clock = 0, since = 0, cleared = true;
  const look = new THREE.Vector3();
  function wanted() {
    const L = CONFIG.VISUALS.lobbyScene;
    return typeof multiplayer !== 'undefined' && multiplayer.panelOpen && !Game.player && Game.mode === 'menu' && !(Game.loading > 0)
      && !Game.manualClock && innerWidth >= L.minWidth && !document.hidden;
  }
  function fit(n) {   // one body per party slot, the first (you) at the front, each facing the camera
    const L = CONFIG.VISUALS.lobbyScene, fx = Math.sin(L.facing), fz = Math.cos(L.facing);   // away from the camera
    while (bodies.length > n) bodies.pop().rig.dispose();
    while (bodies.length < n) {
      const k = bodies.length, [side, back] = L.slots[k];
      const x = L.at[0] - fz * side + fx * back, z = L.at[1] + fx * side + fz * back;
      const b = new Player(PLAYER_DEF, x, z, L.facing + Math.PI + (k ? (k & 1 ? 1 : -1) * L.turn : 0));
      b.lobbySeed = k * 1.7; bodies.push(b);
    }
  }
  function start() {
    on = true; clock = 0; since = Infinity; cleared = false;
    document.getElementById('publicLobby').dataset.scene = 'true';   // the lobby's veil opens between its columns
    loadStage(ARENA);   // the same stage a Boss Rush fight builds; a no-op when it stands already
    if (typeof lockMarker !== 'undefined') lockMarker.visible = false;
    visuals.clearMarks();   // the last fight's blood, rubble and effects stay with that fight
  }
  function stop() {
    on = false;
    document.getElementById('publicLobby').dataset.scene = 'false';
    for (const b of bodies) b.rig.dispose();
    bodies = [];
    if (!cleared) { renderer.setRenderTarget(null); renderer.clear(); cleared = true; }   // a menu over a bare canvas, not a frozen frame
  }
  function frame(dt) {
    if (!wanted()) { if (on) stop(); return; }
    if (!on) start();
    const L = CONFIG.VISUALS.lobbyScene;
    clock += dt; since += dt;
    if (since < 1 / L.fps) return;   // the lobby idles for minutes: a slow drift needs few frames
    const step = Math.min(since, 0.25); since = 0;
    fit(Math.max(1, Math.min(L.slots.length, multiplayer.partySize)));
    const t = performance.now() / 1000;
    const a = L.facing + (reducedMotion() ? 0 : Math.sin(clock * Math.PI * 2 / L.drift.period) * L.drift.angle);
    look.set(L.at[0], L.lookHeight, L.at[1]);
    camera.position.set(L.at[0] - Math.sin(a) * L.distance, L.height, L.at[1] - Math.cos(a) * L.distance);
    for (const b of bodies) {
      b.stateTime += step;
      b.rig.place(b.x, 0, b.z, b.yaw, 0);
      b.pose(b.stateTime, { t: t + b.lobbySeed, dt: step, yaw: b.yaw, px: camera.position.x, pz: camera.position.z });
    }
    if (camera.fov !== CONFIG.camera.fov) { camera.fov = CONFIG.camera.fov; camera.updateProjectionMatrix(); }
    camera.lookAt(look);
    for (let i = 0; i < flames.length; i++) {   // the fire's flicker, as Game.render draws it
      const f = flames[i], s = f.seed, k = Math.sin(t * 11 + s) * 0.45 + Math.sin(t * 23.7 + s * 1.3) * 0.25 + Math.sin(t * 5.3 + s * 0.7) * 0.35;
      if (f.light) f.light.intensity = f.base * (1 + k * 0.1);
      f.mesh.scale.set(1 + k * 0.08, 1 + k * 0.16, 1 + k * 0.08); f.mesh.rotation.y = t * 2;
    }
    visuals.render(Game, t, step);
  }
  return { frame, wanted, get active() { return on; }, get bodies() { return bodies.length; } };
})();
