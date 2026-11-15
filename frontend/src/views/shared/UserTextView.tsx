import type { UserText } from '../../state/types';
import { useLocale, useT } from '../../i18n/I18nProvider';

/** User text shown verbatim with its own lang, tagged when it differs from the UI language (03 §7.6). */
export function UserTextView({ text, className }: { text: UserText; className?: string }) {
  const t = useT();
  const locale = useLocale();
  const other = text.lang !== locale;
  const langName = text.lang === 'en' ? t.common.english : t.common.spanish;
  return (
    <span className={className}>
      <q lang={text.lang} className="italic">{text.text}</q>
      {other && <span className="text-[11px] text-fg2"> {t.common.writtenIn({ language: langName })}</span>}
    </span>
  );
}
