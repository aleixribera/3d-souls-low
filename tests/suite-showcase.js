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
    expect.ok(showcase.play({ manual: true, toMenu: false }), 'it starts again');
    try {
      for (let n = 0; n < 90; n++) showcase.frame(STEP, { render: false });
      const was = Game.mode;
      for (const code of ['Escape', 'Enter', 'Space', 'KeyR', 'KeyP']) window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true }));
      Game.pause(false);
      expect.ok(showcase.running && Game.mode === was && $('menu').classList.contains('hidden'), 'no key, pause or restart stops it');
    } finally { showcase.stop(); }
    const second = watch().marks;
    expect.ok(first.length > 25 && first.join(';') === second.join(';'), `two runs differ: ${first.find((m, i) => m !== second[i])} / ${second.find((m, i) => m !== first[i])}`);
    Game.showMenu('main');
    expect.ok(Game.menuItems.some(it => it.name === 'Watch'), 'the title has Watch to play it again');
  });
})();
