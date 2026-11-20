'use strict';
// Targeted tests for Boss v2: skinned baked rig format, stances, altitude, timeline cues/spawns,
// concurrent extraHitboxes, and first-class synced BossHazards through FrameEncoder/FrameDecoder.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createSimulation, root } = require('../server/headless.cjs');
const net = require('../js/net-protocol.js');

// 1. Verify packed skinned rig (js/baked/ashwing.js) structure
{
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, 'js/baked/ashwing.js'), 'utf8'), ctx);
  const rig = ctx.BAKED_RIGS && ctx.BAKED_RIGS.ashwing;
  assert.ok(rig, 'BAKED_RIGS.ashwing must be packed');
  assert.equal(rig.bones.length, 26, 'Ashwing must have 26 custom bones');
  assert.equal(rig.meshes.length, 5, 'Ashwing must have 5 material-slot skinned meshes');
  for (const m of rig.meshes) {
    assert.ok(m.j && m.w, `Mesh slot ${m.slot} must carry 4-bone skinIndex (j) and skinWeight (w)`);
  }
  const clipNames = Object.keys(rig.clips);
  for (const req of ['idle', 'prowl', 'hover', 'clawRake', 'tailWhip', 'wingCross', 'emberBreath', 'skyDive', 'stagger', 'death']) {
    assert.ok(clipNames.includes(req), `Missing Blender clip "${req}"`);
  }
  console.log(`  ok baked skinned rig: ${rig.bones.length} bones, ${rig.meshes.length} meshes, ${clipNames.length} clips`);
}

// 2. Verify headless simulation of Ashwing (stances, altitude, timeline spawns, synced hazards, wire round-trip)
{
  const host = createSimulation({ seed: 1337 });
  host.addBot('skilled');
  host.start('arena', 'ashwing');
  host.setPlayers([]);
  const enc = new net.FrameEncoder(), dec = new net.FrameDecoder();

  let sawAirborne = false, sawHazard = false, sawCue = false, maxAlt = 0;
  for (let step = 0; step < 60 * 35; step++) {
    host.tick(1 / 60);
    if (step % 2 === 0) {
      const f = host.frame(true);
      const wireMsg = enc.encode(f, []);
      const decoded = dec.decode(wireMsg);
      const ash = decoded.frame.enemies.find(e => e.def === 'ashwing');
      assert.ok(ash, 'Ashwing must appear in decoded snapshot');
      if (ash.v2s === 'airborne') sawAirborne = true;
      if ((ash.v2a || 0) > maxAlt) maxAlt = ash.v2a;
      if (decoded.frame.hazards && decoded.frame.hazards.length > 0) sawHazard = true;
      if (decoded.frame.events && decoded.frame.events.some(ev => ev.type === 'bossCue')) sawCue = true;
      if (sawAirborne && sawHazard && sawCue && maxAlt > 1.5) break;
    }
  }
  assert.ok(sawCue, 'Ashwing must emit synced bossCue timeline events');
  assert.ok(sawHazard, 'Ashwing must spawn first-class synced BossHazards in snapshots');
  assert.ok(sawAirborne && maxAlt > 1.5, `Ashwing must transition to airborne stance (maxAlt=${maxAlt.toFixed(2)})`);
  console.log(`  ok headless sim + wire sync: airborne=${sawAirborne}, maxAlt=${maxAlt.toFixed(2)}m, hazards=${sawHazard}, cues=${sawCue}`);
}

console.log('boss-v2: PASS');
