import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './founder.css';

/** Primo1 "Meet PriMo Nails Founder" (index.html `.founder`): phones stack
 *  title → stats → photo → clamped bio → "LEGGI DI PIU"; desktop puts the copy
 *  on the left and the portrait on the right. Styles live in founder.css. */
export const AboutBrand = () => {
  const { t } = useLanguage();

  return (
    <>
      <section className="pm-founder scroll-mt-[64px] lg:scroll-mt-[104px]" id="founder">
        <h2 className="h2 left">{t('founder.title')}</h2>
        <p className="f-sub">
          <b>Irina PriMo</b> — {t('founder.role1')}
          <br />
          {t('founder.role2')} <b>{t('founder.since')}</b>
        </p>
        <div className="stats">
          <div>
            <strong>
              <span className="m-only">{t('founder.yearsM')}</span>
              <span className="d-only">{t('founder.yearsD')}</span>
            </strong>
            <span>
              <span className="m-only">{t('founder.experienceM')}</span>
              <span className="d-only">{t('founder.experienceD')}</span>
            </span>
          </div>
          <div>
            <strong>10 000+</strong>
            <span>
              <span className="m-only">{t('founder.studentsM')}</span>
              <span className="d-only">{t('founder.studentsD')}</span>
            </span>
          </div>
        </div>
        <div className="f-photo">
          <picture>
            <source media="(min-width:1024px)" srcSet="/founder/founder-d.jpg" />
            <img src="/founder/founder.jpg" alt={t('founder.photoAlt')} loading="lazy" decoding="async" />
          </picture>
        </div>
        <div id="f-bio" className="f-bio clamp">
          <p>{t('about.description')}</p>
        </div>
        {/* "Leggi di più" opens the full story on the About us page. */}
        <Link to="/about-us" className="pill-btn wide grid! w-fit place-items-center">
          {t('founder.more')}
        </Link>
      </section>
      <div className="h-[22px] bg-black lg:hidden" aria-hidden="true" />
    </>
  );
};
