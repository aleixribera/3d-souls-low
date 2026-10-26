'use strict';
// Keep a whole action sequence visible so beginners can read it before trying it.
const tutorialSteps = () => {
    const B = bindLabel;
    const byPlayer = (d, g) => d.attacker === g.player;
    const byDummy = (d, g) => d.attacker === g.enemies[0];
    return [
      { id: 'move', text: () => `Walk around ${moveLabel()}`, check: (g, t) => t.dist >= 5 },
      { id: 'jump', text: () => `Jump ${B('jump')}`, check: g => g.player.state === PS.JUMP },
      { id: 'roll', text: () => `Dodge with a roll ${B('roll')}`, check: g => g.player.state === PS.ROLL },
      { id: 'lock', dummies: 'one', text: () => `Lock on to the dummy ${B('lock')}`, on: type => type === 'lock' },
      { id: 'light', dummies: 'one', text: () => `Hit the dummy ${B('light')}`,
        on: (type, d, t, g) => type === 'strike' && byPlayer(d, g) && d.strike.attackId === 'light' },
      // Done on a fully charged heavy; a lighter one shows how.
      { id: 'heavy', dummies: 'one', text: () => `Hold ${B('heavy')} until the blade glows, then release to hit the dummy`,
        on: (type, d, t, g) => {
          if (type !== 'strike' || !byPlayer(d, g) || d.strike.attackId !== 'heavy') return false;
          if (d.strike.charge >= 1 - 1e-6) return true;
          g.tutorialHint('Hold it longer: let go once the blade glows');
          return false;
        } },
      { id: 'jumpAttack', dummies: 'one', text: () => `Jump toward the dummy ${B('jump')}, then press ${B('heavy')} in the air to attack`,
        on: (type, d, t, g) => { if (type === 'strike' && byPlayer(d, g) && d.strike.air) t.flags.airHit = true; },
        check: (g, t) => t.flags.airHit && g.player.state !== PS.JUMP_ATTACK && g.player.state !== PS.LAND },   // after the landing
      { id: 'block', dummies: 'sparring', lockOn: true, text: () => `Hold block and wait for the hit ${B('block')}`,
        on: (type, d, t, g) => type === 'strike' && d.target === g.player && d.blocked },
      { id: 'parry', dummies: 'sparring', lockOn: true, text: () => `Red glow: parry just before the hit ${B('parry')}`,
        on: type => type === 'parry' },
      // Done on one roll through the swing. A swing that ends without one shows why: hit after rolling during it, its
      // invulnerability over before the swing landed (too early), hit without having rolled (too late), or rolled clear
      // of it (`swing`: this swing so far; a roll that starts in the step a hit lands is invulnerable, so it never counts).
      { id: 'dodge', dummies: 'dodge', lockOn: true,
        text: () => `Blue glow: roll into the swing ${B('roll')}`,
        on: (type, d, t, g) => {
          if (type === 'attackStart' && d.enemy === g.enemies[0]) t.flags.swing = { rolled: false, hit: null };
          if (type === 'strike' && byDummy(d, g) && t.flags.swing) t.flags.swing.hit = t.flags.swing.rolled ? 'Too early' : 'Too late';
          return type === 'dodge' && byDummy(d, g);
        },
        check: (g, t) => {
          const e = g.enemies[0], s = t.flags.swing;
          if (s && g.player.state === PS.ROLL && (e.state === ES.WINDUP || e.state === ES.ACTIVE)) s.rolled = true;
          if (s && e.state === ES.RECOVER) {
            const hint = s.hit || (s.rolled ? 'Roll into the swing' : null);
            if (hint) g.tutorialHint(hint);
            t.flags.swing = null;
          }
          return false;
        } },
      // v5.2: break the dummy's stance, then execute it. Done on one finished execution.
      { id: 'execute', dummies: 'execution', lockOn: true,
        text: () => `Hit the dummy with ${B('heavy')} until it kneels. Walk close to its front and press ${B('light')} to Execute`,
        on: type => type === 'executionEnd' },
      { id: 'flask', text: () => `Heal with your flask ${B('flask')}`,
        setup: g => { const it = g.player.item('flask'); g.player.hp = Math.min(g.player.hp, 55); if (g.player.inventory.flask) it.count = Math.max(it.count, 1); },
        on: (type, d, t) => { if (type === 'itemUsed' && d.item === 'flask') t.flags.drank = true; },
        check: (g, t) => t.flags.drank && g.player.state !== PS.USE_ITEM },
      { id: 'rest', bonfire: 'tutorial-fire', text: () => `Follow the arrow to the bonfire, then press ${B('rest')} to rest`, on: type => type === 'rest' },
      { id: 'switch', dummies: 'pair', lockOn: true, text: () => `Switch to the other target ${B('switchTarget')}`,
        on: type => type === 'switchTarget' },
      { id: 'pause', allowsPause: true, text: () => `Pause, then resume ${systemLabel('pause')}`,
        on: (type, d, t) => { if (type === 'pause') t.flags.paused = true; return type === 'resume' && t.flags.paused; } },
    ];
};
