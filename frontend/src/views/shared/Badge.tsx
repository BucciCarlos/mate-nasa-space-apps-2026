import { useState } from 'react';
import type { ReactNode } from 'react';
import { useT } from '../../i18n/I18nProvider';

export type BadgeKind = 'simulated' | 'userEntry' | 'nasaResource' | 'calculated' | 'noData';

const ICONS: Record<BadgeKind, string> = { simulated: '◌', userEntry: '✎', nasaResource: '◆', calculated: '∑', noData: '∅' };

/** Provenance badge with an explanatory popover (03 §5). */
export function Badge({ kind, children }: { kind: BadgeKind; children?: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const label = t.provenance[kind];
  const body = kind === 'simulated' ? t.provenance.simulatedBody : kind === 'userEntry' ? t.provenance.userEntryBody : kind === 'calculated' ? t.provenance.calculatedBody : null;
  return (
    <span className={`badge-wrap ${open ? 'is-open' : ''}`}>
      <button type="button" className={`badge badge-${kind}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">{ICONS[kind]}</span> {label}
      </button>
      {open && (
        <span className="badge-pop" role="note">
          {body ?? label}
          {children}
        </span>
      )}
    </span>
  );
}

export function StatusBadge({ kind, label }: { kind: 'queued' | 'in_transit' | 'delivered' | 'up' | 'down' | 'changed' | 'noEvidence'; label: string }) {
  return <span className={`status status-${kind}`}>{label}</span>;
}
