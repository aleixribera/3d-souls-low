"use strict";
// Detached real-model render test. It never starts a level or changes simulation state.
const qualityBenchmark = (() => {
  const A = CONFIG.VISUALS.autoQuality, B = A.stage;
  function measure(preset, device) {
    const q = CONFIG.VISUALS.quality[preset];
    const ratio = Math.min(device.pixelRatio || 1, q.maxPixelRatio) * q.renderScale;
    const width = Math.max(1, Math.round(device.width * ratio)), height = Math.max(1, Math.round(device.height * ratio));
    const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType,
      samples: Math.min(q.msaa, renderer.capabilities.maxSamples || q.msaa) });
    const state = { target: renderer.getRenderTarget(), viewport: renderer.getViewport(new THREE.Vector4()),
      scissor: renderer.getScissor(new THREE.Vector4()), scissorTest: renderer.getScissorTest(),
      tone: renderer.toneMapping, exposure: renderer.toneMappingExposure, colorSpace: renderer.outputColorSpace,
      clear: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), autoClear: renderer.autoClear,
      shadows: renderer.shadowMap.enabled, shadowType: renderer.shadowMap.type,
      shadowAuto: renderer.shadowMap.autoUpdate, shadowDirty: renderer.shadowMap.needsUpdate,
      detail: KIT.detail(), infoAutoReset: renderer.info.autoReset, renderInfo: { ...renderer.info.render } };
    const test = new THREE.Scene(), rigs = [], resources = [], passes = [];
    let composer = null, normalTarget = null, moon = null;
    const own = resource => { resources.push(resource); return resource; };
    try {
      renderer.setScissorTest(false); renderer.autoClear = true; renderer.info.autoReset = false;
      renderer.shadowMap.enabled = q.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      test.background = new THREE.Color(AUTO_QUALITY_SCENE.floor.color);
      test.fog = new THREE.FogExp2(test.background, CONFIG.VISUALS.ultra.scatter.fogRef);
      const C = A.camera, cam = new THREE.PerspectiveCamera(C.fov, width / height, C.near, C.far);
      cam.position.fromArray(C.position); cam.lookAt(new THREE.Vector3(...C.look)); cam.updateMatrixWorld();
      const floorMat = own(new THREE.MeshStandardMaterial(AUTO_QUALITY_SCENE.floor));
      const propMat = own(new THREE.MeshStandardMaterial(AUTO_QUALITY_SCENE.props));
      const box = own(new THREE.BoxGeometry(1, 1, 1));
      const floor = new THREE.Mesh(box, floorMat);
      floor.scale.set(B.halfSize * 2, 0.5, B.halfSize * 2); floor.position.y = -0.25; floor.receiveShadow = q.shadows; test.add(floor);
      for (let i = 0; i < B.propCount; i++) {
        const m = new THREE.Mesh(box, propMat), angle = i * Math.PI * 2 / B.propCount;
        const ring = B.propRadius * (0.65 + 0.35 * (i % 3) / 2);
        m.position.set(Math.cos(angle) * ring, B.propHeight / 2, Math.sin(angle) * ring);
        m.scale.set(0.45, B.propHeight * (0.7 + 0.3 * (i % 4)), 0.45);
        m.castShadow = m.receiveShadow = q.shadows; test.add(m);
      }
      test.add(new THREE.AmbientLight(0xb8c8e0, B.ambient));
      moon = new THREE.DirectionalLight(0xffe6c0, B.moon); moon.position.set(8, 15, 8); moon.castShadow = q.shadows;
      moon.shadow.mapSize.setScalar(CONFIG.VISUALS.ultra.shadows.moonMap);
      Object.assign(moon.shadow.camera, { left: -B.shadowBox, right: B.shadowBox, top: B.shadowBox, bottom: -B.shadowBox });
      moon.shadow.camera.updateProjectionMatrix(); test.add(moon);
      for (let i = 0; i < Math.min(B.lights, q.lights); i++) {
        const a = i * Math.PI * 2 / B.lights, l = new THREE.PointLight(i % 2 ? 0xff9038 : 0x8fbaff, B.lightPower, B.lightRange);
        l.position.set(Math.cos(a) * B.lightRadius, B.lightHeight, Math.sin(a) * B.lightRadius); test.add(l);
      }
      KIT.setDetail(q.modelDetail);
      try {
        for (const spec of AUTO_QUALITY_SCENE.actors) {
          const rig = new Rig(spec); rigs.push(rig);
          test.add(rig.root, rig.shadow); rig.reset(); rig.place(spec.x, 0, spec.z, Math.PI);
          rig.root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = q.shadows; } });
          // Hidden phase meshes also take part, as they do in the real loading warm-up.
          if (rig.slotMeshes) for (const mesh of Object.values(rig.slotMeshes)) mesh.visible = true;
        }
      } finally { KIT.setDetail(state.detail); }
      if (q.reflections) {
        const environmentScene = new THREE.Scene(); environmentScene.background = test.background;
        const generator = new THREE.PMREMGenerator(renderer);
        let environment;
        try { environment = own(generator.fromScene(environmentScene)); } finally { generator.dispose(); }
        for (const material of [propMat, ...rigs.flatMap(r => r.mats)]) {
          if (material.isMeshStandardMaterial && material.metalness >= CONFIG.VISUALS.ultra.env.metalFrom) {
            material.envMap = environment.texture; material.envMapIntensity = CONFIG.VISUALS.ultra.env.intensity;
            material.needsUpdate = true;
          }
        }
      }
      const positions = new Float32Array(B.particles * 3);
      for (let i = 0; i < B.particles; i++) {
        positions[i * 3] = Math.sin(i * 2.4) * B.propRadius;
        positions[i * 3 + 1] = (i % 31) / 31 * B.particleHeight;
        positions[i * 3 + 2] = Math.cos(i * 1.7) * B.propRadius;
      }
      const pg = own(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pm = own(new THREE.PointsMaterial({ color: 0xffc070, size: B.particleSize, transparent: true, opacity: 0.65,
        blending: THREE.AdditiveBlending, depthWrite: false })); test.add(new THREE.Points(pg, pm));
      composer = new EffectComposer(renderer, target); composer.renderToScreen = false;
      composer.setPixelRatio(1); composer.setSize(width, height);
      const render = new RenderPass(test, cam); composer.addPass(render);
      if (q.ao || q.volumetrics) {
        const w = Math.max(1, Math.round(width * B.aoScale)), h = Math.max(1, Math.round(height * B.aoScale));
        normalTarget = own(new THREE.WebGLRenderTarget(w, h, { depthTexture: own(new THREE.DepthTexture(w, h)) }));
        const normal = own(new THREE.MeshNormalMaterial());
        const prepass = new class extends Pass {
          constructor() { super(); this.needsSwap = false; }
          render(r) {
            const override = test.overrideMaterial, dirty = r.shadowMap.needsUpdate;
            r.shadowMap.needsUpdate = false;
            try { test.overrideMaterial = normal; r.setRenderTarget(normalTarget); r.clear(); r.render(test, cam); }
            finally { test.overrideMaterial = override; r.shadowMap.needsUpdate = dirty; }
          }
        }();
        // Same reduced depth/normal workload class as Ultra; a small screen shader samples occlusion and fog.
        composer.insertPass(prepass, 0);
        const light = new ShaderPass({
          defines: { TAPS: B.aoSamples },
          uniforms: { tDiffuse: { value: null }, tNormal: { value: normalTarget.texture }, tDepth: { value: normalTarget.depthTexture } },
          vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
          fragmentShader: `uniform sampler2D tDiffuse,tNormal,tDepth;varying vec2 vUv;
void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float d=texture2D(tDepth,vUv).r;vec3 n=texture2D(tNormal,vUv).xyz;float occ=0.;
for(int i=0;i<TAPS;i++){float a=float(i)*2.399963;vec2 o=vec2(cos(a),sin(a))*.004*(float(i)+1.);occ+=step(d+.0002,texture2D(tDepth,vUv+o).r);}
c*=.8+.2*occ/float(TAPS);c+=vec3(.015,.012,.008)*(1.-d)*n.y;gl_FragColor=vec4(c,1.);}`,
        }); composer.addPass(light); passes.push(light);
      }
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), CONFIG.VISUALS.bloom.strength, CONFIG.VISUALS.bloom.radius, CONFIG.VISUALS.bloom.threshold);
      composer.addPass(bloom); bloom.setSize(Math.round(width * q.bloomScale), Math.round(height * q.bloomScale)); passes.push(bloom);
      const grade = new ShaderPass(GRADE_SHADER); composer.addPass(grade); passes.push(grade);
      const times = []; let drawCalls = 0, triangles = 0;
      const run = count => {
        for (let i = 0; i < count; i++) {
          renderer.info.reset();
          cam.position.x += 0.001; cam.updateMatrixWorld();
          // The normal pre-pass does not update the shadow. The main scene gets exactly one update per frame.
          renderer.shadowMap.needsUpdate = q.shadows;
          composer.render();
          drawCalls = renderer.info.render.calls; triangles = renderer.info.render.triangles;
        }
        const gl = renderer.getContext();
        gl.finish();   // synchronize once per batch; includes actual CPU submission and GPU completion
        if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw new Error('The 3D graphics test did not render successfully.');
      };
      // Compilation, model/texture uploads and first-use allocation are excluded from the timed rounds.
      run(A.warmFrames);
      for (let i = 0; i < A.rounds; i++) {
        const start = performance.now(); run(A.passes); times.push((performance.now() - start) / A.passes);
      }
      times.sort((a, b) => a - b);
      return { ms: times[Math.floor(times.length / 2)], worstMs: times[times.length - 1], times, width, height,
        frames: A.rounds * A.passes, drawCalls, triangles, method: 'synchronized-3d-frames' };
    } finally {
      for (const rig of rigs) { rig.root.removeFromParent(); rig.shadow.removeFromParent(); rig.dispose(); }
      if (moon && moon.shadow.map) moon.shadow.map.dispose();
      for (const pass of passes) if (pass.dispose) pass.dispose();
      if (composer) composer.dispose(); else target.dispose();
      for (const resource of resources) resource.dispose();
      renderer.shadowMap.enabled = state.shadows; renderer.shadowMap.type = state.shadowType;
      renderer.shadowMap.autoUpdate = state.shadowAuto; renderer.shadowMap.needsUpdate = state.shadowDirty;
      renderer.toneMapping = state.tone; renderer.toneMappingExposure = state.exposure; renderer.outputColorSpace = state.colorSpace;
      renderer.info.autoReset = state.infoAutoReset; Object.assign(renderer.info.render, state.renderInfo);
      renderer.autoClear = state.autoClear; renderer.setClearColor(state.clear, state.alpha);
      renderer.setRenderTarget(state.target); renderer.setViewport(state.viewport); renderer.setScissor(state.scissor); renderer.setScissorTest(state.scissorTest);
    }
  }
  return { measure };
})();
