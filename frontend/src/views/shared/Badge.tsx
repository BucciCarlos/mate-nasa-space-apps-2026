import { useState } from 'react';
import type { ReactNode } from 'react';
import { useT } from '../../i18n/I18nProvider';

export type BadgeKind = 'simulated' | 'userEntry' | 'nasaResource' | 'calculated' | 'noData';

const ICONS: Record<BadgeKind, string> = { simulated: '◌', userEntry: '✎', nasaResource: '◆', calculated: '∑', noData: '∅' };

// Provenance badge styling per kind (matches base.css .badge-*).
const KIND_CLS: Record<BadgeKind, string> = {
  simulated: 'border-dashed',
  userEntry: 'border-green text-green',
  nasaResource: 'border-accent text-accent',
  calculated: 'border-fg2 text-fg2',
  noData: 'border-fg2 text-fg2 border-dashed',
};

/** Provenance badge with an explanatory popover (03 §5). */
export function Badge({ kind, children }: { kind: BadgeKind; children?: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const label = t.provenance[kind];
  const body = kind === 'simulated' ? t.provenance.simulatedBody : kind === 'userEntry' ? t.provenance.userEntryBody : kind === 'calculated' ? t.provenance.calculatedBody : null;
  return (
    <span className="relative inline-block">
      <button type="button" className={`inline-flex items-center gap-1 text-[11px] tracking-[0.04em] uppercase px-2 py-px rounded-full border border-line bg-transparent text-fg2 cursor-pointer ${KIND_CLS[kind]}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">{ICONS[kind]}</span> {label}
      </button>
      {open && (
        <span className="absolute left-0 top-full z-40 min-w-60 max-w-80 bg-bg2 border border-line rounded-md shadow-lg px-3 py-2 text-fs0 tracking-normal normal-case text-fg" role="note">
          {body ?? label}
          {children}
        </span>
      )}
    </span>
  );
}

const STATUS_CLS: Record<string, string> = {
  queued: 'text-amber',
  in_transit: 'text-accent',
  delivered: 'text-green',
  up: 'text-green',
  down: 'text-red',
  changed: 'text-amber',
  noEvidence: 'text-fg2 border-dashed',
};

export function StatusBadge({ kind, label }: { kind: 'queued' | 'in_transit' | 'delivered' | 'up' | 'down' | 'changed' | 'noEvidence'; label: string }) {
  const prefix = kind === 'noEvidence' ? '∅ ' : '';
  return <span className={`inline-block text-fs0 px-2 py-px rounded border border-current font-semibold ${STATUS_CLS[kind]}`}>{prefix}{label}</span>;
}
