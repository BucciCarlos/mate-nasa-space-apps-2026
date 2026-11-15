// Module catalog contract (01 §5.2, CORE-CATALOG). One registry: catalogModules.ts.
import type { GroundRole, Locale } from '../../state/types';
import type { CatalogSourceId } from './catalogSources';
import type { CrewId, PreviewState } from '../../demo/fd30';

export type Text = Record<Locale, string>;
export type Surface = 'onboard' | 'ground';

/** What really exists in the prototype for a capability, not what the spec plans. */
export type CapabilityStatus = 'available' | 'evidence' | 'concept';

export interface Capability {
  id: string;
  status: CapabilityStatus;
  /** false = the capability claim itself still needs verification against a primary source. */
  verified: boolean;
  label: Text;
  note: Text;
  /** Existing route to open the available part, per perspective. Absent = nothing to open there. */
  href?: Partial<Record<Surface, string>>;
}

export type Backing =
  | { kind: 'risk'; risks: Text[]; sourceId: CatalogSourceId; statement?: Text }
  | { kind: 'context'; topic: Text; sourceId: CatalogSourceId };

export type ModuleId =
  | 'MOD-CARDIO' | 'MOD-MSK' | 'MOD-NUTR' | 'MOD-IMMUNE' | 'MOD-SANS' | 'MOD-SENSORI' | 'MOD-COG'
  | 'MOD-CREW' | 'MOD-EVA' | 'MOD-MICRO' | 'MOD-LOADS' | 'MOD-AUTONOMY' | 'MOD-MED' | 'MOD-RAD';

export interface CatalogModule {
  id: ModuleId;
  title: Text;
  /** Tier in 01 §5.2. All 13 are concept cards there; real availability is in `capabilities`. */
  specTier: 'concept';
  surfaces: Surface[];
  solves: Text;
  /** Short personal use On board. */
  onboard: Text;
  /** Required when `surfaces` includes 'ground': operational and medical use kept apart. */
  ground?: { operational: Text; medical: Text };
  backing: Backing;
  dataNeeds: Text[];
  notBuilt: Text;
  capabilities: Capability[];
}

/**
 * CAT08: optional read-only context from the host so the detail dialogs can show data the viewer may already consult.
 * On board `owner` is the active profile (the dialogs read only that profile through the existing selectors); on Ground the
 * dialogs read only the allowlisted operational projection for the active role. Without it the dialogs show context only.
 */
export interface CatalogData { state: PreviewState; owner: CrewId; time: number }
/** Perspective and Ground role are supplied by the host view; the catalog grants no access. */
export type CatalogProps = { perspective: 'onboard'; data?: CatalogData; headingLevel?: 1 | 2 } | { perspective: 'ground'; role: GroundRole; data?: CatalogData; headingLevel?: 1 | 2 };
