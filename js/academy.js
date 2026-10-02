/* PriMo Nails – Academy course list ("Courses mob" 440 / "Course desk" 1440) and the info-request form. */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, toast } = PM;
  const star = '<svg viewBox="0 0 24 24"><path d="m12 2.5 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9Z"/></svg>';
  const cal = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>';
  $('#acad-cards').innerHTML = Array.from({ length: 5 }, (_, i) => `<article class="acard">
      <div class="ac-img"><picture><source media="(min-width:1024px)" srcset="img/course-wing.jpg"><img src="img/course-card-m.jpg" alt="Nail art a farfalla" loading="${i ? 'lazy' : 'eager'}"></picture></div>
      <div class="ac-rate m-only"><span class="stars" role="img" aria-label="5 stelle su 5">${star.repeat(5)}</span><span><b>594+</b> RECENSIONI</span></div>
      <div class="ac-body">
        <h3>Premium top Master - 2 livello</h3>
        <p class="ac-desc">Corso base &nbsp;- PriMo Nails &nbsp;Professional<br><b class="d-b">01</b> livello - <b class="d-b">7</b> lezione</p>
        <p class="ac-date">${cal}<span>9 settembre</span></p>
        <a class="ac-cta" href="corso.html"><span class="m-only">SCOPRI</span><span class="d-only">DETTAGLI</span></a>
      </div></article>`).join('');

  // info request: validate, then confirm (the design has no "sent" screen, so the button confirms in place)
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
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Invia Richiesta'; }, 3000);
  });
  form.addEventListener('input', e => e.target.closest('.fld')?.classList.remove('bad'));
  $$('[data-back]').forEach(a => a.addEventListener('click', e => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } }));
  PM.ready();
})();
