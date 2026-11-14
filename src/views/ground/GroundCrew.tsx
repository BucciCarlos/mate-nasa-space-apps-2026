import type { GroundRole, MissionId } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { selectGroundCrew, selectGroundInbox, selectChange, selectDeliveredMedicalReviews, upcomingBlocks } from '../../state/selectors';
import { useNow } from '../../state/useNow';
import { fmtInterval } from '../../i18n/format';
import { FlightSampleText } from '../shared/FlightSampleText';
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
  const reviews = selectDeliveredMedicalReviews(state, missionId, role);
  const m = state.missions[missionId];
  const nowMs = mt.missionMs(useNow(30_000));
  const nameOf = (id: string) => crew.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="ground-crew">
      <section className="panel" aria-labelledby="crew-h">
        <div className="panel-head">
          <h1 id="crew-h">{t.ground.crewTitle}</h1>
          <Badge kind="simulated" />
        </div>
        {m.onboardUserId === null && <p className="muted">{t.ground.noOnboardUi}</p>}
        <ul className="crew-cards">
          {crew.map((c) => {
            const next = upcomingBlocks(m.ground.plan, c.id, nowMs, 1)[0];
            return (
              <li key={c.id} className="crew-card">
                <h2 className="crew-name">{c.name}</h2>
                <span className="muted">{c.roleTitle[locale]}</span>
                <dl className="crew-assignment">
                  <dt>{t.operations.nextActivity}</dt>
                  <dd>{next ? <>{next.title[locale]}<br /><span className="mono">{fmtInterval(next, locale)}</span></> : t.operations.noActivities}</dd>
                </dl>
                {linkDownSinceMs !== null && <StatusBadge kind="down" label={t.link.downSince({ time: mt.time(linkDownSinceMs) })} />}
              </li>
            );
          })}
        </ul>
      </section>
      {role === 'medical_professional' && (
        <section className="panel" aria-labelledby="medical-review-h">
          <h2 id="medical-review-h">{t.monitoring.inbox}</h2>
          {reviews.length === 0 ? <p>{t.monitoring.empty}</p> : (
            <ul className="row-list">{reviews.map((review) => (
              <li className="inbox-row" key={review.id}>
                <div className="row-head">{nameOf(review.crewId)} · {t.ground.receivedAt({ time: mt.time(review.receivedAtMs) })}</div>
                <p><FlightSampleText sample={review.sample} /></p>
              </li>
            ))}</ul>
          )}
        </section>
      )}
      <section className="panel" aria-labelledby="inbox-h">
        <h2 id="inbox-h">{t.ground.inboxTitle}</h2>
        {inbox.length === 0 ? <p className="empty">{t.ground.inboxEmpty}</p> : (
          <ul className="row-list">
            {inbox.map((row) => (
              <li key={row.messageId} className="inbox-row">
                <div className="row-head">
                  <span className="mono">{t.ground.receivedAt({ time: mt.time(row.receivedAtMs) })}</span>
                  <span>{t.ground.fromCrew({ name: nameOf(row.crewId) })}</span>
                </div>
                {row.kind === 'restricted' ? (
                  <p className="restricted">{t.ground.summaryRestricted}</p>
                ) : (
                  <dl className="summary-content">
                    <dt>{t.ground.topics}</dt><dd>{row.topics.map((tp) => t.topics[tp]).join(', ')}</dd>
                    <dt>{t.ground.relatedChange}</dt>
                    <dd>{(() => {
                      const c = selectChange(state, missionId, row.relatedChangeId);
                      const task = c ? m.ground.plan.blocks.find((b) => b.id === c.taskId) : null;
                      return c && task ? t.ground.changeRow({ task: task.title[locale], minutes: c.advanceMinutes, version: c.toVersion }) : t.observations.noRelatedChange;
                    })()}</dd>
                    <dt>{t.ground.comment}</dt>
                    <dd>{row.comment ? <UserTextView text={row.comment} /> : <span className="muted">{t.ground.noComment}</span>}</dd>
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
