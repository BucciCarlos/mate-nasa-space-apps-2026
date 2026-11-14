import type { CompanionPreferences, TrajectoryStage } from '../../state/types';

export function MateAvatar({ preferences, stage }: { preferences: CompanionPreferences; stage: TrajectoryStage }) {
  return (
    <span className={`avatar mate-avatar color-${preferences.color}`} data-stage={stage} data-avatar={preferences.avatar === 'initial' ? 'isotype' : preferences.avatar} aria-hidden="true">
      <img src={`${import.meta.env.BASE_URL}images/mate-isotipo.png`} alt="" className="mate-avatar-image" />
    </span>
  );
}
