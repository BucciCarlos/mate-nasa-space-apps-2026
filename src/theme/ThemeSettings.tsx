import { useLocale } from '../i18n/I18nProvider';
import { THEME_TEXT } from './themeText';
import { useFd30Theme } from './useFd30Theme';
import './themeSettings.css';

/**
 * MATE-THEME01: one button that switches FD30 between Claro and Oscuro. It only changes the theme store: no clock,
 * profile, route or chat state is read or written here. `aria-pressed` is true in dark; the label names the theme.
 */
export function ThemeToggle() {
  const t = THEME_TEXT[useLocale()];
  const { resolved, toggle } = useFd30Theme();
  const dark = resolved === 'dark';
  const action = dark ? t.dark : t.light;
  return <div className="fd-settings">
    <button type="button" className="fd-settings-button" aria-pressed={dark} aria-label={t.toggle} title={action} onClick={toggle}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {dark
          ? <><circle cx="12" cy="12" r="4" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" /></>
          : <path d="M20 14.2A8 8 0 0 1 9.8 4 8 8 0 1 0 20 14.2z" />}
      </svg>
    </button>
  </div>;
}
