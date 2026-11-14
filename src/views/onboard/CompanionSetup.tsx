import { useState } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { useApp } from '../../state/AppProvider';
import type { CompanionPreferences, TrajectoryStage } from '../../state/types';
import { MateAvatar } from './MateAvatar';

const COLORS = ['teal', 'blue', 'violet', 'amber', 'rose', 'green'] as const;

export function CompanionSetup({ initial, stage }: { initial: CompanionPreferences; stage: TrajectoryStage }) {
  const { dispatch } = useApp();
  const { monitoring: t, wellbeing } = useT();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(false);
  const patch = (change: Partial<CompanionPreferences>) => {
    setDraft({ ...draft, ...change });
    setSaved(false);
  };
  return (
    <details className="panel">
      <summary>{t.customize}</summary>
      <MateAvatar preferences={draft} stage={stage} />
      <form className="monitoring-settings" onSubmit={(event) => {
        event.preventDefault();
        if (!draft.name.trim()) return;
        dispatch({ type: 'monitoring/companion_saved', preferences: draft });
        setSaved(true);
      }}>
        <label>{t.name}<input value={draft.name} onChange={(event) => patch({ name: event.target.value })} required maxLength={24} /></label>
        <label>{t.color}<select value={draft.color} onChange={(event) => patch({ color: event.target.value as CompanionPreferences['color'] })}>
          {COLORS.map((color) => <option key={color} value={color}>{t.colors[color]}</option>)}
        </select></label>
        <label>{t.avatar}<select value={draft.avatar === 'initial' ? 'isotype' : draft.avatar} onChange={(event) => patch({ avatar: event.target.value as CompanionPreferences['avatar'] })}>
          <option value="isotype">{t.isotype}</option>
          <option value="orbit">{wellbeing.orbit}</option>
          <option value="capsule">{wellbeing.capsule}</option>
        </select></label>
        <label>{t.style}<select value={draft.style} onChange={(event) => patch({ style: event.target.value as CompanionPreferences['style'] })}>
          <option value="brief">{t.brief}</option><option value="guided">{t.guidedStyle}</option>
        </select></label>
        <button className="btn btn-primary" type="submit" disabled={!draft.name.trim()}>{t.savePreferences}</button>
        {saved && <span role="status">{t.preferencesSaved}</span>}
      </form>
    </details>
  );
}
