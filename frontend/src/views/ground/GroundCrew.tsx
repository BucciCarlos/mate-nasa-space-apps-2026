import type { GroundRole, MissionId } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { selectGroundCrew, selectGroundInbox, selectChange } from '../../state/selectors';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { Badge, StatusBadge } from '../shared/Badge';
import { useMissionTime } from '../shared/useMissionTime';
import { UserTextView } from '../shared/UserTextView';

export function GroundCrew({ missionId, role }: { missionId: MissionId; role: GroundRole }) {
  const { state } = useApp();
  const t = useT();
  const locale = useLocale();
  const mt = useMissionTime(missionId);
  const { crew, linkDownSinceMs } = selectGroundCrew(state, missionId, role);
  const inbox = selectGroundInbox(state, missionId, role);
  const m = state.missions[missionId];
  const nameOf = (id: string) => crew.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-4">
      <section className="border border-line rounded-md bg-bg2 p-4" aria-labelledby="crew-h">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 id="crew-h">{t.ground.crewTitle}</h1>
          <Badge kind="simulated" />
        </div>
        {m.onboardUserId === null && <p className="text-fg2 text-fs0 mt-2">{t.ground.noOnboardUi}</p>}
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
          {crew.map((c) => (
            <li key={c.id} className="border border-line rounded-md px-3 py-2 bg-bg3">
              <span className="block font-semibold text-fs1">{c.name}</span>
              <span className="block text-fg2 text-fs0">{c.roleTitle[locale]}</span>
              {linkDownSinceMs !== null && <span className="inline-block mt-1"><StatusBadge kind="down" label={t.link.downSince({ time: mt.time(linkDownSinceMs) })} /></span>}
            </li>
          ))}
        </ul>
      </section>
      <section className="border border-line rounded-md bg-bg2 p-4" aria-labelledby="inbox-h">
        <h2 id="inbox-h">{t.ground.inboxTitle}</h2>
        {inbox.length === 0 ? <p className="text-center text-fg2 py-4">{t.ground.inboxEmpty}</p> : (
          <ul className="flex flex-col divide-y divide-line">
            {inbox.map((row) => (
              <li key={row.messageId} className="py-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-mono text-fs0 text-fg2">{t.ground.receivedAt({ time: mt.time(row.receivedAtMs) })}</span>
                  <span>{t.ground.fromCrew({ name: nameOf(row.crewId) })}</span>
                </div>
                {row.kind === 'restricted' ? (
                  <p className="my-2 border border-line border-dashed rounded-md px-3 py-2 text-fg2 text-fs0">{t.ground.summaryRestricted}</p>
                ) : (
                  <dl className="my-2 border border-line rounded-md px-3 py-2">
                    <dt className="text-fg2 text-fs0 mt-1">{t.ground.topics}</dt><dd>{row.topics.map((tp) => t.topics[tp]).join(', ')}</dd>
                    <dt className="text-fg2 text-fs0 mt-2">{t.ground.relatedChange}</dt>
                    <dd>{(() => {
                      const c = selectChange(state, missionId, row.relatedChangeId);
                      const task = c ? m.ground.plan.blocks.find((b) => b.id === c.taskId) : null;
                      return c && task ? t.ground.changeRow({ task: task.title[locale], minutes: c.advanceMinutes, version: c.toVersion }) : t.observations.noRelatedChange;
                    })()}</dd>
                    <dt className="text-fg2 text-fs0 mt-2">{t.ground.comment}</dt>
                    <dd>{row.comment ? <UserTextView text={row.comment} /> : <span className="text-fg2">{t.ground.noComment}</span>}</dd>
                  </dl>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
