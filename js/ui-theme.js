'use strict';
// The game's one UI direction (PLAN.md Track B item 2): tokens and a few shared pieces that every redone screen uses.
// The lobby is the first screen built on it (v7.63.0); the title, Practice, options, pause, the HUD and the Boss Rush
// screens move onto it next. Rules: one display face for names and titles, one text face for everything else; one
// accent that means "you / interactive"; square corners; no gradients; focus is a filled row with an accent edge.
//
// Pieces: .ui-title (a screen's title), .ui-label (a field's name), .ui-row (a choice in a list; aria-pressed=true is
// the chosen one), .ui-cycle (a value changed in place: ‹ select ›), .ui-primary (the screen's one strong action),
// .ui-button (any other action), .ui-text-button (quiet actions in a footer), .ui-key (a key cap inside a button, the
// key that does the same thing), .ui-hints (the navigation keys for the device used last).
(() => {
  const style = document.createElement('style');
  style.id = 'uiTheme';
  style.textContent = `:root{--ui-veil:#080a0cf0;--ui-panel:#101316;--ui-well:#06080a;--ui-line:#ffffff1a;--ui-line-hi:#d9b56b59;
    --ui-ink:#ece5d3;--ui-muted:#aaa493;--ui-accent:#d9b56b;--ui-accent-hi:#f1d9a1;--ui-accent-ink:#17130b;--ui-accent-wash:#d9b56b17;
    --ui-hover:#ffffff0c;--ui-alarm:#e0806a;--ui-good:#a5cc8c;--ui-body:#cfc8b6;
    --ui-common:#cfc8b6;--ui-rare:#8fb8dc;--ui-legendary:#e59a5c;
    --ui-display:'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;--ui-text:'Segoe UI',system-ui,-apple-system,sans-serif;
    --ui-size-hint:13px;--ui-size-text:15px;--ui-size-row:19px;--ui-size-head:24px;--ui-size-title:40px}
  .ui-title{margin:0;font:400 var(--ui-size-title)/1.1 var(--ui-display);color:var(--ui-ink);letter-spacing:.01em}
  .ui-label{display:block;margin:0 0 6px;font:500 var(--ui-size-hint)/1.4 var(--ui-text);color:var(--ui-muted);letter-spacing:0;text-transform:none}
  .ui-row{display:flex;align-items:center;gap:12px;width:100%;min-height:42px;margin:0;padding:0 14px 0 13px;text-align:left;
    font:400 var(--ui-size-row)/1.2 var(--ui-display);color:#cfc8b6;background:transparent;border:0;border-left:3px solid transparent;
    border-radius:0;cursor:pointer;transition:background-color .12s,color .12s}
  .ui-row:hover{background:var(--ui-hover);color:var(--ui-ink)}
  .ui-row[aria-pressed=true]{color:var(--ui-accent-hi);border-left-color:var(--ui-accent);background:var(--ui-accent-wash)}
  .ui-row:focus-visible,.ui-row.pad-selected{outline:1px solid var(--ui-accent);outline-offset:-1px;background:#d9b56b24;color:var(--ui-ink)}
  .ui-cycle{display:grid;grid-template-columns:36px minmax(0,1fr) 36px;align-items:stretch;min-height:44px;border:1px solid var(--ui-line);background:var(--ui-well)}
  .ui-cycle:focus-within{border-color:var(--ui-accent)}
  .ui-cycle .ui-step{all:unset;display:grid;place-items:center;cursor:pointer;color:var(--ui-accent);font:18px/1 var(--ui-text)}
  .ui-cycle .ui-step:hover{background:var(--ui-hover);color:var(--ui-accent-hi)}
  .ui-cycle select{all:unset;min-width:0;text-align:center;text-align-last:center;cursor:pointer;font:400 17px/44px var(--ui-display);color:var(--ui-ink);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ui-cycle select:focus-visible,.ui-cycle select.pad-selected{background:#d9b56b24;outline:none}
  .ui-primary{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;min-height:56px;padding:0 20px;
    font:600 17px/1 var(--ui-text);color:var(--ui-accent-ink);background:var(--ui-accent);border:0;border-radius:2px;cursor:pointer;transition:background-color .12s}
  .ui-primary:hover{background:var(--ui-accent-hi)}
  .ui-primary:focus-visible,.ui-primary.pad-selected{outline:2px solid var(--ui-ink);outline-offset:3px}
  .ui-primary:disabled{background:#3b3528;color:var(--ui-muted);cursor:default}
  .ui-button{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:42px;padding:0 16px;font:500 var(--ui-size-text)/1.2 var(--ui-text);
    color:var(--ui-ink);background:transparent;border:1px solid var(--ui-line);border-radius:2px;cursor:pointer;transition:background-color .12s,border-color .12s}
  .ui-button:hover{background:var(--ui-hover);border-color:var(--ui-line-hi)}
  .ui-button:focus-visible,.ui-button.pad-selected{outline:1px solid var(--ui-accent);outline-offset:-1px;background:#d9b56b24;border-color:var(--ui-accent)}
  .ui-button:disabled{opacity:.45;cursor:default}
  .ui-text-button{display:inline-flex;align-items:center;gap:10px;min-height:40px;padding:0 10px;font:500 var(--ui-size-text)/1.2 var(--ui-text);color:var(--ui-muted);
    background:transparent;border:0;border-radius:2px;cursor:pointer}
  .ui-text-button:hover{color:var(--ui-ink);background:var(--ui-hover)}
  .ui-text-button:focus-visible,.ui-text-button.pad-selected{color:var(--ui-ink);outline:1px solid var(--ui-accent);outline-offset:-1px;background:#d9b56b24}
  .ui-key{display:inline-grid;place-items:center;min-width:26px;height:24px;padding:0 6px;box-sizing:border-box;font:600 12px/1 var(--ui-text);
    color:var(--ui-ink);border:1px solid #ffffff40;border-bottom-width:2px;border-radius:3px;background:#ffffff0a;letter-spacing:0;white-space:nowrap}
  .ui-key:empty{display:none}
  .ui-primary .ui-key{color:var(--ui-accent-ink);border-color:#17130b66;background:transparent}
  .ui-hints{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin:0;font:400 var(--ui-size-hint)/1.4 var(--ui-text);color:var(--ui-muted)}
  .ui-hints span{display:inline-flex;align-items:center;gap:8px}
  .ui-mirror{position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;border:0!important;white-space:nowrap!important}
  @media (pointer:coarse){.ui-row,.ui-button,.ui-text-button{min-height:44px}}
  @media (prefers-reduced-motion:reduce){.ui-row,.ui-primary,.ui-button{transition:none}}`;
  document.head.appendChild(style);
})();
