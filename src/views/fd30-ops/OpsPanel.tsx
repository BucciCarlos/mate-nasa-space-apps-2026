import type { PreviewState } from '../../demo/fd30';
import { dataOwner } from '../../demo/fd30';
import type { GroundRole } from '../../state/types';
import { CommanderView } from './CommanderView';
import { GroundOverview } from './GroundOverview';
import { groundMedicalView } from './groundMedical';
import { RequestsView } from './RequestsView';
import { WellbeingView } from './WellbeingView';
import { commanderView, groundView } from './opsSelectors';
import { ownCheckins, visibleRequests } from './opsState';
import type { OpsAction, OpsState } from './opsState';

export type OpsPage = 'ground' | 'crew' | 'wellbeing' | 'requests';
/** Single integration seam: children receive only the projection for their audience. */
export function OpsPanel({ page, session, time, journal, onAction, role, onRole, onSkip }: {
  page: OpsPage; session: PreviewState; time: number; journal: OpsState;
  onAction: (action: OpsAction) => void; role: GroundRole; onRole: (role: GroundRole) => void; onSkip: () => void;
}) {
  const owner = dataOwner(session.activeCrewId), profile = journal.profiles[owner];
  if (page === 'ground') return <GroundOverview data={groundView(session, role, time)} time={time} onRole={onRole} medical={groundMedicalView(session, role, time)} />;
  if (page === 'crew') return <CommanderView data={commanderView(journal, owner, time)} />;
  if (page === 'wellbeing') return <WellbeingView key={owner} owner={owner} draft={profile.wellbeing} entries={ownCheckins(journal, owner, time)} onAction={onAction} onSkip={onSkip} />;
  return <RequestsView key={owner} owner={owner} draft={profile.request} preview={profile.preview} requests={visibleRequests(journal, owner, time)} onAction={onAction} />;
}
