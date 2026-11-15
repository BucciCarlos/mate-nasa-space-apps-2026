import { useLocale } from '../../i18n/I18nProvider';
import type { CrewId } from '../../demo/fd30';
import { COMMANDER } from './opsState';
import { OPS_TEXT } from './opsText';
import './ops.css';

export function OpsNavigation({ owner, page }: { owner: CrewId; page: string }) {
  const locale = useLocale();
  const t = OPS_TEXT[locale];
  return <nav className="ops-navigation" aria-label={t.navigation}>
    <a href="#/onboard/personal/wellbeing" aria-current={page === 'wellbeing' ? 'page' : undefined}>{t.wellbeing}</a>
    {owner === COMMANDER ? <a href="#/onboard/personal/crew" aria-current={page === 'crew' ? 'page' : undefined}>{t.commander}</a>
      : <a href="#/onboard/personal/requests" aria-current={page === 'requests' ? 'page' : undefined}>{t.requests}</a>}
  </nav>;
}
