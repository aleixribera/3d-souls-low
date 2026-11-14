'use strict';
// ============================================================================
// Levels and crates, drawn (PLAN.md track B item 7): the crate roll (a strip of rewards spins past a mark, eases to a
// stop on one, and that reward is shown with what it is and does), the Collection (level, crates to open, every blade
// look and crate ability, owned or locked; an owned look is worn by choosing it), the end-of-run screen's rewards, and
// the blade look on a body. The store and the draw are js/progress.js; what a crate holds js/data/crates.js.
// Presentation only: the roll's effects are the one place menus keep animation (PLAN.md track B item 3).
// ============================================================================
const crateScreen = (() => {
  const RAR_WORD = { common: 'Common', rare: 'Rare', legendary: 'Legendary' };
  const RAR_COLOUR = { common: 0xcfc8b6, rare: 0x8fb8dc, legendary: 0xe59a5c };
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const hex = c => '#' + c.toString(16).padStart(6, '0');
  const calm = () => typeof reducedMotion === 'function' && reducedMotion();

  // ---- the blade look on a body ----------------------------------------------------------------------------------
  // A rig's blade (its weaponMat) in look `id`: the tint over the steel, its metal and roughness, and a glow that the
  // wind-up and hit flashes add to (js/rig.js). Unknown or missing ids wear the steel as forged.
  function wearLook(rig, id) {
    const L = CRATE_BY_ID[id]?.kind === 'look' ? CRATE_BY_ID[id] : CRATES.rewards.find(r => r.start && r.kind === 'look');
    if (!rig || !rig.weaponMat || !rig.weaponBase || !L) return;
    rig.weaponBase.setHex(L.tint); rig.weaponMat.color.copy(rig.weaponBase);
    rig.weaponMat.metalness = L.metal; rig.weaponMat.roughness = L.rough;
    rig.weaponGlow = L.glow !== undefined ? new THREE.Color(L.glow).multiplyScalar(L.glowK) : null;
    if (rig.weaponGlow) rig.weaponMat.emissive.copy(rig.weaponGlow); else rig.weaponMat.emissive.setRGB(0, 0, 0);
  }

  // ---- tiles ----------------------------------------------------------------------------------------------------
  let uid = 0;
  // A look's blade, drawn: its colour is the tint over plain steel, lit from the top; a glow look glows.
  function bladeSvg(L) {
    const g = `cg${++uid}`, c = new THREE.Color(L.tint).multiply(new THREE.Color(0xb4b8be));
    const hi = c.clone().lerp(new THREE.Color(0xffffff), 0.35 - L.rough * 0.15), lo = c.clone().multiplyScalar(0.55);
    const glow = L.glow !== undefined ? ` style="filter:drop-shadow(0 0 ${(3 + L.glowK * 8).toFixed(1)}px ${hex(L.glow)})"` : '';
    return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"${glow}><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">`
      + `<stop offset="0" stop-color="#${hi.getHexString()}"/><stop offset="1" stop-color="#${lo.getHexString()}"/></linearGradient></defs>`
      + `<path d="M14 31 L37.5 7.5 L41.5 6.5 L40.5 10.5 L17 34 Z" fill="url(#${g})" stroke="#000" stroke-opacity=".45" stroke-width=".6"/>`
      + `<path d="M15.5 32.5 L39 9" stroke="#fff" stroke-opacity=".28" stroke-width=".7"/>`
      + `<path d="M9.5 28.5 L19.5 38.5" stroke="#6e6656" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M13 35 L7.5 40.5" stroke="#4a3a2a" stroke-width="3.2" stroke-linecap="round"/><circle cx="6.5" cy="41.5" r="2.2" fill="#6e6656"/></svg>`;
  }
  const abilitySvg = b => `<svg class="ctile-line" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ABILITY_ICONS[b.ability] || ''}</svg>`;
  const iconOf = r => r.kind === 'look' ? bladeSvg(r) : abilitySvg(r);
  const textOf = r => r.kind === 'look' ? r.text : ABILITY_BY_ID[r.ability].text;
  // A reward's tile: its picture in a well edged in its rarity's colour, and its name.
  function tile(r, tag = 'span') {
    const t = make(tag, 'ctile'); t.dataset.rarity = crateRarity(r); t.dataset.reward = r.id;
    const well = make('span', 'ctile-well'); well.innerHTML = iconOf(r);
    t.append(well, make('span', 'ctile-name', crateName(r)));
    return t;
  }
  // What a reward does, as the ability cards say it (its numbers in bold, at level 1).
  function describe(r, into) {
    into.replaceChildren();
    if (r.kind === 'look') { into.textContent = r.text; return; }
    for (const part of abilityCardText(ABILITY_BY_ID[r.ability], 1, true)) into.appendChild(part.strong ? make('b', '', part.text) : document.createTextNode(part.text));
  }

  // ---- the screen --------------------------------------------------------------------------------------------------
  const root = make('section'); root.id = 'crates'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'cratesTitle');
  root.innerHTML = `<div class="crates-view" id="cratesCollection">
    <header class="crates-head"><h2 id="cratesTitle">Collection</h2><div class="crates-level"><span id="cratesLevel"></span>
      <span class="crates-xp" aria-hidden="true"><span id="cratesXpFill"></span></span><span id="cratesXpText"></span></div></header>
    <div class="crates-open"><button type="button" id="cratesOpen" class="ui-primary"></button><p id="cratesNone"></p></div>
    <h3 class="crates-section">Blade looks</h3><div class="crates-grid" id="cratesLooks" role="group" aria-label="Blade looks"></div>
    <h3 class="crates-section">Abilities</h3><div class="crates-grid" id="cratesAbilities" role="group" aria-label="Crate abilities"></div>
    <footer class="crates-foot"><button type="button" id="cratesBack" class="ui-text-button"><span class="ui-key crates-esc" aria-hidden="true"></span>Back</button></footer>
  </div>
  <div class="crates-view roll-view" id="cratesRoll" hidden>
    <header class="crates-head"><h2 id="rollTitle">Crate</h2></header>
    <div class="roll-band" id="rollBand"><div class="roll-beam" id="rollBeam"></div><div class="roll-strip" id="rollStrip" aria-hidden="true"></div><div class="roll-mark" aria-hidden="true"></div>
      <canvas id="rollFx" aria-hidden="true"></canvas></div>
    <div class="roll-reveal" id="rollReveal" aria-live="polite" hidden><h3 id="rollName"></h3>
      <p class="roll-text" id="rollText"></p><p class="roll-kind" id="rollKind"></p></div>
    <div class="roll-actions" id="rollActions"><button type="button" id="rollAgain" class="ui-primary"></button>
      <button type="button" id="rollDone" class="ui-text-button"><span class="ui-key crates-esc" aria-hidden="true"></span>Done</button></div>
  </div>`;
  document.body.appendChild(root);
  const $c = id => root.querySelector('#' + id);
  const style = make('style'); style.id = 'crateScreen';
  style.textContent = `#crates[hidden],#crates [hidden]{display:none!important}
  #crates{--rare:#8fb8dc;--leg:#e59a5c;--body:#cfc8b6;position:fixed;inset:0;z-index:130;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;
    padding:max(48px,env(safe-area-inset-top)) max(64px,env(safe-area-inset-right)) max(32px,env(safe-area-inset-bottom)) max(64px,env(safe-area-inset-left));
    background:var(--ui-well);color:var(--ui-ink);font:var(--ui-size-text)/1.5 var(--ui-text)}
  #crates button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .crates-view{width:min(1152px,100%)}
  .crates-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:12px 32px}
  .crates-head h2{margin:0;font:400 var(--ui-size-title)/1.1 var(--ui-display)}
  .crates-level{display:flex;align-items:center;gap:14px;font-variant-numeric:tabular-nums;color:var(--ui-muted)}
  #cratesLevel{font:400 var(--ui-size-head)/1 var(--ui-display);color:var(--ui-ink)}
  .crates-xp{display:block;width:180px;height:3px;background:var(--ui-line)}#cratesXpFill{display:block;height:100%;background:var(--ui-accent);transform-origin:left}
  .crates-open{display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px;margin:32px 0 8px}
  .crates-open .ui-primary{width:auto;min-width:240px}#cratesNone{margin:0;color:var(--ui-muted)}#cratesNone:empty{display:none}
  .crates-section{margin:32px 0 12px;padding-top:16px;border-top:1px solid var(--ui-line);font:400 var(--ui-size-row)/1.2 var(--ui-display);color:var(--ui-ink)}
  .crates-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}
  .crates-foot{margin-top:36px}
  .ctile{--rc:var(--body);all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 10px 10px;
    background:var(--ui-panel);border:1px solid var(--ui-line);text-align:center}
  .ctile[data-rarity=rare]{--rc:var(--rare)}.ctile[data-rarity=legendary]{--rc:var(--leg)}
  .ctile-well{display:grid;place-items:center;width:84px;height:84px;box-sizing:border-box;background:var(--ui-well);border:1px solid var(--ui-line);border-bottom:2px solid var(--rc)}
  .ctile-well svg{width:60px;height:60px}.ctile-line{fill:none;stroke:var(--rc);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
  .ctile-name{font:400 16px/1.2 var(--ui-display);color:var(--ui-ink)}
  .ctile-state{font:500 var(--ui-size-hint)/1.2 var(--ui-text);color:var(--rc)}.ctile-status{margin-top:-4px;font:400 var(--ui-size-hint)/1.2 var(--ui-text);color:var(--ui-muted)}
  button.ctile{cursor:pointer}button.ctile:hover:not(:disabled){background:#14171a;border-color:var(--ui-line-hi)}
  button.ctile:focus-visible,button.ctile.pad-selected{border-color:var(--ui-accent);outline:1px solid var(--ui-accent);outline-offset:-1px;background:#17150f}
  .ctile[aria-pressed=true]{border-color:var(--ui-accent)}.ctile[aria-pressed=true] .ctile-status{color:var(--ui-accent-hi)}
  .ctile.locked .ctile-well svg{opacity:.18;filter:grayscale(1)}.ctile.locked .ctile-name{color:var(--ui-muted)}
  .ctile:disabled{cursor:default}
  #crates .ui-text-button.pad-selected,#crates .ui-primary.pad-selected{outline:2px solid var(--ui-accent-hi);outline-offset:3px}
  /* The roll */
  .roll-view .crates-head{margin-bottom:28px}
  .roll-band{position:relative;height:212px;margin:0 calc(-1 * max(64px,env(safe-area-inset-left))) 0;overflow:hidden;
    border-top:1px solid var(--ui-line);border-bottom:1px solid var(--ui-line);background:#0b0d10;
    -webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)}
  .roll-strip{position:absolute;left:0;top:20px;display:flex;gap:10px;will-change:transform}
  .roll-strip .ctile{flex:none;width:150px;height:172px;justify-content:center;transition:opacity .35s,transform .45s cubic-bezier(.2,1.4,.4,1)}
  .roll-strip .ctile-well{width:96px;height:96px}.roll-strip .ctile-well svg{width:68px;height:68px}
  .roll-mark{position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--ui-accent);box-shadow:0 0 10px #d9b56b99;z-index:2;transition:background .3s,box-shadow .3s}
  .roll-band.landed .roll-mark{background:transparent;box-shadow:none}   /* landed: only the notches, no line through the name */
  .roll-mark::before,.roll-mark::after{content:'';position:absolute;left:-7px;border:8px solid transparent}
  .roll-mark::before{top:0;border-top-color:var(--ui-accent)}.roll-mark::after{bottom:0;border-bottom-color:var(--ui-accent)}
  .roll-band canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}
  .roll-beam{position:absolute;left:50%;top:-20%;width:240px;height:140%;margin-left:-120px;opacity:0;pointer-events:none;
    background:radial-gradient(closest-side,var(--beam,#e59a5c) 0%,transparent 100%);transform:scaleY(.2)}
  .roll-band.landed .ctile{opacity:.28}.roll-band.landed .ctile.won{opacity:1;transform:scale(1.08);border-color:var(--rc);box-shadow:0 0 0 1px var(--rc),0 0 28px -4px var(--rc)}
  .roll-band.landed .roll-beam{animation:rollBeam 1.6s ease-out forwards}
  .roll-band.shake{animation:rollShake .42s linear}
  @keyframes rollBeam{0%{opacity:0;transform:scaleY(.2)}18%{opacity:.55;transform:scaleY(1)}100%{opacity:.16;transform:scaleY(1)}}
  @keyframes rollShake{0%,100%{transform:none}20%{transform:translate(-5px,2px)}40%{transform:translate(4px,-3px)}60%{transform:translate(-3px,1px)}80%{transform:translate(2px,-1px)}}
  .roll-reveal{--rc:var(--body);margin-top:28px;min-height:150px;animation:rollUp .45s cubic-bezier(.2,.9,.3,1)}
  .roll-reveal[data-rarity=rare]{--rc:var(--rare)}.roll-reveal[data-rarity=legendary]{--rc:var(--leg)}
  .roll-rarity{font-weight:600;color:var(--rc)}
  #rollName{margin:0;font:400 34px/1.1 var(--ui-display);color:var(--ui-ink)}
  .roll-text{margin:10px 0 0;font:400 17px/1.45 var(--ui-text);color:var(--body)}.roll-text b{color:var(--ui-ink);font-weight:600}
  .roll-kind{margin:6px 0 0;color:var(--ui-muted)}
  @keyframes rollUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .roll-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px;margin-top:24px}.roll-actions .ui-primary{width:auto;min-width:240px}
  .roll-actions.spinning{visibility:hidden}
  #crates.pad .crates-esc{display:none}
  @media (prefers-reduced-motion:reduce){.roll-reveal,.roll-band.shake{animation:none}.roll-strip .ctile,.roll-mark{transition:none}.roll-band.landed .roll-beam{animation:none;opacity:.16;transform:none}}
  @media (max-width:640px){
    #crates{padding:max(32px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom))}
    .crates-head h2{font-size:32px}.crates-xp{width:110px}
    .crates-open .ui-primary,.roll-actions .ui-primary{flex:1 1 100%}
    .crates-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px}
    .ctile-well{width:64px;height:64px}.ctile-well svg{width:46px;height:46px}.ctile-name{font-size:14px}
    .roll-band{height:168px;margin:0 -16px}.roll-strip{top:16px;gap:8px}.roll-strip .ctile{width:112px;height:136px;gap:6px;padding:8px 6px}
    .roll-strip .ctile-well{width:72px;height:72px}.roll-strip .ctile-well svg{width:52px;height:52px}.roll-strip .ctile-name{font-size:13px}
    #rollName{font-size:28px}}
  @media (hover:none) and (pointer:coarse){.crates-esc{display:none}}`;
  document.head.appendChild(style);

  // ---- the Collection ------------------------------------------------------------------------------------------------
  let opener = null, from = null, onClose = null;   // the element focused before, and where Done/Back leads ('collection' or out)
  function drawCollection() {
    const L = progress.level, n = progress.crates;
    $c('cratesLevel').textContent = `Level ${L.level}`;
    $c('cratesXpFill').style.transform = `scaleX(${Math.min(1, L.into / L.need)})`;
    $c('cratesXpText').textContent = `${L.into} / ${L.need}`;
    const open = $c('cratesOpen');
    open.textContent = n ? `Open a crate` : 'No crates to open';
    if (n) open.appendChild(make('span', 'crates-count', `· ${n}`));
    open.disabled = !n;
    $c('cratesNone').textContent = n ? '' : 'Each level gives one. Play Boss Rush to earn levels.';
    for (const [grid, kind] of [[$c('cratesLooks'), 'look'], [$c('cratesAbilities'), 'ability']]) {
      grid.replaceChildren();
      for (const r of CRATES.rewards.filter(x => x.kind === kind)) {
        const mine = progress.owns(r.id), t = tile(r, 'button');
        t.type = 'button'; t.classList.toggle('locked', !mine);
        // Its rarity in words (never by colour alone), then where it stands, unless it is simply yours.
        const rarity = RAR_WORD[crateRarity(r)], state = !mine ? 'Locked' : kind === 'ability' ? 'In your pool' : progress.look === r.id ? 'Worn' : '';
        t.appendChild(make('span', 'ctile-state', rarity));
        if (state) t.appendChild(make('span', 'ctile-status', state));
        t.setAttribute('aria-label', `${crateName(r)}, ${rarity}. ${textOf(r).replace(/\{\w+\}/g, '').replace(/\s+([.,:])/g, '$1')}${state ? ` ${state}.` : ''}`);
        if (kind === 'look') { t.setAttribute('aria-pressed', String(progress.look === r.id)); t.disabled = !mine; t.onclick = () => wear(r.id); }
        else t.disabled = true;
        grid.appendChild(t);
      }
    }
  }
  function wear(id) {
    if (!progress.wear(id)) return;
    events.emit('menuConfirm');
    const at = document.activeElement?.dataset.reward;
    drawCollection();
    if (at) root.querySelector(`.ctile[data-reward="${at}"]`)?.focus({ preventScroll: true });
  }
  function show(view) {
    $c('cratesCollection').hidden = view !== 'collection'; $c('cratesRoll').hidden = view !== 'roll';
    root.classList.toggle('pad', usingPad());
    for (const k of root.querySelectorAll('.crates-esc')) k.textContent = usingPad() ? 'B' : 'Esc';
  }
  // `then` runs once the screen closes (the title redraws its line).
  function openCollection(then) {
    if (!root.hidden && from) return;
    opener = root.hidden ? document.activeElement : opener; from = 'collection';
    if (typeof then === 'function') onClose = then;
    root.hidden = false; input.clear(); if (document.pointerLockElement) document.exitPointerLock();
    drawCollection(); show('collection');
    const first = $c('cratesOpen');
    (first.disabled ? $c('cratesBack') : first).focus({ preventScroll: true });
  }
  function close() {
    if (root.hidden) return;
    stopRoll(); root.hidden = true; from = null;
    events.emit('menuBack');
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
    if (onClose) { const fn = onClose; onClose = null; fn(); }
  }

  // ---- the roll ------------------------------------------------------------------------------------------------------
  const fx = { canvas: $c('rollFx'), parts: [], raf: 0 };
  let roll = null;   // { reward, fresh, start, end, settle, t, time, index, done }
  function startRoll(after) {
    const result = progress.open();
    if (!result) return false;
    if (root.hidden) { opener = document.activeElement; root.hidden = false; input.clear(); if (document.pointerLockElement) document.exitPointerLock(); }
    if (after !== undefined) from = after;
    show('roll');
    const band = $c('rollBand'), strip = $c('rollStrip');
    band.classList.remove('landed', 'shake'); $c('rollReveal').hidden = true; $c('rollActions').classList.add('spinning');
    strip.replaceChildren(...result.strip.map(id => tile(CRATE_BY_ID[id])));
    const won = strip.children[CRATES.roll.land]; won.classList.add('won');
    const first = strip.children[0], P = first.offsetWidth + parseFloat(getComputedStyle(strip).columnGap || '10'), W = first.offsetWidth, cx = band.clientWidth / 2;
    const at = i => cx - (i * P + W / 2), jitter = (Math.random() * 2 - 1) * W * 0.36;
    const time = calm() ? CRATES.roll.still : CRATES.roll.time;
    roll = { ...result, P, W, cx, start: at(calm() ? CRATES.roll.land - 6 : 2), end: at(CRATES.roll.land) - jitter, centre: at(CRATES.roll.land), t: 0, time, index: -1, settle: 0, done: false, last: performance.now() };
    strip.style.transform = `translateX(${roll.start}px)`;
    audio.play('crateOpen');
    sizeFx(); $c('rollDone').blur(); root.focus?.();
    cancelAnimationFrame(fx.raf); fx.raf = requestAnimationFrame(step);
    return true;
  }
  // The strip's ease: fast at first, a long slowing onto the reward (quartic out).
  const ease = t => 1 - Math.pow(1 - t, 4);
  function step(now) {
    const r = roll; if (!r) return;
    const dt = Math.min(0.05, (now - r.last) / 1000); r.last = now;
    const strip = $c('rollStrip');
    if (!r.done) {
      r.t = Math.min(r.time, r.t + dt);
      const x = r.start + (r.end - r.start) * ease(r.t / r.time);
      strip.style.transform = `translateX(${x}px)`;
      const index = Math.floor((r.cx - x) / r.P);   // the tile under the mark
      if (index !== r.index) { if (r.index >= 0) audio.play('crateTick', { pitch: 0.9 + Math.random() * 0.2 }); r.index = index; }
      if (r.t >= r.time) land();
    } else if (r.settle < 1) {   // after the stop, the reward slides under the mark
      r.settle = Math.min(1, r.settle + dt / 0.4);
      const k = 1 - Math.pow(1 - r.settle, 3);
      strip.style.transform = `translateX(${r.end + (r.centre - r.end) * k}px)`;
    }
    stepFx(dt);
    if (!r.done || r.settle < 1 || fx.parts.length) fx.raf = requestAnimationFrame(step);
  }
  function land() {
    const r = roll, rarity = crateRarity(r.reward), band = $c('rollBand');
    r.done = true;
    band.style.setProperty('--beam', hex(RAR_COLOUR[rarity]));
    band.classList.add('landed');
    if (rarity === 'legendary' && !calm()) band.classList.add('shake');
    audio.play('crateLand', { pitch: { common: 1, rare: 0.84, legendary: 0.7 }[rarity], vel: rarity === 'common' ? 0.6 : 0.95 });
    audio.play('abilityPick', { pitch: { common: 1, rare: 0.84, legendary: 0.67 }[rarity], vel: rarity === 'common' ? 0.5 : 0.9 });
    if (!calm()) burst(rarity);
    const reveal = $c('rollReveal'), R = r.reward;
    reveal.dataset.rarity = rarity; reveal.hidden = false;
    $c('rollName').textContent = crateName(R);
    describe(R, $c('rollText'));
    // What it is and what it did, its rarity first in the rarity's colour (no label above the name).
    const what = R.kind === 'look' ? ' blade look' : ' ability';
    $c('rollKind').replaceChildren(make('span', 'roll-rarity', RAR_WORD[rarity]),
      !r.fresh ? `${what}, already yours.` : R.kind === 'look' ? `${what}. You wear it now.` : `${what}. It can now be offered in Boss Rush.`);
    const again = $c('rollAgain'), left = progress.crates;
    again.hidden = !left; again.textContent = 'Open another'; if (left) again.appendChild(make('span', 'crates-count', `· ${left}`));
    $c('rollActions').classList.remove('spinning');
    (left ? again : $c('rollDone')).focus({ preventScroll: true });
  }
  // Hurry the strip to its last half second (a press while it spins).
  function hurry() { if (roll && !roll.done && roll.t < roll.time - 0.5) roll.t = roll.time - 0.5; }
  function stopRoll() { cancelAnimationFrame(fx.raf); fx.parts.length = 0; clearFx(); roll = null; }
  function rollDone() {
    if (roll && !roll.done) { hurry(); return; }
    stopRoll();
    if (from === 'collection') { drawCollection(); show('collection'); ($c('cratesOpen').disabled ? $c('cratesBack') : $c('cratesOpen')).focus({ preventScroll: true }); events.emit('menuBack'); }
    else close();
  }

  // The landing's sparks and embers on the band's canvas: a burst from the reward, more and longer as it is rarer.
  function sizeFx() {
    const c = fx.canvas, r = c.getBoundingClientRect(), k = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * k)); c.height = Math.max(1, Math.round(r.height * k)); fx.k = k;
  }
  function clearFx() { const g = fx.canvas.getContext('2d'); g.clearRect(0, 0, fx.canvas.width, fx.canvas.height); }
  function burst(rarity) {
    const n = { common: 26, rare: 60, legendary: 130 }[rarity], c = new THREE.Color(RAR_COLOUR[rarity]), gold = new THREE.Color(0xf1d9a1);
    const x = fx.canvas.width / fx.k / 2, y = fx.canvas.height / fx.k / 2;
    for (let i = 0; i < n; i++) {
      const spark = i % 3 !== 0, a = Math.random() * Math.PI * 2, v = spark ? 160 + Math.random() * (rarity === 'legendary' ? 520 : 340) : 20 + Math.random() * 60;
      const col = (rarity === 'legendary' && Math.random() < 0.35 ? gold : c).clone().lerp(new THREE.Color(0xffffff), Math.random() * 0.4);
      fx.parts.push({ x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 70, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.55 - (spark ? 0 : 40),
        life: 0, max: spark ? 0.45 + Math.random() * 0.5 : 1.2 + Math.random() * (rarity === 'legendary' ? 1.6 : 0.9), spark, size: spark ? 1.4 : 1.6 + Math.random() * 2.2,
        col: `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}` });
    }
  }
  function stepFx(dt) {
    if (!fx.parts.length) return;
    const g = fx.canvas.getContext('2d'), k = fx.k;
    g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, fx.canvas.width, fx.canvas.height); g.globalCompositeOperation = 'lighter';
    for (let i = fx.parts.length - 1; i >= 0; i--) {
      const p = fx.parts[i]; p.life += dt;
      if (p.life >= p.max) { fx.parts.splice(i, 1); continue; }
      const drag = p.spark ? 2.6 : 0.9; p.vx -= p.vx * drag * dt; p.vy -= p.vy * drag * dt + (p.spark ? -60 : 26) * dt;
      const ox = p.x, oy = p.y; p.x += p.vx * dt; p.y += p.vy * dt;
      const a = 1 - p.life / p.max;
      if (p.spark) { g.strokeStyle = `rgba(${p.col},${a})`; g.lineWidth = p.size; g.beginPath(); g.moveTo(ox - p.vx * 0.02, oy - p.vy * 0.02); g.lineTo(p.x, p.y); g.stroke(); }
      else { g.fillStyle = `rgba(${p.col},${a * 0.9})`; g.beginPath(); g.arc(p.x, p.y, p.size * (0.6 + a * 0.4), 0, Math.PI * 2); g.fill(); }
    }
    g.globalCompositeOperation = 'source-over';
    if (!fx.parts.length) clearFx();
  }

  // ---- input: keys, pad, clicks ------------------------------------------------------------------------------------
  root.tabIndex = -1;
  $c('cratesOpen').onclick = () => { events.emit('menuConfirm'); startRoll('collection'); };
  $c('cratesBack').onclick = () => close();
  $c('rollAgain').onclick = () => { if (roll && !roll.done) return; events.emit('menuConfirm'); startRoll(); };
  $c('rollDone').onclick = () => rollDone();
  $c('rollBand').onclick = () => hurry();
  const focusables = () => [...root.querySelectorAll('.crates-view:not([hidden]) button')].filter(b => !b.hidden && !b.disabled && b.offsetParent !== null
    && !b.closest('.spinning'));
  // Moves focus to the nearest control that way (the grids and the buttons as laid out on screen).
  function move(dir) {
    const list = focusables(), at = document.activeElement;
    if (!list.length) return;
    if (!list.includes(at)) { list[0].focus({ preventScroll: false }); return; }
    const a = at.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, score = Infinity;
    for (const b of list) {
      if (b === at) continue;
      const r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
      const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy, across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      if (along <= 4) continue;
      const s = along + across * 2.5;
      if (s < score) { score = s; best = b; }
    }
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); events.emit('menuMove'); }
  }
  function back() { if (!$c('cratesRoll').hidden) rollDone(); else close(); }
  const KEY_DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  // Registered before the lobby's and the end screen's own key handlers (GAME_FILES order), so nothing under it moves.
  window.addEventListener('keydown', ev => {
    if (root.hidden) return;
    ev.stopImmediatePropagation(); input.use('keyboard'); root.classList.remove('pad');
    for (const k of root.querySelectorAll('.crates-esc')) k.textContent = 'Esc';
    if (ev.code === 'Escape') { ev.preventDefault(); if (!ev.repeat) back(); return; }
    if (KEY_DIR[ev.code]) { ev.preventDefault(); move(KEY_DIR[ev.code]); return; }
    if (ev.code === 'Tab') {
      ev.preventDefault(); const list = focusables(), at = list.indexOf(document.activeElement);
      list[(at + (ev.shiftKey ? -1 : 1) + list.length) % list.length]?.focus(); return;
    }
    if ((ev.code === 'Enter' || ev.code === 'Space') && roll && !roll.done) { ev.preventDefault(); hurry(); }
  }, true);
  let padDir = null, padTimer = 0;
  // The pad, while the screen is open: A presses, B goes back, the stick and the d-pad move. True when it took the input.
  function pad(pressed, dt = 1 / 60) {
    if (root.hidden) return false;
    if (pressed.length) { root.classList.add('pad'); for (const k of root.querySelectorAll('.crates-esc')) k.textContent = 'B'; }
    if (pressed.includes('PadB')) { back(); return true; }
    if (pressed.includes('PadA')) {
      if (roll && !roll.done) hurry();
      else { const at = document.activeElement; if (at && root.contains(at) && at.tagName === 'BUTTON' && !at.disabled) at.click(); else move('down'); }
      return true;
    }
    const C = CONFIG.gamepad, S = C.menuStick, m = gamepad.move;
    const dir = gamepad.down.has('PadUp') || m.y > S ? 'up' : gamepad.down.has('PadDown') || m.y < -S ? 'down'
      : gamepad.down.has('PadLeft') || m.x < -S ? 'left' : gamepad.down.has('PadRight') || m.x > S ? 'right' : null;
    if (dir !== padDir) { padDir = dir; padTimer = C.menuDelay; if (dir) move(dir); }
    else if (dir && (padTimer -= dt) <= 0) { padTimer = C.menuRepeat ?? 0.12; move(dir); }
    return true;
  }
  window.addEventListener('resize', () => { if (roll) sizeFx(); });

  // ---- the end of a run ----------------------------------------------------------------------------------------------
  // The rewards of a finished Boss Rush run on its end screen (`into`): xp, the level reached, the crates waiting and a
  // button to open one there. `run` is the server's summary; counted once by its key.
  function runRewards(into, run, played = true) {
    into.replaceChildren();
    const earned = played ? progress.award(run, typeof run.key === 'string' ? run.key : null) : null;
    const L = progress.level;
    const head = make('h3', 'summary-rewards-title', 'Rewards'); into.appendChild(head);
    const list = make('dl', 'summary-rewards');
    const row = (term, value) => { const d = make('div'); d.append(make('dt', '', term), make('dd', '', value)); list.appendChild(d); };
    if (earned) row('Experience', `+${earned.xp}`);
    row('Level', earned && earned.crates ? `${earned.before.level} → ${earned.after.level}` : String(L.level));
    row('Crates', String(progress.crates));
    into.appendChild(list);
    const bar = make('span', 'crates-xp'); const fill = make('span'); fill.style.cssText = `display:block;height:100%;background:var(--ui-accent);transform-origin:left;transform:scaleX(${Math.min(1, L.into / L.need)})`;
    bar.appendChild(fill); bar.title = `${L.into} / ${L.need} to level ${L.level + 1}`; into.appendChild(bar);
    const open = make('button', 'ui-button summary-crate', 'Open a crate'); open.type = 'button'; open.id = 'runSummaryCrate';
    open.hidden = !progress.crates;
    open.onclick = () => { events.emit('menuConfirm'); if (startRoll(null)) onClose = () => runRewardsRefresh(into); else runRewardsRefresh(into); };
    into.appendChild(open);
    return open;
  }
  // After a roll from the end screen: the counts again, nothing earned twice.
  function runRewardsRefresh(into) {
    const crates = into.querySelector('.summary-rewards div:last-child dd'); if (crates) crates.textContent = String(progress.crates);
    const open = into.querySelector('#runSummaryCrate'); if (open) open.hidden = !progress.crates;
    (progress.crates ? open : document.getElementById('runSummaryAgain'))?.focus?.({ preventScroll: true });
  }

  // The title's Collection row: the level, and the crates waiting.
  const titleLine = () => `Level ${progress.level.level}` + (progress.crates ? ` · ${progress.crates} ${progress.crates === 1 ? 'crate' : 'crates'} to open` : '');
  // Your own blade takes a new look at once (the others see it through the lobby's roster).
  progress.onChange(() => { if (typeof Game !== 'undefined' && Game.player && Game.player.rig) wearLook(Game.player.rig, progress.look); });
  return {
    get open() { return !root.hidden; },
    collection: openCollection, close, pad, wearLook, runRewards, titleLine,
    roll: () => startRoll(null),
    get rolling() { return !!roll && !roll.done; },
  };
})();
