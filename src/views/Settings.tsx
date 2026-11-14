import { useApp } from '../state/AppProvider';
import { useLocale, useT } from '../i18n/I18nProvider';

export function Settings({ onRestart }: { onRestart: () => void }) {
  const { dispatch } = useApp();
  const t = useT();
  const locale = useLocale();
  return (
    <div className="settings">
      <h1 id="view-h" tabIndex={-1}>{t.settings.title}</h1>
      <section className="card" aria-labelledby="lang-h">
        <h2 id="lang-h">{t.common.language}</h2>
        <p className="muted">{t.settings.languageBody}</p>
        <div className="seg" role="group" aria-label={t.common.language}>
          <button type="button" className={`seg-btn${locale === 'en' ? ' is-on' : ''}`} aria-pressed={locale === 'en'} onClick={() => dispatch({ type: 'locale/set', locale: 'en' })}>{t.common.english}</button>
          <button type="button" className={`seg-btn${locale === 'es' ? ' is-on' : ''}`} aria-pressed={locale === 'es'} onClick={() => dispatch({ type: 'locale/set', locale: 'es' })}>{t.common.spanish}</button>
        </div>
      </section>
      <section className="card" aria-labelledby="restart-h">
        <h2 id="restart-h">{t.common.restartScenario}</h2>
        <p className="muted">{t.settings.restartBody}</p>
        <button type="button" className="btn btn-danger" onClick={onRestart}>{t.common.restartScenario}</button>
      </section>
      <section className="card" aria-labelledby="about-h">
        <h2 id="about-h">{t.settings.about}</h2>
        <p>{t.settings.aboutBody}</p>
      </section>
    </div>
  );
}
