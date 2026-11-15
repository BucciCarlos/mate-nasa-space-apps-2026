import { useT } from '../i18n/I18nProvider';

/** One asterisk per FD30 telemetry panel. Links to the explanation in Sources and evidence; never used on NASA or other-mission data. */
export function TelemetryNote() {
  const t = useT().fd30;
  return <a className="fd-telemetry-note" href="#/onboard/personal/evidence" aria-label={t.telemetryNoteLink}>*</a>;
}
