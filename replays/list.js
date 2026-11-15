'use strict';
// The replay door's list (server/replays.cjs): every recorded multiplayer Boss Rush, newest first, grouped by day.
// A row opens the viewer (/watch?run=<id>); star and delete are one tap each (delete asks once, on the same button).
(() => {
  const FILTERS = 'arena-replay-filters', DAY = 86400000, KEEP_DAYS = 60;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = s => { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>';
  let runs = [], now = Date.now(), loaded = false, failed = false, timer = null;
  const filters = (() => { try { return { player: '', period: '0', starred: false, ...JSON.parse(localStorage.getItem(FILTERS) || '{}') }; } catch (e) { return { player: '', period: '0', starred: false }; } })();
  const saveFilters = () => { try { localStorage.setItem(FILTERS, JSON.stringify(filters)); } catch (e) { /* not kept */ } };

  function outcome(r) {
    if (r.live) return 'Live now';
    if (r.damaged) return 'Damaged';
    if (r.outcome === 'won') return 'Won';
    if (r.outcome === 'wiped') return 'Team wiped';
    if (r.outcome === 'left') return 'Left the run';
    if (r.outcome === 'error') return 'Stopped by an error';
    return 'Cut short';
  }
  function detail(r) {
    const bits = [];
    if (r.notes?.length) bits.push(`${r.notes.length} note${r.notes.length === 1 ? '' : 's'}`);
    if (!r.starred && !r.live) {
      const left = Math.ceil((r.startedAt + KEEP_DAYS * DAY - now) / DAY);
      if (left <= 10) bits.push(left <= 1 ? 'deleted tomorrow' : `deleted in ${left} days`);
    }
    return bits.join(' · ');
  }
  function visible() {
    const since = Number(filters.period) ? now - Number(filters.period) * DAY : 0;
    return runs.filter(r => (!filters.player || r.players.includes(filters.player)) && r.startedAt >= since && (!filters.starred || r.starred));
  }
  function draw() {
    // Who can be picked: everyone in any run, the chosen one kept even when they fall out of the list.
    const names = [...new Set(runs.flatMap(r => r.players))].sort((a, b) => a.localeCompare(b));
    if (filters.player && !names.includes(filters.player)) names.unshift(filters.player);
    const player = $('player');
    const options = '<option value="">Everyone</option>' + names.map(n => `<option>${esc(n)}</option>`).join('');
    if (player.dataset.options !== options) { player.innerHTML = options; player.dataset.options = options; }
    player.value = filters.player; $('period').value = filters.period;
    $('starred').setAttribute('aria-pressed', String(!!filters.starred));
    const list = $('list');
    // The filters only once there are runs to filter.
    document.querySelector('.filters').hidden = !loaded || !runs.length;
    if (!loaded) { list.innerHTML = ''; $('status').textContent = failed ? '' : 'Loading…'; if (failed) empty('The replays could not be loaded', 'The home server did not answer.', 'Try again', load, true); return; }
    $('status').textContent = '';
    $('foot').hidden = !runs.length;
    const shown = visible();
    if (!runs.length) { empty('No runs yet', 'Every online Boss Rush and Weekly Run is recorded here from its first fight.'); return; }
    if (!shown.length) { empty('No runs match', 'Nothing here for these filters.', 'Show every run', () => { filters.player = ''; filters.period = '0'; filters.starred = false; saveFilters(); draw(); }); return; }
    const days = new Map();
    for (const r of shown) {
      const d = new Date(r.startedAt), key = d.toDateString();
      if (!days.has(key)) days.set(key, { d, runs: [] });
      days.get(key).runs.push(r);
    }
    const focusId = document.activeElement?.closest?.('.run')?.dataset.id, focusClass = document.activeElement?.className;
    list.innerHTML = [...days.values()].map(({ d, runs }) => `<section class="day"><h2>${esc(dayName(d))}</h2><ol>${runs.map(row).join('')}</ol></section>`).join('');
    if (focusId) list.querySelector(`.run[data-id="${CSS.escape(focusId)}"] ${focusClass?.includes('star') ? '.star' : focusClass?.includes('del') ? '.del' : 'a'}`)?.focus();
  }
  function dayName(d) {
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const that = new Date(d); that.setHours(0, 0, 0, 0);
    const ago = Math.round((today - that) / DAY);
    if (ago === 0) return 'Today';
    if (ago === 1) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) });
  }
  const mode = r => r.mode === 'weekly' ? 'Weekly Run' : 'Boss Rush';
  function row(r) {
    const time = new Date(r.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const cls = r.live ? 'live' : r.outcome === 'won' ? 'won' : '';
    const who = r.players.length ? r.players.join(', ') : 'Bots only';
    return `<li class="run ${cls}" data-id="${esc(r.id)}">
      <a href="/watch?run=${encodeURIComponent(r.id)}" aria-label="${esc(`${mode(r)} at ${time}: ${outcome(r)}${r.reached ? ` at fight ${r.reached}` : ''}. ${who}. ${clock(r.duration)}`)}">
        <span class="time">${esc(time)}</span>
        <span class="what"><strong>${r.live ? '<i class="dot" aria-hidden="true"></i>' : ''}${esc(outcome(r))}</strong><span>${esc([r.mode === 'weekly' ? 'Weekly Run' : '', detail(r)].filter(Boolean).join(' · '))}</span></span>
        <span class="who"><span class="ptime">${esc(time)} · </span>${esc(who)}</span>
        <span class="reach">${r.reached ? `Fight ${r.reached}` : ''}</span>
        <span class="len">${clock(r.duration)}</span>
      </a>
      <span class="tools">
        <button class="star" type="button" aria-pressed="${!!r.starred}" aria-label="${r.starred ? 'Starred: kept for good' : 'Star: keep for good'}">${STAR}</button>
        <button class="del" type="button"${r.live ? ' disabled' : ''}>Delete</button>
      </span>
    </li>`;
  }
  function empty(head, text, action, run, primary) {
    $('list').innerHTML = `<div class="empty"><h2>${esc(head)}</h2><p>${esc(text)}</p>${action ? `<button class="${primary ? 'ui-primary' : 'ui-button'}" type="button" id="emptyAction">${esc(action)}</button>` : ''}</div>`;
    if (action) $('emptyAction').onclick = run;
  }
  async function load() {
    clearTimeout(timer);
    try {
      const res = await fetch('/api/runs', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const body = await res.json();
      runs = body.runs || []; now = body.now || Date.now(); loaded = true; failed = false;
    } catch (e) { if (!loaded) failed = true; }
    if (!armed) draw();
    // A live run's row changes as it goes: look again soon while one is on, else now and then.
    timer = setTimeout(() => { if (document.visibilityState === 'visible') load(); else waiting = true; }, runs.some(r => r.live) ? 10000 : 60000);
  }
  let waiting = false, armed = null;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && waiting) { waiting = false; load(); } });
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  $('list').addEventListener('click', async ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const li = b.closest('.run'); if (!li) return;
    const r = runs.find(x => x.id === li.dataset.id); if (!r) return;
    if (b.classList.contains('star')) {
      const on = !r.starred; r.starred = on; draw();
      try { const res = await post(`/api/runs/${encodeURIComponent(r.id)}/star`, { starred: on }); if (!res.ok) throw new Error(); $('status').textContent = on ? 'Starred: this run is kept for good.' : 'Unstarred: kept for 60 days from the run.'; }
      catch (e) { r.starred = !on; draw(); $('status').textContent = 'The star could not be saved. Try again.'; }
    } else if (b.classList.contains('del')) {
      if (armed?.id !== r.id) {
        disarm(false); armed = { id: r.id, button: b, timer: setTimeout(disarm, 4000) };
        b.classList.add('armed'); b.textContent = 'Delete?'; return;
      }
      disarm(false);
      try {
        const res = await post(`/api/runs/${encodeURIComponent(r.id)}/delete`, {});
        if (!res.ok) throw new Error();
        runs = runs.filter(x => x.id !== r.id); draw(); $('status').textContent = 'Run deleted.';
      } catch (e) { draw(); $('status').textContent = 'The run could not be deleted. Try again.'; }
    }
  });
  function disarm(redraw = true) {
    if (!armed) return;
    clearTimeout(armed.timer);
    if (armed.button.isConnected) { armed.button.classList.remove('armed'); armed.button.textContent = 'Delete'; }
    armed = null;
    if (redraw) draw();
  }
  $('player').onchange = ev => { filters.player = ev.target.value; saveFilters(); draw(); };
  $('period').onchange = ev => { filters.period = ev.target.value; saveFilters(); draw(); };
  $('starred').onclick = () => { filters.starred = !filters.starred; saveFilters(); draw(); };
  draw();
  load();
})();
