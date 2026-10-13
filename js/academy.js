/* PriMo Nails – Academy: course cards with a level filter, and the individual-training request form. */
(() => {
  'use strict';
  const PM = window.PM;
  const { $, $$, toast } = PM;
  const star = '<svg viewBox="0 0 24 24"><path d="m12 2.5 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9Z"/></svg>';
  const cal = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>';
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  // placeholder catalogue: every card opens the one course page that exists (corso.html)
  const COURSES = [
    { lvl: 'base', tag: 'Livello base', title: 'Onicotecnica Corso Base', txt: 'Le tecniche fondamentali della ricostruzione unghie, dalle basi alla prova su modella.', img: 'course2', pos: '45% 12%', date: '14 settembre', les: 5, rev: '594+' },
    { lvl: 'base', tag: 'Livello base', title: 'Semipermanente perfetto', txt: 'Preparazione, stesura e finitura per un semipermanente pulito e duraturo.', img: 'gallery-dots', pos: '50% 50%', date: '28 settembre', les: 3, rev: '312+' },
    { lvl: 'avanzato', tag: 'Avanzato', title: 'Ricostruzione in gel', txt: 'Apex, strutture e forme stiletto e mandorla per chi lavora già in salone.', img: 'course3', pos: '40% 10%', date: '12 ottobre', les: 6, rev: '428+' },
    { lvl: 'master', tag: 'Master', title: 'Nail art Farfalla', txt: 'La tecnica firma di Irina PriMo: ali dipinte a mano, colore e volume.', img: 'course1', pos: '40% 10%', date: '26 ottobre', les: 4, rev: '207+' },
    { lvl: 'master', tag: 'Master · 2° livello', title: 'Premium Top Master', txt: 'Perfeziona design e velocità con le tecniche esclusive del team PriMo.', img: 'course-wing', pos: '60% 50%', date: '9 novembre', les: 7, rev: '594+' },
  ];
  const list = $('#acad-cards');
  list.innerHTML = COURSES.map((c, i) => `<a class="acard" href="corso.html" data-lvl="${c.lvl}">
      <div class="ac-img"><img src="img/${c.img}.jpg" style="--pos:${c.pos}" alt="" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async"></div>
      <div class="ac-body">
        <p class="ac-lvl">${c.tag}</p>
        <h3>${c.title}</h3>
        <p class="ac-txt">${c.txt}</p>
        <p class="ac-meta">${cal}<span>${c.date} · ${c.les} lezioni</span></p>
        <div class="ac-foot"><span class="ac-rate"><span class="stars" role="img" aria-label="5 stelle su 5">${star.repeat(5)}</span><span><b>${c.rev}</b> <span class="d-only">recensioni</span></span></span><span class="ac-go" aria-hidden="true">Dettagli${arrow}</span></div>
      </div></a>`).join('') + `<a class="acard solo-tile" href="#solo">
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
