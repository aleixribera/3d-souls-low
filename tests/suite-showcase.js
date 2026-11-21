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
      // Skipped inside a card's freeze, its ink up, so the test sees the ink go.
      const B = 60 / SHOWCASE.bpm, fz = SHOWCASE.freezes.find(f => f.at * B > showcase.time);
      while (showcase.running && showcase.time < (fz.at + 0.5) * B) showcase.frame(STEP, { render: true });
      expect.ok(showcase.frozen && !document.getElementById('scDuo').classList.contains('hidden'), 'in a freeze, its ink up');
      let leaked = 0; const spy = ev => { if (ev.code === 'Escape') leaked++; };
      window.addEventListener('keydown', spy);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
      expect.ok(!showcase.running, 'Esc ends it at once');
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', repeat: true, bubbles: true, cancelable: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
      window.removeEventListener('keydown', spy);
      expect.ok(leaked === 0, 'the held Esc that skipped reaches nothing after it');
      expect.ok(document.querySelector('#showcase .sc-card').style.opacity === '0' && document.getElementById('scTint').classList.contains('hidden'), 'the card and the tint are gone');
      expect.ok(showcase.report().skipped && !showcase.report().failed, 'the report says skipped, not failed');
      expect.ok(document.getElementById('showcase').classList.contains('hidden') && document.getElementById('scDuo').classList.contains('hidden'), 'its ink is gone');
      expect.ok(showcase.play({ manual: true, toMenu: false, onEnd: () => ended++ }), 'again');
      expect.ok(showcase.pad(['PadStart']) === true, 'the pad press that skips is used up, not passed to the menus');
      expect.ok(!showcase.running && ended === 1, 'a pad Start skips it too, and what follows it runs once');
    } finally { if (showcase.running) showcase.stop(); Game.showMenu('main'); }
  });
  // The opening's freezes (pass 160): the game stands still while the show's clock, the camera and the card go on.
  test('Showcase: a freeze holds the game still, cards each boss in its ink, and the logo slams in on its own beat', () => {
    sim.begin();
    expect.ok(showcase.play({ manual: true, toMenu: false }), 'it starts');
    const B = 60 / SHOWCASE.bpm, card = document.querySelector('#showcase .sc-card'), seen = [];
    const words = [...(SHOWCASE.words || [])], field = document.querySelector('#showcase .sc-word'), word = document.querySelector('#showcase .sc-word span');
    try {
      for (const f of SHOWCASE.freezes) {
        // Pass 164: each kinetic word before this freeze covers the frame, read whole: edge to edge, inside the screen.
        while (words.length && words[0].at < f.at) {
          const w = words.shift();
          while (showcase.running && showcase.time < (w.at + w.for * 0.6) * B - 3 * STEP) showcase.frame(STEP, { render: false });
          for (let n = 0; n < 3; n++) showcase.frame(STEP, { render: true });
          const box = word.getBoundingClientRect();
          expect.ok(field.style.opacity === '1' && word.textContent === w.text, `the word "${w.text}" covers the frame at beat ${w.at} (${field.style.opacity}, "${word.textContent}")`);
          expect.ok(box.left >= 0 && box.right <= window.innerWidth + 1 && box.width > window.innerWidth * 0.6, `"${w.text}" is read whole, edge to edge (${Math.round(box.left)}-${Math.round(box.right)} of ${window.innerWidth})`);
        }
        if (f.card === 'title') {
          // Pass 164: the action is cut away to an empty ink frame from title.dark, and the logo lands on it alone.
          const T = SHOWCASE.title, ink = document.querySelector('#showcase .sc-ink'), logo = [...document.querySelectorAll('#showcase .sc-logo b')];
          while (showcase.running && showcase.time < (T.dark + 0.2) * B) showcase.frame(STEP, { render: showcase.time > (T.dark - 0.1) * B });
          const px = ink.getContext('2d').getImageData(4, Math.round(ink.height / 2), 1, 1).data;
          expect.ok(px[3] === 255 && px[0] < 30 && px[1] < 30 && px[2] < 30, `the frame is cut to ink before the title (${[...px]})`);
          expect.ok(logo.every(el => el.style.opacity === '0' || el.style.opacity === ''), 'and the logo is not up yet');
          while (showcase.running && showcase.time < (T.at + 1.5) * B) showcase.frame(STEP, { render: true });
          expect.ok(logo.every(el => el.style.opacity === '1'), `every part of the logo is up: ${logo.map(el => el.style.opacity)}`);
          expect.ok(card.style.opacity === '0' && document.getElementById('scDuo').classList.contains('hidden'), 'no boss card or duotone over it: the title has its own frame');
          seen.push(document.querySelector('#showcase .sc-logo').getAttribute('aria-label'));
          continue;
        }
        // Drawn across the freeze's first frames, where the drawn clock can lead the staging of the fight it opens.
        while (showcase.running && showcase.time < f.at * B - 3 * STEP) showcase.frame(STEP, { render: false });
        while (showcase.running && showcase.time < (f.at + 0.5) * B) showcase.frame(STEP, { render: true });
        const fight = SHOWCASE.fights.filter(x => x.from <= f.at + 1e-6).pop();
        expect.ok(card.textContent === ENEMY_BY_ID[fight.boss].name, `the card at beat ${f.at} names its own fight: ${card.textContent}`);
        if (fight.ground) expect.ok(Game.level.id === (fight.ground === 'arena' ? ARENA.id : fight.ground), `the fight at beat ${fight.from} is on its own ground (${Game.level.id})`);
        const p = Game.player, e = Game.enemies[0], at = [p.x, p.z, e.x, e.z, e.hp, e.stateTime].join(), cam = Game.cam.pos.clone();
        for (let n = 0; n < 20; n++) showcase.frame(STEP, { render: n === 19 });
        expect.ok(showcase.frozen && [p.x, p.z, e.x, e.z, e.hp, e.stateTime].join() === at, `the game stands still in the freeze at beat ${f.at}`);
        expect.ok(Game.cam.pos.distanceTo(cam) > 0.001, `the camera keeps moving through it (beat ${f.at})`);
        expect.ok(card.style.opacity === '1' && !document.getElementById('scDuo').classList.contains('hidden'), `the card and the ink are up at beat ${f.at}`);
        seen.push(card.textContent);
      }
    } finally { if (showcase.running) showcase.stop(); Game.showMenu('main'); }
    const names = SHOWCASE.fights.map(f => ENEMY_BY_ID[f.boss].name);
    expect.ok(names.every(n => seen.includes(n)) && seen[seen.length - 1] === 'Combat Arena 3D', `a card for every boss, then the title: ${seen.join(' / ')}`);
  });
  // Pass 164: slow motion runs the game at its ramp's speed while the show's clock runs on; the show keeps the game's
  // glare down (no white impact frames, a softer bloom) and gives it all back after, with the Arena.
  test('Showcase: slow motion, its own light, and the Arena given back', () => {
    sim.begin();
    const bloom = visuals.passes.bloom, was = bloom.strength;
    expect.ok(showcase.play({ manual: true, toMenu: false }), 'it starts');
    const B = 60 / SHOWCASE.bpm, r = SHOWCASE.ramps[0];
    try {
      expect.ok(bloom.strength < was && impactFrame.hit(Game.player.x, Game.player.z) === false, 'a softer bloom and no white impact frame while it plays');
      while (showcase.running && showcase.time < (r.at + 0.2) * B) showcase.frame(STEP, { render: false });
      const s0 = showcase.simTime, t0 = showcase.time;
      for (let n = 0; n < 30; n++) showcase.frame(STEP, { render: false });
      const ran = (showcase.simTime - s0) / (showcase.time - t0);
      expect.near(ran, r.speed, 0.08, 'the game runs at the ramp\'s speed');
      const r2 = SHOWCASE.ramps[1];
      while (showcase.running && showcase.time < (r.at + r.for + 0.3) * B && showcase.time < r2.at * B) showcase.frame(STEP, { render: false });
      const s1 = showcase.simTime, t1 = showcase.time;
      for (let n = 0; n < 10; n++) showcase.frame(STEP, { render: false });
      expect.near((showcase.simTime - s1) / (showcase.time - t1), 1, 0.01, 'and at full speed after it');
    } finally { if (showcase.running) showcase.stop(); }
    expect.ok(bloom.strength === was && impactFrame.hit !== undefined && Game.level === ARENA, 'the bloom, the impact frames and the Arena come back');
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
