import { useApp } from '../../state/AppProvider';
import type { MissionId } from '../../state/types';
import { useLocale } from '../../i18n/I18nProvider';
import { fmtTime, fmtDateTime } from '../../i18n/format';
import { missionTimeMs } from '../../domain/time';

/** Formats real timestamps as mission time of a mission, in the current locale. */
export function useMissionTime(missionId: MissionId) {
  const { state } = useApp();
  const locale = useLocale();
  const m = state.missions[missionId];
  const toMission = (realMs: number) => missionTimeMs(m.clockStart, state.sessionStartMs, realMs);
  return {
    time: (realMs: number) => fmtTime(toMission(realMs), locale),
    dateTime: (realMs: number) => fmtDateTime(toMission(realMs), locale),
    missionMs: (realMs: number) => toMission(realMs),
  };
}
