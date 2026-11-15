import { createContext, useContext } from 'react';
import { CREW } from './fd30';
import type { CrewId } from './fd30';

/** MATE-CAP01: the name a record owner is shown under for the active A bordo profile (John Doe shows Lucía's records as his own). */
export const ViewerNameContext = createContext<{ id: CrewId; name: string } | null>(null);
export function useCrewName(id: CrewId): string {
  const viewer = useContext(ViewerNameContext);
  return viewer && viewer.id === id ? viewer.name : CREW.find(c => c.id === id)!.name;
}
