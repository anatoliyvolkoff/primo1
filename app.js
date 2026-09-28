(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const KEY = 'primo.v1';
  const CIRC = 2 * Math.PI * 42;       // progress ring
  const TCIRC = 2 * Math.PI * 44;      // timer ring

  // ---------- state ----------
  const defaults = () => ({
    tasks: [],                          // {id,title,done,doneOn}
    days: {},                           // 'YYYY-MM-DD' -> {done, focus}
    theme: null,
    focus: { minutes: 25, taskId: null, endsAt: null, remaining: 25 * 60 },
  });
  let state;
  try { state = { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { state = defaults(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  const dayKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const day = k => (state.days[k] ||= { done: 0, focus: 0 });
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- helpers ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

  // ---------- theme ----------
  function applyTheme() {
    const dark = state.theme ? state.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('meta[name=theme-color]').content = dark ? '#101018' : '#5b5bd6';
  }
  $('#theme-btn').onclick = () => {
    state.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(); save();
  };

  // ---------- tabs ----------
  const titles = { today: 'Today', focus: 'Focus', stats: 'Stats' };
  function show(view) {
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    $('#title').textContent = titles[view];
    $('main').scrollTop = 0;
    if (view === 'stats') renderStats();
    try { history.replaceState(null, '', '#' + view); } catch {}
  }
  $$('.tab').forEach(t => t.onclick = () => show(t.dataset.view));

  // ---------- tasks ----------
  const today = () => dayKey();
  const visibleTasks = () => state.tasks.filter(t => !t.done || t.doneOn === today());

  function addTask(title) {
    title = title.trim();
    if (!title) return;
    state.tasks.unshift({ id: uid(), title, done: false, doneOn: null });
    save(); renderTasks();
  }
  function toggleTask(id) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    if (!t.done) {
      t.done = true; t.doneOn = today(); day(today()).done++;
      buzz(15);
      const open = state.tasks.filter(x => !x.done).length;
      if (!open) toast('All done — nice work 🎉');
    } else {
      t.done = false;
      const d = day(t.doneOn); d.done = Math.max(0, d.done - 1);
      t.doneOn = null;
    }
    save(); renderTasks();
  }
  function deleteTask(id, li) {
    const t = state.tasks.find(t => t.id === id);
    if (t && t.done) { const d = day(t.doneOn); d.done = Math.max(0, d.done - 1); }
    const commit = () => {
      state.tasks = state.tasks.filter(t => t.id !== id);
      if (state.focus.taskId === id) state.focus.taskId = null;
      save(); renderTasks();
    };
    if (li) { li.classList.add('removing'); setTimeout(commit, 180); } else commit();
  }

  function renderTasks() {
    const list = visibleTasks();
    $('#task-list').innerHTML = list.map(t => `
      <li class="task ${t.done ? 'done' : ''}" data-id="${t.id}">
        <button class="check" aria-label="${t.done ? 'Mark not done' : 'Mark done'}">✓</button>
        <span class="task-title">${esc(t.title)}</span>
        <button class="del" aria-label="Delete task">×</button>
      </li>`).join('');
    $('#empty').hidden = list.length > 0;

    const done = list.filter(t => t.done).length, total = list.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    $('#progress-pct').textContent = pct + '%';
    $('#progress-sub').textContent = total ? `${done} of ${total} done` : 'No tasks yet';
    const ring = $('#ring');
    ring.style.strokeDasharray = CIRC;
    ring.style.strokeDashoffset = CIRC * (1 - pct / 100);

    renderFocusList();
  }

  $('#add-form').onsubmit = e => {
    e.preventDefault();
    const i = $('#add-input');
    addTask(i.value); i.value = ''; i.focus();
  };
  $('#task-list').onclick = e => {
    const li = e.target.closest('.task'); if (!li) return;
    if (e.target.closest('.check')) toggleTask(li.dataset.id);
    else if (e.target.closest('.del')) deleteTask(li.dataset.id, li);
  };

  // ---------- focus timer ----------
  let tick = null;
  const f = () => state.focus;
  const running = () => f().endsAt !== null;
  const remaining = () => running() ? Math.max(0, Math.round((f().endsAt - Date.now()) / 1000)) : f().remaining;

  function renderFocusList() {
    const open = state.tasks.filter(t => !t.done);
    if (f().taskId && !open.some(t => t.id === f().taskId)) f().taskId = null;
    $('#focus-list').innerHTML = open.length
      ? open.map(t => `<li class="task selectable ${t.id === f().taskId ? 'selected' : ''}" data-id="${t.id}">
          <span class="task-title">${esc(t.title)}</span></li>`).join('')
      : '<li class="empty" style="margin:12px 0">No open tasks. Add one on the Today tab.</li>';
    const sel = state.tasks.find(t => t.id === f().taskId);
    $('#timer-task').textContent = sel ? sel.title : 'Pick a task below';
  }
  $('#focus-list').onclick = e => {
    const li = e.target.closest('.task'); if (!li) return;
    f().taskId = f().taskId === li.dataset.id ? null : li.dataset.id;
    save(); renderFocusList();
  };

  function renderTimer() {
    const r = remaining(), total = f().minutes * 60;
    $('#timer-time').textContent = `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
    const ring = $('#timer-ring');
    ring.style.strokeDasharray = TCIRC;
    ring.style.strokeDashoffset = TCIRC * (1 - r / total);
    $('#timer-toggle').textContent = running() ? 'Pause' : (r < total ? 'Resume' : 'Start');
    $$('.chip').forEach(c => {
      c.classList.toggle('active', +c.dataset.min === f().minutes);
      c.disabled = running();
    });
    document.title = running() ? `${$('#timer-time').textContent} · Primo` : 'Primo';
  }
  function loop() {
    renderTimer();
    if (running() && remaining() <= 0) return finish();
    if (running() && !tick) tick = setInterval(loop, 250);
    if (!running() && tick) { clearInterval(tick); tick = null; }
  }
  function finish() {
    clearInterval(tick); tick = null;
    day(today()).focus += f().minutes;
    f().endsAt = null; f().remaining = f().minutes * 60;
    save(); loop(); buzz([200, 100, 200]);
    toast(`Focus session complete · ${f().minutes} min`);
  }
  $('#timer-toggle').onclick = () => {
    if (running()) { f().remaining = remaining(); f().endsAt = null; }
    else f().endsAt = Date.now() + f().remaining * 1000;
    save(); loop();
  };
  $('#timer-reset').onclick = () => {
    f().endsAt = null; f().remaining = f().minutes * 60; save(); loop();
  };
  $('.chips').onclick = e => {
    const c = e.target.closest('.chip'); if (!c || running()) return;
    f().minutes = +c.dataset.min; f().remaining = f().minutes * 60; save(); loop();
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  // ---------- stats ----------
  function renderStats() {
    const keys = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
    const vals = keys.map(d => (state.days[dayKey(d)] || {}).done || 0);
    const max = Math.max(1, ...vals);
    $('#bars').innerHTML = keys.map((d, i) => `
      <div class="bar ${i === 6 ? 'today' : ''}">
        <b>${vals[i]}</b><i style="height:${Math.round(vals[i] / max * 100)}%"></i>
        <span>${d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
      </div>`).join('');

    let streak = 0; const d = new Date();
    if (!((state.days[dayKey(d)] || {}).done)) d.setDate(d.getDate() - 1);   // today may still be in progress
    while ((state.days[dayKey(d)] || {}).done) { streak++; d.setDate(d.getDate() - 1); }
    const all = Object.values(state.days);
    $('#stat-streak').textContent = streak;
    $('#stat-done').textContent = all.reduce((a, x) => a + x.done, 0);
    $('#stat-focus').textContent = all.reduce((a, x) => a + x.focus, 0);
  }
  $('#reset-data').onclick = () => {
    if (!confirm('Delete all tasks and stats?')) return;
    state = defaults(); save(); applyTheme(); renderTasks(); loop(); renderStats(); toast('Data cleared');
  };

  // ---------- init ----------
  $('#date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  applyTheme();
  if (!state.tasks.length && !Object.keys(state.days).length) {
    ['Plan the day', 'Reply to messages', 'Go for a walk'].reverse().forEach(t =>
      state.tasks.unshift({ id: uid(), title: t, done: false, doneOn: null }));
    save();
  }
  renderTasks(); loop();
  const h = location.hash.slice(1); if (titles[h]) show(h);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
