/* PriMo Nails – Academy: course cards with a level filter, and the individual-training request form. */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, toast, courseCard, ARROW: arrow } = PM;
  const { COURSES } = PM.CATALOG;                                 // shared with search (js/site.js)
  const list = $('#acad-cards');
  list.innerHTML = COURSES.map((c, i) => courseCard(c, i < 3)).join('') + `<a class="acard solo-tile" href="#solo">
      <div><p class="ac-lvl">Su misura</p><h3>Non trovi il corso giusto?</h3><p>Costruiamo un percorso individuale sulle tue esigenze.</p></div>
      <span class="ac-arrow" aria-hidden="true">${arrow}</span></a>`;

  // level filter
  const btns = $$('#acad-filter button');
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.setAttribute('aria-pressed', x === b));
    $$('.acard[data-lvl]', list).forEach(card => { card.hidden = !!b.dataset.lvl && card.dataset.lvl !== b.dataset.lvl; });
  }));

  // info request: validate, then confirm (no "sent" screen, so the button confirms in place)
  const form = $('#req'), err = $('#req-err');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = [...form.elements].filter(el => el.required && !el.checkValidity());
    $$('.fld', form).forEach(f => f.classList.toggle('bad', bad.includes($('input,textarea', f))));
    if (bad.length) { err.textContent = bad[0].type === 'email' && bad[0].value ? 'Inserisci un indirizzo email valido.' : 'Compila nome ed email.'; bad[0].focus(); return; }
    err.textContent = '';
    const btn = $('.req-btn', form);
    btn.disabled = true; btn.textContent = '✓ Richiesta inviata';
    toast('Grazie! Ti ricontatteremo entro 24 ore.');
    form.reset();
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Invia richiesta'; }, 3000);
  });
  form.addEventListener('input', e => e.target.closest('.fld')?.classList.remove('bad'));
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));
  PM.ready();
})();
