'use strict';
// Drawing only: fixed, sparse pockets of warm light flowing toward the next bonfire.
const bonfireGuidance = (() => {
  const C = VIS.guidance;
  let state = null;
  function clear() {
    if (!state) return;
    state.mesh.removeFromParent(); state.mesh.geometry.dispose(); state.mesh.material.dispose(); state = null;
  }
  function build(def, built) {
    clear();
    const routes = BONFIRE_GUIDANCE[def.id];
    if (!routes || !routes.length) return;
    const initial = routes.find(r => !routes.some(previous => previous.to === r.from)).id;
    const anchors = [], rnd = seeded(strSeed(def.id + '/guidance'));
    for (const route of routes) for (const path of route.paths) {
      let distance = C.spacing / 2;
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], len = Math.hypot(b[0] - a[0], b[2] - a[2]);
        if (!len) continue;
        while (distance < len) {
          const t = distance / len;
          anchors.push({ x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), z: lerp(a[2], b[2], t),
                         dx: (b[0] - a[0]) / len, dy: (b[1] - a[1]) / len, dz: (b[2] - a[2]) / len,
                         route: route.id, seed: rnd() * Math.PI * 2 });
          distance += C.spacing;
        }
        distance -= len;
      }
    }
    const n = anchors.length * C.particles, pos = new Float32Array(n * 3), phase = new Float32Array(n), direction = new Float32Array(n * 3);
    anchors.forEach((a, i) => {
      for (let k = 0; k < C.particles; k++) {
        const j = i * C.particles + k;
        pos.set([a.x, a.y + C.height, a.z], j * 3); direction.set([a.dx, a.dy, a.dz], j * 3);
        phase[j] = k / C.particles + a.seed;
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aDirection', new THREE.BufferAttribute(direction, 3));
    geo.setAttribute('aVisible', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: vTime, uColor: { value: new THREE.Color(C.color) }, uScale: { value: 1 }, uFog: FOG_D },
      vertexShader: `attribute float aPhase, aVisible; attribute vec3 aDirection; uniform float uTime, uScale;
        varying float vAlpha, vDepth;
        void main() {
          float t = fract(uTime / ${C.life.toFixed(3)} + aPhase);
          float wave = sin(t * 3.14159265);
          vec3 p = position + aDirection * ((t - 0.5) * ${C.travel.toFixed(3)});
          p += vec3(aDirection.z, 0., -aDirection.x) * sin(t * 6.283185 + aPhase * 19.) * ${C.spread.toFixed(3)};
          p.y += sin(t * 3.14159265 + aPhase * 5.) * ${C.rise.toFixed(3)};
          vec4 mv = modelViewMatrix * vec4(p, 1.); vDepth = -mv.z;
          vAlpha = wave * wave * aVisible * ${C.opacity.toFixed(3)};
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(${C.maxPx.toFixed(1)}, ${C.size.toFixed(3)} * uScale / max(0.1, vDepth));
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uFog; varying float vAlpha, vDepth;
        void main() { float r = length(gl_PointCoord - 0.5) * 2.;
          float halo = pow(max(0., 1. - r), 2.);
          float core = exp(-r * r * 45.);
          float fog = exp(-uFog * uFog * vDepth * vDepth);
          float a = (halo * 0.6 + core) * vAlpha * fog;
          if (a < 0.002) discard; gl_FragColor = vec4(uColor * (1. + core), a);
        }`,
    });
    const mesh = new THREE.Points(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 3; built.group.add(mesh);
    state = { mesh, anchors, level: def.id, routes, bonfires: def.bonfires, initial, route: initial, player: null, spawn: null };
  }
  visuals.hooks.stage.push(build);
  visuals.hooks.quality.push(() => { if (state) state.mesh.geometry.attributes.aVisible.needsUpdate = true; });
  const continueFrom = id => { const r = state.routes.find(r => r.from === id); state.route = r ? r.id : null; };
  events.on('rest', d => { if (state) continueFrom(d.bonfire.id); });
  Game.renderHooks.push(game => {
    if (!state) return;
    const p = game.player, mesh = state.mesh;
    mesh.visible = game.mode === 'play' && !!p && p.alive();
    if (!mesh.visible) return;
    const spawn = game.spawn && `${game.spawn.x}/${game.spawn.y ?? 0}/${game.spawn.z}`;
    if (state.player !== p || state.spawn !== spawn) {
      state.player = p; state.spawn = spawn;
      const fire = state.bonfires.find(b => b.spawn
        ? `${b.spawn.x}/${b.spawn.y ?? 0}/${b.spawn.z}` === spawn
        : game.spawn && Math.abs(Math.abs(game.spawn.x - b.x) - CONFIG.rest.respawnOffset) < 1e-6
          && game.spawn.z === b.z && Math.abs((game.spawn.y || 0) - (b.y || 0)) < C.floorTolerance);
      if (fire) continueFrom(fire.id); else state.route = state.initial;
    }
    const route = state.routes.find(r => r.id === state.route), target = route && state.bonfires.find(b => b.id === route.to);
    if (target && game.bonfireLit(target) && Math.hypot(target.x - p.x, target.z - p.z) < C.arrival
      && Math.abs((target.y || 0) - p.y) < C.floorTolerance) continueFrom(target.id);
    const attr = mesh.geometry.attributes.aVisible, count = visuals.quality().post ? C.particles : C.lowParticles;
    state.anchors.forEach((a, i) => {
      const d = Math.hypot(a.x - p.x, a.z - p.z), ground = world.groundAt(a.x, a.z, a.y);
      // The collapsing floor's old trail vanishes. Depth testing keeps pockets behind walls hidden.
      const fade = a.route === state.route && Number.isFinite(ground) && Math.abs(ground - a.y) < C.floorTolerance
        ? clamp((d - C.near) / C.near, 0, 1) * clamp((C.far - d) / C.fadeBand, 0, 1) : 0;
      for (let k = 0; k < C.particles; k++) attr.array[i * C.particles + k] = k < count ? fade : 0;
    });
    attr.needsUpdate = true;
    mesh.material.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  });
  return { info: () => state ? { level: state.level, anchors: state.anchors.length, route: state.route, particles: state.anchors.length * C.particles } : null,
           get state() { return state; } };
})();
