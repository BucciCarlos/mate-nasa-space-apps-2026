import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CREW, freshPreview } from '../../demo/fd30';
import type { CrewId } from '../../demo/fd30';
import type { GroundRole, Locale } from '../../state/types';
import { I18nProvider } from '../../i18n/I18nProvider';
import { CrewDynamics } from './CrewDynamics';
import type { CrewViewer } from './crewDynamics';

const exampleText = {
  en: { locale: 'Language', profile: 'Onboard profile', perspective: 'Perspective', onboard: 'Onboard', ops: 'Ground: Operations', med: 'Ground: Medical' },
  es: { locale: 'Idioma', profile: 'Perfil a bordo', perspective: 'Perspectiva', onboard: 'A bordo', ops: 'Tierra: Operaciones', med: 'Tierra: Medicina' },
};
function CrewDynamicsExample() {
  const [locale, setLocale] = useState<Locale>('es');
  const [owner, setOwner] = useState<CrewId>('iss:crew-lf');
  const [perspective, setPerspective] = useState<'onboard' | GroundRole>('onboard');
  const t = exampleText[locale];
  const viewer: CrewViewer = perspective === 'onboard' ? { perspective, owner } : { perspective: 'ground', role: perspective };
  const state = { ...freshPreview(0), activeCrewId: owner };
  return <I18nProvider locale={locale}>
    <div className="crew-dynamics"><div className="crew-dynamics-controls">
      <label htmlFor="crew-example-locale">{t.locale}</label><select id="crew-example-locale" value={locale} onChange={e => setLocale(e.target.value as Locale)}><option value="en">{'EN'}</option><option value="es">{'ES'}</option></select>
      <label htmlFor="crew-example-perspective">{t.perspective}</label><select id="crew-example-perspective" value={perspective} onChange={e => setPerspective(e.target.value as typeof perspective)}>
        <option value="onboard">{t.onboard}</option><option value="mission_operator">{t.ops}</option><option value="medical_professional">{t.med}</option>
      </select>
      {perspective === 'onboard' && <><label htmlFor="crew-example-profile">{t.profile}</label><select id="crew-example-profile" value={owner} onChange={e => setOwner(e.target.value as CrewId)}>{CREW.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></>}
    </div></div>
    <CrewDynamics state={state} viewer={viewer} />
  </I18nProvider>;
}
createRoot(document.getElementById('root')!).render(<CrewDynamicsExample />);
