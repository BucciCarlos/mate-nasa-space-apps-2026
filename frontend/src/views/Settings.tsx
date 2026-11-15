import { localeSet } from '../state/mateSlice';
import { useAppDispatch } from '../state/AppProvider';
import { useLocale, useT } from '../i18n/I18nProvider';

export function Settings({ onRestart }: { onRestart: () => void }) {
  const t = useT();
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const segBtn = (on: boolean) => `bg-transparent text-fg border-0 px-3 py-2 font-inherit cursor-pointer${on ? ' bg-accent text-accent-fg font-semibold' : ''}`;
  return (
    <div className="max-w-2xl">
      <h1 id="view-h" tabIndex={-1}>{t.settings.title}</h1>
      <section className="border border-line rounded-md px-4 py-4 my-4 bg-bg2" aria-labelledby="lang-h">
        <h2 id="lang-h">{t.common.language}</h2>
        <p className="text-fg2">{t.settings.languageBody}</p>
        <div className="inline-flex border border-line rounded-md overflow-hidden mt-2" role="group" aria-label={t.common.language}>
          <button type="button" className={segBtn(locale === 'en')} aria-pressed={locale === 'en'} onClick={() => dispatch(localeSet('en'))}>{t.common.english}</button>
          <button type="button" className={segBtn(locale === 'es')} aria-pressed={locale === 'es'} onClick={() => dispatch(localeSet('es'))}>{t.common.spanish}</button>
        </div>
      </section>
      <section className="border border-line rounded-md px-4 py-4 my-4 bg-bg2" aria-labelledby="restart-h">
        <h2 id="restart-h">{t.common.restartScenario}</h2>
        <p className="text-fg2">{t.settings.restartBody}</p>
        <button type="button" className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold bg-red text-white border border-red cursor-pointer" onClick={onRestart}>{t.common.restartScenario}</button>
      </section>
      <section className="border border-line rounded-md px-4 py-4 my-4 bg-bg2" aria-labelledby="about-h">
        <h2 id="about-h">{t.settings.about}</h2>
        <p>{t.settings.aboutBody}</p>
      </section>
    </div>
  );
}
