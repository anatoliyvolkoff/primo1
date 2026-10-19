/* PriMo Nails – about page. Variant E's contact form (validate, then confirm in place; no backend) and variant F's value tabs. */
(() => {
  'use strict';
  const { $, toast } = PM;
  PM.ready();

  // F: value tabs with a sliding pill; arrow keys move between tabs
  const tabs = [...document.querySelectorAll('.abf-tabs [role=tab]')], pill = $('.abf-pill');
  const pick = (t, focus) => {
    tabs.forEach(b => { const on = b === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; $('#' + b.getAttribute('aria-controls')).hidden = !on; });
    pill.style.setProperty('--x', t.offsetLeft + 'px'); pill.style.setProperty('--w', t.offsetWidth + 'px');
    if (focus) t.focus();
  };
  if (tabs.length) {
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length], true); } });
    });
    const sync = () => pick(tabs.find(t => t.getAttribute('aria-selected') === 'true'));
    sync(); addEventListener('resize', sync);
  }

  const form = $('#abe-form');
  if (!form) return;
  const err = $('#abe-err'), btn = $('.req-btn', form);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = [...form.elements].filter(el => el.required && !el.checkValidity());
    form.querySelectorAll('.fld').forEach(f => f.classList.toggle('bad', bad.some(el => f.contains(el))));
    if (bad.length) { err.textContent = 'Compila nome, email valida e messaggio.'; bad[0].focus(); return; }
    err.textContent = '';
    btn.disabled = true; btn.textContent = '✓ Messaggio inviato';
    toast('Grazie! Ti ricontatteremo entro 24 ore.');
    form.reset();
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Invia messaggio'; }, 3000);
  });
})();
