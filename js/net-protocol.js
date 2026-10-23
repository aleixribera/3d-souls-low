'use strict';
// Shared, dependency-free wire contract. Also loaded by the Node lobby server.
// Timing/bandwidth limits are data, rather than constants scattered through the transport.
(function (root) {
  const config = Object.freeze({
    protocol: 2, path: '/lobby', tickRate: 60, snapshotRate: 30, playerRate: 30,
    defaultCapacity: 16, maxCapacity: 64, maxMessage: 16384, maxBuffered: 262144,
    interpolation: 1 / 30, maxHistory: 240, historySeconds: 3, stalePlayer: 3,
    heartbeat: 15000, idleTimeout: 45000, connectTimeout: 10000,
    messagesPerSecond: 100, maxName: 24, maxCoordinate: 100000,
    maxCharge: 1, respawnSpread: 0.85, remoteRange: 100, maxClaims: 2048,
    targetHysteresis: 0.8, contactTolerance: 1.5,
    wirePrecision: 1000, compressionThreshold: 512, compressionLevel: 3, compressionConcurrency: 2,
    metricsInterval: 1000, pingInterval: 2000, metricsSamples: 120,
    leaderIdle: 5 * 60 * 1000, activityInterval: 1000,
    reconnectDelay: 1000, reconnectMaxDelay: 10000, reconnectBackoffSteps: 4,
    emptyLobbyTimeout: 60 * 1000,
    defaultCampaign: 'lands',
    defaultAdventure: Object.freeze({ kind: 'gauntlet', id: 'boss-only' }),
    // Boss runs: `size` bosses fought together per encounter, in catalog order; `then` follows a full victory.
    gauntlets: Object.freeze({
      'boss-only': Object.freeze({ name: 'BOSS ONLY', size: 1, then: 'boss-pairs' }),
      'boss-pairs': Object.freeze({ name: 'DOUBLE BOSSES', size: 2, then: null }),
    }),
    bossLoadGrace: 3, bossVictoryDelay: 5, teamWipeScreenTime: 4,
    runIntroScreenTime: 5,
    leaderboardDelay: 1, leaderboardTime: 6,
    spectatorFov: [10, 150],
  });
  const finite = (n, max = config.maxCoordinate) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= max;
  const id = s => typeof s === 'string' && s.length > 0 && s.length <= 240;
  const name = s => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, config.maxName) : '';
  // Optional presentation data only. Reject malformed cameras without dropping
  // the player's otherwise valid combat pose.
  function cameraView(v) {
    if (!v || !Array.isArray(v.position) || v.position.length !== 3 || !v.position.every(n => finite(n))
      || !Array.isArray(v.quaternion) || v.quaternion.length !== 4 || !v.quaternion.every(n => finite(n, 1))
      || !finite(v.fov) || v.fov < config.spectatorFov[0] || v.fov > config.spectatorFov[1]) return null;
    const length = Math.hypot(...v.quaternion);
    return length > 0 ? { position: v.position.slice(), quaternion: v.quaternion.map(n => n / length), fov: v.fov } : null;
  }
  // Quantization affects only the wire representation, never simulation/balance.
  function wire(value) {
    if (typeof value === 'number') return Math.round(value * config.wirePrecision) / config.wirePrecision;
    if (Array.isArray(value)) return value.map(wire);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, wire(v)]));
    return value;
  }
  class FrameEncoder {
    constructor() { this.reset(); }
    reset() { this.epoch = null; this.groups = {}; }
    encode(frame, players) {
      const full = frame.epoch !== this.epoch;
      if (full) { this.reset(); this.epoch = frame.epoch; }
      const changes = (kind, list) => {
        const before = this.groups[kind] || new Map(), next = new Map(), patches = [], removed = [];
        for (const raw of list) {
          const value = wire(raw), old = before.get(value.id), patch = { id: value.id };
          next.set(value.id, value);
          for (const [key, v] of Object.entries(value)) if (!old || JSON.stringify(v) !== JSON.stringify(old[key])) patch[key] = v;
          if (full || !old || Object.keys(patch).length > 1) patches.push(patch);
        }
        for (const key of before.keys()) if (!next.has(key)) removed.push(key);
        this.groups[kind] = next;
        return { patches, removed };
      };
      const enemies = changes('enemies', frame.enemies), gates = changes('gates', frame.gates), traps = changes('traps', frame.traps), people = changes('players', players);
      return { type: 'frame', full, frame: { epoch: frame.epoch, time: frame.time, complete: frame.complete, results: frame.results,
        checkpoint: frame.checkpoint, enemies: enemies.patches, gates: gates.patches, traps: traps.patches,
        events: frame.events, shots: frame.shots, server: frame.server }, players: people.patches,
        removed: { enemies: enemies.removed, gates: gates.removed, traps: traps.removed, players: people.removed } };
    }
  }
  class FrameDecoder {
    constructor() { this.reset(); }
    reset() { this.epoch = null; this.groups = {}; }
    decode(message) {
      if (message.full) { this.reset(); this.epoch = message.frame.epoch; }
      if (this.epoch !== message.frame.epoch) throw new Error('Lobby snapshot has no matching baseline. Rejoin the lobby.');
      const merge = (kind, patches) => {
        const state = this.groups[kind] || (this.groups[kind] = new Map());
        for (const key of message.removed?.[kind] || []) state.delete(key);
        for (const p of patches) state.set(p.id, { ...state.get(p.id), ...p });
        return [...state.values()];
      };
      return { ...message, players: merge('players', message.players), frame: { ...message.frame,
        enemies: merge('enemies', message.frame.enemies), gates: merge('gates', message.frame.gates), traps: merge('traps', message.frame.traps) } };
    }
  }
  // Each enemy owns a presentation clock. Recover idle/recovery delay without
  // moving through any unseen wind-up/active/phase transition. Attacks always
  // play at 1x; one distant enemy cannot hold the rest of the world behind it.
  class EnemyTrack {
    constructor() { this.samples = []; this.time = null; this.started = false; }
    push(sample) {
      if (this.samples.length && sample.time <= this.samples[this.samples.length - 1].time) return;
      this.samples.push(sample);
      if (this.time === null) this.time = sample.time;
    }
    protected(s) { return ['windup', 'active', 'phase', 'retreat', 'executed'].includes(s.value.state); }
    advance(dt, delay = config.interpolation) {
      if (!this.samples.length) return null;
      const crossed = [], latest = this.samples[this.samples.length - 1];
      let time = Math.min(this.time + dt, latest.time);
      if (!this.protected(this.samples[0])) {
        const target = latest.time - delay;
        const barrier = this.samples.find(s => s.time > this.time && this.protected(s));
        time = Math.max(time, Math.min(target, barrier ? barrier.time : target));
      }
      this.time = time;
      if (!this.started) { crossed.push(this.samples[0]); this.started = true; }
      while (this.samples.length > 1 && this.samples[1].time <= time) { this.samples.shift(); crossed.push(this.samples[0]); }
      const a = this.samples[0], b = this.samples[1] || a;
      const alpha = a === b ? 0 : Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time)));
      return { a, b, time, alpha, crossed };
    }
  }
  const api = { config, finite, id, name, cameraView, FrameEncoder, FrameDecoder, EnemyTrack };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArenaNet = api;
})(globalThis);
