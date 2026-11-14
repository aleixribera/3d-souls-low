// The frame-rate benchmark, run inside the game page (combat-arena-3d.html#dev, after window.__arenaReady). Not part of
// GAME_FILES: tools/bench/laptop-bench.mjs (Firefox on the laptop) and tools/bench/pc-bench.cjs (the stand-in on this
// PC) evaluate this file in the page, then call `__bench(opts)` and poll `__benchResult`.
//
// Each level is started for real; the player stands at its start and at its bonfires in turn, the camera turning a full
// circle, enemies frozen mid-idle (still drawn). Each fight is a live Practice duel with the boss attacking and the
// player unhurt (`execGrace`), so its effects fire. Frames are timed with requestAnimationFrame, which the drivers run
// unthrottled: mean fps is 1000 / the mean frame time, the 1% low is 1000 / the 99th-percentile frame time.
// opts: { levels: [id] | 'all', fights: [bossId], stations: 3, seconds: 5, fightSeconds: 8, warm: 1.5, allies: 0, set: {} }
(() => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (fn, ms = 120000) => { const end = performance.now() + ms; while (!fn()) { if (performance.now() > end) throw new Error('timed out'); await wait(100); } };
  const loaded = () => until(() => Game.player && Game.loading <= 0 && !Game.pendingLoad);
  // Frames over `ms`, with `each(k)` called every frame (k: 0..1 through the window).
  const frames = (ms, each) => new Promise(done => {
    const dts = [], info = renderer.info, auto = info.autoReset; let calls = 0, tris = 0, n = 0, last = performance.now();
    const t0 = last, end = t0 + ms;
    info.autoReset = false; info.reset();
    const tick = now => {
      dts.push(now - last); last = now; calls += info.render.calls; tris += info.render.triangles; n++; info.reset();
      if (each) try { each((now - t0) / ms); } catch (e) { /* keep timing */ }
      if (now < end) { requestAnimationFrame(tick); return; }
      info.autoReset = auto; done({ dts: dts.slice(1), calls: Math.round(calls / n), tris: Math.round(tris / n) });
    };
    requestAnimationFrame(tick);
  });
  const stats = runs => {
    const dts = runs.flatMap(r => r.dts).sort((a, b) => a - b);
    if (!dts.length) return null;
    const mean = dts.reduce((s, x) => s + x, 0) / dts.length, p99 = dts[Math.min(dts.length - 1, Math.floor(dts.length * 0.99))];
    return { fps: +(1000 / mean).toFixed(1), low1: +(1000 / p99).toFixed(1), meanMs: +mean.toFixed(2), p99Ms: +p99.toFixed(2),
             frames: dts.length, calls: Math.round(runs.reduce((s, r) => s + r.calls, 0) / runs.length),
             tris: Math.round(runs.reduce((s, r) => s + r.tris, 0) / runs.length) };
  };
  const freeze = () => { for (const o of Game.enemies || []) o.step = function (dt) { this.stateTime += dt; }; };
  const unhurt = () => { const p = Game.player; if (p) { p.execGrace = 99; p.hp = p.maxHp; } };
  const place = s => {
    const p = Game.player, y = world.groundAt(s.x, s.z, (s.y ?? p.y ?? 0) + 1.2);
    p.x = s.x; p.z = s.z; if (Number.isFinite(y)) p.y = y; p.vy = 0; if (s.yaw != null) p.yaw = s.yaw;
    if (Game.cam) Game.cam.yaw = p.yaw;
  };
  // opts.allies: more players in each fight (a four-player Boss Rush is 3), drawn as the lobby draws its remote players
  // (js/multiplayer.js: a Player body placed and posed each frame), circling the boss at a walk.
  const allies = [];
  const addAllies = (n, e) => { for (let i = 0; i < n; i++) allies.push(new Player(PLAYER_DEF, e.x, e.z + 4, Math.PI, Game.player.y)); };
  const poseAllies = (e, t) => allies.forEach((p, i) => {
    const a = (i + 1) * 2 * Math.PI / (allies.length + 1) + t * 0.5, x = e.x + Math.sin(a) * 4, z = e.z + Math.cos(a) * 4, y = world.groundAt(x, z, e.y + 1.2);
    p.x = x; p.z = z; if (Number.isFinite(y)) p.y = y; p.yaw = a + Math.PI; p.state = PS.WALK; p.stateTime = t; p.walkPhase = t * 8;
    p.rig.place(p.x, p.y, p.z, p.yaw, Number.isFinite(y) ? y : p.y);
    p.pose(t, { t, dt: CONFIG.step, yaw: p.yaw, px: Game.player.x, pz: Game.player.z });
  });
  const dropAllies = () => { for (const p of allies) p.rig.dispose(); allies.length = 0; };
  window.__bench = async (opts = {}) => {
    const o = { levels: 'all', fights: [], stations: 3, seconds: 5, fightSeconds: 8, warm: 1.5, allies: 0, ...opts };
    const out = { version: VERSION, quality: visuals.quality().label, size: [innerWidth, innerHeight], dpr: devicePixelRatio,
                  gpu: (() => { try { const gl = renderer.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { return '?'; } })(),
                  levels: {}, fights: {}, errors: [] };
    window.__benchResult = null; window.__benchProgress = 'start';
    // opts.set: { 'VISUALS.quality.normal.shadows': false, ... } CONFIG paths changed before measuring (an A/B of one
    // setting), then the preset re-applied so its hooks rebuild.
    if (o.set) {
      for (const [path, v] of Object.entries(o.set)) { const keys = path.split('.'), last = keys.pop(); keys.reduce((t, k) => t[k], CONFIG)[last] = v; }
      visuals.setQuality(Object.keys(CONFIG.VISUALS.quality).find(k => CONFIG.VISUALS.quality[k] === visuals.quality()));
      out.set = o.set;
    }
    document.getElementById('publicLobby')?.classList.add('hidden');
    const ids = o.levels === 'all' ? LEVELS.map(l => l.id) : o.levels;
    for (const id of ids) {
      try {
        window.__benchProgress = 'level ' + id;
        Game.startLevel(id); await loaded(); freeze(); await wait(o.warm * 1000);
        const L = Game.level, spots = [L.start, ...(L.bonfires || []).map(b => b.spawn || b)].filter(Boolean).slice(0, o.stations);
        const runs = [];
        for (const s of spots) {
          place(s); freeze(); await wait(600);
          const yaw0 = Game.cam ? Game.cam.yaw : 0;
          runs.push(await frames(o.seconds * 1000, k => { unhurt(); if (Game.cam) Game.cam.yaw = yaw0 + k * Math.PI * 2; }));
        }
        out.levels[id] = { ...stats(runs), stations: runs.map(r => stats([r]).fps) };
      } catch (e) { out.errors.push(id + ': ' + (e.message || e)); }
    }
    for (const id of o.fights) {
      try {
        window.__benchProgress = 'fight ' + id;
        Game.startFight(id); await loaded(); await wait(o.warm * 1000);
        const e = Game.enemies[0]; if (e) Game.setLock?.(e);
        if (e && o.allies) addAllies(o.allies, e);
        const t0 = performance.now() / 1000;
        out.fights[id] = stats([await frames(o.fightSeconds * 1000, () => { unhurt(); if (allies.length) poseAllies(e, performance.now() / 1000 - t0); })]);
      } catch (e) { out.errors.push(id + ': ' + (e.message || e)); }
      dropAllies();
    }
    try { const i = ultraPost.info(); out.post = { bufferSize: i.bufferSize, shadowSize: i.shadowSize, fxaa: visuals.passes.grade.uniforms.uFxaa.value, msaa: visuals.composer.renderTarget1.samples }; } catch (e) { /* older build */ }
    window.__benchProgress = 'done'; window.__benchResult = out;
    return out;
  };
  window.__benchReady = true;
})();
