'use strict';
// ============================================================================
// The showcase (js/showcase.js, js/data/showcase.js): every beat of its script still happens, live
// ============================================================================
// Loaded after tests/suite.js (only with #dev): `await __arena.tests.run('Showcase')`. The game changes under the
// script (bosses, timings, the player's moves); when a change stops a beat happening, this says which and why.
(function () {
  const A = window.__arena, { Game, CONFIG } = A, { sim, expect, test } = A.tests;
  const STEP = CONFIG.step;
  // The whole show stepped by hand, drawn every `drawEvery` frames; its report, and where both stood each second.
  function watch(drawEvery = 0) {
    const marks = [];
    let lost = 0;   // frames whose camera stood or looked nowhere (NaN)
    expect.ok(showcase.play({ manual: true, toMenu: false }), 'it starts');
    try {
      for (let n = 0; showcase.running && n < 60 * 40; n++) {
        if (n % 60 === 0) { const p = Game.player, e = Game.enemies[0]; marks.push([p.x, p.z, e.x, e.z, e.hp].map(v => Math.round(v * 100) / 100).join(',')); }
        showcase.frame(STEP, { render: drawEvery > 0 && n % drawEvery === 0 });
        const c = Game.cam; if (showcase.running && !Number.isFinite(c.pos.x + c.pos.y + c.pos.z + c.look.x + c.look.y + c.look.z)) lost++;
      }
    } finally { if (showcase.running) showcase.stop(); }
    return { report: showcase.report(), marks, lost };
  }
  test('Showcase: every beat of its script happens, live on its seed', () => {
    sim.begin();
    const { report, lost } = watch(20);
    expect.ok(lost === 0, `the camera was lost (NaN) for ${lost} frames`);
    expect.ok(report && !report.failed, `it ran to its end${report && report.error ? ': ' + report.error : ''}`);
    expect.near(report.time, SHOWCASE.length * 60 / SHOWCASE.bpm, 0.05, 'it lasts its length (s)');
    for (const b of report.beats)
      expect.ok(b.ok, `beat "${b.id}" did not happen: ${b.need.filter(n => !n.ok).map(n => n.what).join('; ')} (dodges ${b.dodges}, deflects ${b.parries} of ${b.hits} blows, hit ${b.hurt} times)`);
    // The show ends on the Finishing Blow (PLAN.md "The showcase"): the last beat's counter is the blow, and its cuts kill.
    const last = report.beats[report.beats.length - 1], wants = ['the counter was the Finishing Blow', 'its cuts were lethal', 'the boss fell'];
    expect.ok(wants.every(w => last.need.some(n => n.what === w && n.ok)), `the finale "${last.id}" is not a lethal Finishing Blow: ${last.need.map(n => `${n.what} ${n.ok}`).join('; ')}`);
  });
  test('Showcase: the same show every time, and nothing to press while it plays', () => {
    sim.begin();
    const first = watch().marks;
    sim.begin();
    expect.ok(showcase.play({ manual: true, toMenu: false, skippable: false }), 'it starts again, as a first showing');
    try {
      for (let n = 0; n < 90; n++) showcase.frame(STEP, { render: false });
      const was = Game.mode;
      for (const code of ['Escape', 'Enter', 'Space', 'KeyR', 'KeyP']) window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true }));
      Game.pause(false); showcase.pad(['PadStart', 'PadB']);
      expect.ok(showcase.running && Game.mode === was && $('menu').classList.contains('hidden'), 'no key, button, pause or restart stops a first showing');
      expect.ok(!showcase.skip() && showcase.running, 'nor can it be skipped');
      showcase.frame(STEP, { render: true });
      expect.ok(document.querySelector('#showcase .sc-skip').style.opacity === '0', 'a first showing shows no skip cap');
    } finally { showcase.stop(); }
    const second = watch().marks;
    expect.ok(first.length > 25 && first.join(';') === second.join(';'), `two runs differ: ${first.find((m, i) => m !== second[i])} / ${second.find((m, i) => m !== first[i])}`);
    Game.showMenu('main');
    expect.ok(Game.menuItems.some(it => it.name === 'Tutorial (Recommended)'), 'the title\'s Tutorial plays it again');
  });
  // Aleix (2026-11-21): skippable after the first showing; Esc skips, a small cap says so.
  test('Showcase: a later showing shows the skip cap and Esc ends it; a key brings the cap back', () => {
    sim.begin();
    expect.ok(showcase.play({ manual: true, toMenu: false }), 'it starts (skippable unless told otherwise)');
    const cap = document.querySelector('#showcase .sc-skip');
    try {
      expect.ok(showcase.skippable, 'it may be skipped');
      for (let n = 0; n < 60; n++) showcase.frame(STEP, { render: true });
      expect.ok(cap.style.opacity === '1' && /Skip/.test(cap.textContent) && /Esc/.test(cap.textContent), `the cap reads "Esc Skip" in its first seconds (${cap.style.opacity}, "${cap.textContent}")`);
      for (let n = 0; n < 60 * 5; n++) showcase.frame(STEP, { render: n % 30 === 0 });
      showcase.frame(STEP, { render: true });
      expect.ok(cap.style.opacity === '0', 'then it goes');
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', key: 'j', bubbles: true, cancelable: true }));
      showcase.frame(STEP, { render: true });
      expect.ok(showcase.running && cap.style.opacity === '1', 'another key brings it back, and skips nothing');
      let ended = 0;
      // Skipped in the fade to the second fight, its black up, so the test sees the black go.
      const B = 60 / SHOWCASE.bpm, black = document.querySelector('#showcase .sc-black'), cut = SHOWCASE.fights[1].from * B;
      while (showcase.running && showcase.time < cut - SHOWCASE.fade / 2) showcase.frame(STEP, { render: showcase.time > cut - 1 });
      expect.ok(Number(black.style.opacity) > 0.3, `in a fade, its black up (${black.style.opacity})`);
      let leaked = 0; const spy = ev => { if (ev.code === 'Escape') leaked++; };
      window.addEventListener('keydown', spy);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
      expect.ok(!showcase.running, 'Esc ends it at once');
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', repeat: true, bubbles: true, cancelable: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
      window.removeEventListener('keydown', spy);
      expect.ok(leaked === 0, 'the held Esc that skipped reaches nothing after it');
      expect.ok(showcase.report().skipped && !showcase.report().failed, 'the report says skipped, not failed');
      expect.ok(document.getElementById('showcase').classList.contains('hidden') && black.style.opacity === '0', 'its overlay and its black are gone');
      expect.ok(!$('hud').classList.contains('sc-hud'), 'the HUD is the game\'s own again');
      expect.ok(showcase.play({ manual: true, toMenu: false, onEnd: () => ended++ }), 'again');
      expect.ok(showcase.pad(['PadStart']) === true, 'the pad press that skips is used up, not passed to the menus');
      expect.ok(!showcase.running && ended === 1, 'a pad Start skips it too, and what follows it runs once');
    } finally { if (showcase.running) showcase.stop(); Game.showMenu('main'); }
  });
  // The player's view (Aleix 2026-11-21, pass 166): the game's own camera behind the player all the way, a fade to black
  // the only cut between two fights, each on its own ground; the "Showcase" tag up throughout; the game's name at the end.
  test('Showcase: the player\'s view, one cut per fight on its own ground, the Showcase tag, and the name at the end', () => {
    sim.begin();
    expect.ok(showcase.play({ manual: true, toMenu: false }), 'it starts');
    const B = 60 / SHOWCASE.bpm, F = SHOWCASE.fights, T = SHOWCASE.title.at * B, q = s => document.querySelector(`#showcase ${s}`);
    const black = q('.sc-black'), mark = q('.sc-mark'), tag = q('.sc-tag'), title = q('.sc-title');
    const cuts = [], grounds = [], names = [];
    let behind = 0, looked = 0, tagged = 0, drawn = 0;
    try {
      const was = Game.cam.pos.clone();
      for (let n = 0; showcase.running && showcase.time < T - SHOWCASE.fade && n < 60 * 40; n++) {
        const fight = showcase.time >= 0 ? F.filter(f => f.from * B <= showcase.time + 1e-6).length - 1 : 0;
        // Drawn every quarter second, and every frame round a fight's start (the overlay is written as it is drawn).
        showcase.frame(STEP, { render: n % 15 === 0 || F.some(f => Math.abs(showcase.time + STEP - f.from * B) < 0.2) });
        const c = Game.cam.pos, p = Game.player, e = Game.enemies[0];
        // A cut: the camera somewhere else from one step to the next (it follows the player smoothly otherwise).
        if (c.distanceTo(was) > 2.5) cuts.push({ at: showcase.time, black: Number(black.style.opacity) });
        was.copy(c);
        if (grounds.length <= fight && showcase.time > F[fight].from * B + 0.1) { grounds.push(Game.level.id); names.push($('eName').textContent); }
        if (n % 15 === 0) {
          drawn++;
          if (mark.style.opacity === '1' && tag.textContent === 'Showcase') tagged++;
          // Behind the player, looking past them at the boss: the lock-on camera's own place.
          const ax = p.x - c.x, az = p.z - c.z, bx = e.x - p.x, bz = e.z - p.z;
          looked++;
          if ((ax * bx + az * bz) / ((Math.hypot(ax, az) * Math.hypot(bx, bz)) || 1) > 0.2 && Math.hypot(ax, az) < 14) behind++;
        }
      }
      expect.ok(cuts.length === F.length - 1 && cuts.every(x => x.black > 0.95), `one cut into each fight after the first, under black: ${cuts.map(x => `${x.at.toFixed(2)}s black ${x.black}`).join(', ')}`);
      expect.ok(cuts.every((x, i) => Math.abs(x.at - F[i + 1].from * B) < 0.05), 'each on its fight\'s first beat');
      expect.ok(behind >= looked * 0.9, `the camera is behind the player, facing the boss (${behind} of ${looked} frames)`);
      expect.ok(tagged === drawn, `the Showcase tag is up in every frame before the title (${tagged} of ${drawn})`);
      for (let i = 0; i < F.length; i++) {
        const g = F[i].ground;
        if (g) expect.ok(grounds[i] === (g === 'arena' ? ARENA.id : g), `the fight from beat ${F[i].from} is on its own ground (${grounds[i]})`);
        // Its name or its phase's ("Gemini, the Eclipsed"), as the boss bar shows it in play.
        expect.ok(!!names[i] && names.indexOf(names[i]) === i, `the HUD names fight ${i + 1}'s boss, its own (${names.join(' / ')})`);
      }
      expect.ok(!$('hud').classList.contains('hidden') && $('hud').classList.contains('sc-hud'), 'the game\'s HUD is up, but for what speaks to a player');
      while (showcase.running && showcase.time < T + 1) showcase.frame(STEP, { render: showcase.time > T + 0.8 });
      expect.ok(black.style.opacity === '1' && mark.style.opacity === '0', `the title has the black to itself (${black.style.opacity}, ${mark.style.opacity})`);
      expect.ok(title.style.opacity === '1' && title.textContent === 'Combat Arena 3D', `the game's name ends it (${title.style.opacity}, "${title.textContent}")`);
    } finally { if (showcase.running) showcase.stop(); Game.showMenu('main'); }
  });
  // The show keeps the game's glare down (no white impact frames, a softer bloom) and gives it all back after, with the
  // Arena and the HUD.
  test('Showcase: its own light, and the Arena and the HUD given back', () => {
    sim.begin();
    const bloom = visuals.passes.bloom, was = bloom.strength;
    expect.ok(showcase.play({ manual: true, toMenu: false }), 'it starts');
    try {
      expect.ok(bloom.strength < was && impactFrame.hit(Game.player.x, Game.player.z) === false, 'a softer bloom and no white impact frame while it plays');
      for (let n = 0; n < 60 * 9; n++) showcase.frame(STEP, { render: false });
      expect.ok(Game.level !== ARENA, 'on a ground of its own');
    } finally { if (showcase.running) showcase.stop(); }
    expect.ok(bloom.strength === was && impactFrame.hit !== undefined && Game.level === ARENA, 'the bloom, the impact frames and the Arena come back');
    expect.ok(!$('hud').classList.contains('sc-hud'), 'and the HUD is the game\'s own');
    Game.showMenu('main');
  });
  // At launch (PLAN.md "The showcase"): each new version plays it, once in SHOWCASE.again hours at most, never into a run.
  test('Showcase: plays at launch on each new version, once a day at most, never into a run', () => {
    const key = showcase.seenKey, H = 3600 * 1000, t0 = Date.UTC(2026, 10, 15, 9), day = SHOWCASE.again * H;
    let kept = null; try { kept = localStorage.getItem(key); } catch (e) { /* blocked: nothing to restore */ }
    const launch = (version, now, load = { played: false }) => showcase.claim({ version, now, load });
    try {
      Game.showMenu('main');
      localStorage.removeItem(key);
      expect.ok(launch('v1.0.0', t0) === 'first', 'a first launch plays it, as the first');
      expect.ok(!launch('v1.0.0', t0 + 2 * day), 'not again on the version it played for');
      expect.ok(!launch('v1.1.0', t0 + H) && !launch('v1.2.0', t0 + 12 * H) && !launch('v1.3.0', t0 + day - 1000), 'not twice in a day, however many versions come out');
      expect.ok(launch('v1.3.0', t0 + day + 1000), 'a version it has not played for, a day after it last played');
      expect.ok(JSON.parse(localStorage.getItem(key)).version === 'v1.3.0', 'the save keeps the version it played for');
      expect.ok(launch('v1.4.0', t0 + 2 * day + 2000) === 'update', 'and the next update the day after, as an update');
      expect.ok(launch('v1.4.1', t0) === 'update', 'a save from ahead of the clock (a clock set back) counts as long ago');
      localStorage.setItem(key, '1');
      expect.ok(launch('v1.5.0', t0), 'a player who saw it before (the old save) sees it on the next version');
      // A rejoin: the run is under way (or the lobby is open). It waits, the save untouched, and the next launch plays it.
      localStorage.setItem(key, JSON.stringify({ version: 'v1.5.0', at: t0 }));
      Game.startLevel('test-crowd');
      expect.ok(Game.mode !== 'menu' && !launch('v1.6.0', t0 + 3 * day), 'never into a run under way');
      expect.ok(JSON.parse(localStorage.getItem(key)).version === 'v1.5.0', 'that launch leaves the save as it was');
      Game.reset(); Game.showMenu('main');
      expect.ok(launch('v1.6.0', t0 + 3 * day), 'the next launch plays it');
      // Storage blocked: once per page load.
      const get = Storage.prototype.getItem;
      Storage.prototype.getItem = () => { throw new Error('blocked'); };
      try {
        const load = { played: false };
        expect.ok(launch('v2.0.0', t0, load) === 'update' && !launch('v2.1.0', t0 + 3 * day, load), 'storage blocked: once per page load, never taken for a new player');
      } finally { Storage.prototype.getItem = get; }
    } finally {
      try { if (kept === null) localStorage.removeItem(key); else localStorage.setItem(key, kept); } catch (e) { /* blocked */ }
      Game.reset(); Game.showMenu('main');
    }
  });
})();
