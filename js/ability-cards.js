'use strict';
// ============================================================================
// Boss Rush's ability cards (v7.75.0, PLAN.md Track B item 3, the "Pick 4 · Tall cards" mockup): what an ability
// looks like in the pick. The pick itself (offer, timer, keys, pad) is js/multiplayer.js's; the data
// js/data/abilities.js. Presentation only: nothing here touches the game.
// ============================================================================
// Each ability's icon: line drawing in a 48×48 box, stroked in its rarity's colour (no fill). Drawn for this game,
// in the menus' style; validate.js checks every ability has one.
const ABILITY_ICONS = {
  // Commons
  'keen-edge': '<path d="M12 33 L33 12 L38 10 L36 15 L15 36 Z"/><path d="M9 30 L18 39 M13 35 L8 40"/><path d="M38 27 V35 M34 31 H42"/>',
  'iron-blood': '<path d="M24 40 C14 33 8 27 8 19 A8 8 0 0 1 24 15 A8 8 0 0 1 40 19 C40 27 34 33 24 40 Z"/><path d="M24 21 V31 M19 26 H29"/>',
  'deep-lungs': '<path d="M24 8 V20 M24 20 C21 22 20 24 20 27 M24 20 C27 22 28 24 28 27"/><path d="M20 16 C13 14 9 22 9 31 C9 38 13 40 19 37 C21 36 21 33 21 29 Z"/><path d="M28 16 C35 14 39 22 39 31 C39 38 35 40 29 37 C27 36 27 33 27 29 Z"/>',
  'quick-breath': '<path d="M6 18 H28 A5 5 0 1 0 23 13"/><path d="M6 26 H36 A5 5 0 1 1 31 31"/><path d="M6 34 H20"/>',
  'breaker': '<circle cx="24" cy="24" r="15"/><path d="M24 9 L21 18 L27 23 L21 30 L24 39"/><path d="M27 23 L34 21"/>',
  'keen-eye': '<path d="M5 26 C11 16 37 16 43 26 C37 36 11 36 5 26 Z"/><circle cx="24" cy="26" r="5"/><path d="M24 6 V11 M12 9 L15 13 M36 9 L33 13"/>',
  'light-step': '<path d="M38 8 C24 8 14 18 14 34 C28 34 38 24 38 8 Z"/><path d="M38 8 L9 40"/><path d="M19 27 H27 M24 22 H32"/>',
  'long-shadow': '<circle cx="32" cy="24" r="9"/><path d="M20 17 A10 10 0 0 0 20 31" stroke-dasharray="2 3"/><path d="M12 19 A8 8 0 0 0 12 29" stroke-dasharray="2 3"/><path d="M6 39 H42"/>',
  'quick-draught': '<path d="M23 8 H31 M24 8 V16 C17 19 15 24 15 29 A12 12 0 0 0 39 29 C39 24 37 19 30 16 V8"/><path d="M17 28 H37"/><path d="M3 22 H9 M2 28 H9 M4 34 H10"/>',
  'swift-charge': '<path d="M24 6 V33 M18 33 H30 M24 33 V42"/><path d="M8 24 L13 19 L18 24 M8 32 L13 27 L18 32"/><path d="M30 24 L35 19 L40 24 M30 32 L35 27 L40 32"/>',
  'cold-riposte': '<path d="M6 30 H34 L41 30 L34 33 H6 Z"/><path d="M11 25 V38"/><path d="M33 6 V18 M27 12 H39 M29 8 L37 16 M37 8 L29 16"/>',
  'headsman': '<path d="M12 42 L32 10"/><path d="M27 14 C33 8 42 11 42 19 C42 25 37 28 32 26 Z"/><path d="M9 36 L15 40"/>',
  // Rares
  'deep-breath': '<path d="M10 34 L30 14 M38 34 L18 14"/><path d="M8 30 L14 36 M40 30 L34 36"/><path d="M14 10 A14 14 0 0 1 34 10"/><path d="M34 10 L33 5 M34 10 L29 11"/>',
  'counterstep': '<path d="M8 36 C8 22 16 14 28 14"/><path d="M28 14 L23 10 M28 14 L23 18"/><path d="M22 34 H40 L44 34 L40 36 H22 Z"/><path d="M26 30 V40"/>',
  'vengeance': '<path d="M17 10 C11 19 9 24 9 28 A8 8 0 0 0 25 28 C25 24 23 19 17 10 Z"/><path d="M36 40 V12 M30 18 L36 12 L42 18"/><path d="M30 26 L36 20 L42 26"/>',
  'bloodthirst': '<path d="M8 10 V28 M14 10 V28 M20 10 V28 M26 10 V28 M5 24 L29 14"/><path d="M36 41 C31 37 28 34 28 31 A4 4 0 0 1 36 29 A4 4 0 0 1 44 31 C44 34 41 37 36 41 Z"/>',
  'last-breath': '<path d="M20 22 H28 V40 H20 Z"/><path d="M24 7 C20 12 20 16 24 18 C28 16 28 12 24 7 Z"/><path d="M14 40 H34"/>',
  'opportunist': '<circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="2"/><path d="M24 4 V14 M24 34 V44 M4 24 H14 M34 24 H44"/>',
  'bastion': '<path d="M24 6 L38 11 V24 C38 33 31 39 24 42 C17 39 10 33 10 24 V11 Z"/><path d="M27 14 L19 26 H27 L21 35"/>',
  'patience': '<path d="M14 6 H34 M14 42 H34"/><path d="M17 6 C17 16 24 19 24 24 C24 29 17 32 17 42 M31 6 C31 16 24 19 24 24 C24 29 31 32 31 42"/><path d="M20 39 C22 36 26 36 28 39"/>',
  'second-wind': '<path d="M20 8 H28 M21 8 V15 C15 18 13 23 13 28 A11 11 0 0 0 35 28 C35 23 33 18 27 15 V8"/><path d="M18 30 C21 26 25 34 30 30"/><path d="M41 22 V8 M37 12 L41 8 L45 12"/>',
  'counterflame': '<path d="M8 38 L28 18 M40 38 L20 18"/><path d="M24 3 C18 10 18 14 24 18 C30 14 30 10 24 3 Z"/><path d="M13 42 L5 34 M35 42 L43 34"/>',
  'grave-hound': '<path d="M44 22 L31 20 L26 13 L23 19 L13 21 C9 22 8 27 12 29 L20 31 L15 39 L25 32 L32 34 L44 28"/><path d="M44 22 L36 25 L44 28"/><circle cx="30" cy="24" r="1.5"/><path d="M4 18 H9 M3 25 H7 M5 32 H10" stroke-dasharray="2 2"/>',
  'static-edge': '<path d="M6 42 L28 20 L33 17 L30 22 L9 45"/><path d="M34 4 L27 13 L35 15 L29 25"/><path d="M39 19 L44 15 M40 26 L46 26"/>',
  // Legendaries
  'gale-crescent': '<path d="M12 5 C30 9 36 31 16 43 C27 30 25 15 12 5 Z"/><path d="M30 14 H42 M33 24 H46 M30 34 H41"/>',
  'pyre': '<path d="M24 4 C16 14 13 22 15 30 C16 36 32 36 33 30 C35 22 32 14 24 4 Z"/><path d="M24 18 C21 23 21 27 24 30 C27 27 27 23 24 18 Z"/><path d="M5 42 H43 M10 38 H38"/>',
  'ember-twin': '<circle cx="15" cy="9" r="4"/><path d="M15 13 V27 M8 19 H22 M15 27 L10 40 M15 27 L20 40"/><circle cx="33" cy="9" r="4" stroke-dasharray="2 2"/><path d="M33 13 V27 M26 19 H40 M33 27 L28 40 M33 27 L38 40" stroke-dasharray="3 2"/>',
  'meteor-fall': '<circle cx="30" cy="22" r="7"/><path d="M6 4 L24 18 M15 3 L26 14 M4 13 L23 21"/><path d="M6 42 H42 M17 42 L21 35 M31 42 L28 35 M24 42 V36"/>',
  'storm-king': '<path d="M9 22 L9 10 L16 16 L24 7 L32 16 L39 10 L39 22 Z"/><path d="M27 26 L19 36 H27 L21 45"/>',
  'time-rift': '<circle cx="24" cy="24" r="16"/><path d="M24 14 V24 L30 28"/><path d="M40 8 L34 14 L38 17 L31 24 L35 27 L28 34" stroke-dasharray="3 2"/>',
  'thousand-blades': '<path d="M12 4 V24 L12 29 M8 9 H16"/><path d="M24 10 V32 L24 37 M20 15 H28"/><path d="M36 4 V24 L36 29 M32 9 H40"/><path d="M6 44 H42" stroke-dasharray="2 4"/>',
  'blood-moon': '<path d="M30 6 A17 17 0 1 0 42 32 A13 13 0 1 1 30 6 Z"/><path d="M20 34 C17 38 17 40 20 42 C23 40 23 38 20 34 Z"/><path d="M30 40 V44"/>',
};
const ABILITY_RARITY_WORD = { common: 'Common', rare: 'Rare', legendary: 'Legendary' };
const ABILITY_LEVEL_MARK = ['I', 'II', 'III', 'IV', 'V', 'VI'];
// One number of a card: a percentage, or in its ABILITY_UNITS unit.
function abilityAmount(key, x) {
  const unit = ABILITY_UNITS[key];
  if (unit === 's' || unit === 'm') return `${+x.toFixed(2)} ${unit}`;
  if (unit === 'n') return String(Math.round(x));
  return Math.round(x * 100) + '%';
}
// A card's text at `level` as parts ({ text, strong }): each number in bold, as "before → after" on an upgrade.
function abilityCardText(b, level) {
  const now = abilityAt(b, level), was = level > 1 ? abilityAt(b, level - 1) : null, parts = [];
  let from = 0;
  for (const m of b.text.matchAll(/\{(\w+)\}/g)) {
    const a = abilityAmount(m[1], now[m[1]]), w = was && abilityAmount(m[1], was[m[1]]);
    parts.push({ text: b.text.slice(from, m.index) }, { text: w && w !== a ? `${w} → ${a}` : a, strong: true });
    from = m.index + m[0].length;
  }
  parts.push({ text: b.text.slice(from) });
  return parts.filter(p => p.text);
}
// The card for ability `b` offered to someone holding `held`: a button (the pick sets its click), `key` its number
// key, `swift` true for a swift kill's extra card.
function abilityCard(b, held, key, swift) {
  const level = Math.min(abilityLevel(b, held) + 1, b.levels.length), make = (tag, cls, text) => {
    const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n;
  };
  const card = make('button', 'bcard'); card.type = 'button'; card.dataset.ability = b.id; card.dataset.rarity = b.rarity;
  const well = make('span', 'bcard-well');
  well.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ABILITY_ICONS[b.id] || ''}</svg>`;
  const words = make('span', 'bcard-words'), name = make('strong', 'bcard-name', b.name);
  words.appendChild(name);
  if (level > 1) name.appendChild(make('span', 'bcard-level', `${ABILITY_LEVEL_MARK[level - 2]} → ${ABILITY_LEVEL_MARK[level - 1]}`));
  const text = make('span', 'bcard-text');
  for (const part of abilityCardText(b, level)) text.appendChild(part.strong ? make('b', '', part.text) : document.createTextNode(part.text));
  words.appendChild(text);
  const foot = make('span', 'bcard-foot'), rarity = make('span', 'bcard-rarity', ABILITY_RARITY_WORD[b.rarity]);
  if (swift) rarity.appendChild(make('em', 'swift', 'Swift kill'));
  foot.append(rarity, make('kbd', 'ui-key', String(key)));
  words.appendChild(foot);
  card.append(well, words);
  return card;
}
// The pick's look. Tall cards in a row over the HUD; on a narrow or short screen, rows (a 2×2 grid when wide enough).
(() => {
  const style = document.createElement('style');
  style.id = 'abilityCards';
  style.textContent = `#abilityScreen[hidden]{display:none}
  #abilityScreen{--rare:#8fb8dc;--leg:#e59a5c;--body:#cfc8b6;position:fixed;inset:0;z-index:46;display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
    box-sizing:border-box;overflow:auto;overscroll-behavior:contain;background:#080a0cdb;color:var(--ui-ink);font:400 15px/1.45 var(--ui-text)}
  #abilityScreen .ability-panel{width:min(100%,var(--pick-w,932px))}
  #abilityScreen .ability-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:12px}
  #abilityScreen h2{margin:0;font:400 var(--ui-size-head)/1.1 var(--ui-display);color:var(--ui-ink)}
  #abilityClock{font:500 15px/1 var(--ui-text);color:var(--ui-muted);font-variant-numeric:tabular-nums}
  #abilityScreen .ability-time{height:2px;margin-bottom:18px;background:var(--ui-line)}
  #abilityTimeFill{display:block;height:100%;background:var(--ui-accent);transform-origin:left}
  #abilityChoices{display:flex;justify-content:space-between;gap:12px}
  .bcard{--rc:var(--body);all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;width:216px;min-height:330px;padding:20px 18px 16px;
    text-align:center;background:var(--ui-panel);border:1px solid var(--ui-line);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .bcard[data-rarity=rare]{--rc:var(--rare)}.bcard[data-rarity=legendary]{--rc:var(--leg)}
  .bcard-well{display:grid;place-items:center;flex:none;width:96px;height:96px;box-sizing:border-box;background:var(--ui-well);border:1px solid var(--ui-line);border-bottom:2px solid var(--rc)}
  .bcard-well svg{width:56px;height:56px;fill:none;stroke:var(--rc);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
  .bcard-words{display:flex;flex-direction:column;align-items:center;flex:1;width:100%}
  .bcard-name{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:18px;font:400 22px/1.15 var(--ui-display);color:var(--ui-ink)}
  .bcard-level{font:500 14px/1 var(--ui-text);color:var(--ui-accent)}
  .bcard-text{margin-top:12px;font:400 14px/1.45 var(--ui-text);color:var(--body);text-wrap:pretty}
  .bcard-text b{color:var(--ui-ink);font-weight:600;white-space:nowrap}
  .bcard-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;margin-top:auto;padding-top:14px;font:500 13px/1.2 var(--ui-text)}
  .bcard-rarity{color:var(--rc);text-align:left}
  .bcard-rarity .swift{font-style:normal;color:var(--ui-ink)}.bcard-rarity .swift::before{content:'·';margin:0 .45em;color:var(--ui-muted)}
  .bcard:hover:not(:disabled){background:#14171a;border-color:var(--ui-line-hi)}
  .bcard:focus-visible,.bcard[aria-pressed=true]{border-color:var(--ui-accent);outline:1px solid var(--ui-accent);outline-offset:-1px;background:#17150f}
  .bcard:disabled{opacity:.4;cursor:default}
  #abilityScreen.ability-pad .ui-key{display:none}
  #abilityStatus{margin:14px 0 0;color:var(--ui-muted)}#abilityStatus:empty{display:none}
  @media (hover:none){#abilityChoices .ui-key{display:none}}
  @media (max-width:900px),(max-height:560px){
    #abilityScreen{place-items:end center;padding-top:16px}
    #abilityScreen .ability-panel{width:min(100%,640px)}
    #abilityScreen h2{font-size:22px}
    #abilityChoices{display:grid;grid-template-columns:1fr;gap:8px}
    .bcard{flex-direction:row;align-items:flex-start;gap:14px;width:auto;min-height:44px;padding:14px;text-align:left;border-left:2px solid var(--rc)}
    .bcard-well{width:auto;height:auto;background:none;border:0}
    .bcard-well svg{width:30px;height:30px}
    .bcard-words{align-items:stretch}
    .bcard-name{flex-direction:row;align-items:baseline;gap:10px;margin-top:0;font-size:19px}
    .bcard-text{margin-top:5px}
    .bcard-foot{margin-top:0;padding-top:7px;font-size:12px}}
  @media (max-height:560px) and (min-width:600px){#abilityScreen .ability-panel{width:min(100%,860px)}#abilityChoices{grid-template-columns:1fr 1fr}}`;
  document.head.appendChild(style);
})();
