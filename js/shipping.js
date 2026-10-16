/* PriMo Nails – Spedizioni e resi: back link, and the zone switcher (tabs with arrow keys; without JS every zone is listed). */
(() => {
  'use strict';
  const { $$ } = window.PM;
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));

  const tabs = $$('.zt [role=tab]'), panels = $$('.zp');
  if (!tabs.length) return;
  document.documentElement.classList.add('js');
  const select = (tab, focus) => {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    panels.forEach(p => { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { select(t); });
    t.addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: tabs.length - 1 - i }[e.key];
      if (k === undefined) return;
      e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true);
    });
  });
  panels.forEach((p, i) => { p.hidden = i !== 0; });
})();
