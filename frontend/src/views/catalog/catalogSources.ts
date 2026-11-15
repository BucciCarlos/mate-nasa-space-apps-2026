// Sources the catalog cites. Copied from the registry in 04 §3 (IDs, URLs and status as recorded there).
// Only `nasa-hrp-risks` and `nasa-hrp-risk-ops-support` are also in src/data/sources.json; the test checks they match.

export type CatalogSourceId = 'nasa-hrp-risks' | 'nasa-hrp-risk-ops-support' | 'nasa-hrp-ongoing' | 'osdr-osd-575';

export interface CatalogSource {
  id: CatalogSourceId;
  title: string; // original language
  publisher: string;
  url: string;
  status: 'verified' | 'partial' | 'pending';
}

export const CATALOG_SOURCES: Record<CatalogSourceId, CatalogSource> = {
  'nasa-hrp-risks': {
    id: 'nasa-hrp-risks', title: 'Risks of Human Spaceflight', publisher: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/hrp/risks/', status: 'verified',
  },
  'nasa-hrp-risk-ops-support': {
    id: 'nasa-hrp-risk-ops-support', title: 'Risk of Inadequate Systems Operations Support', publisher: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/reference/risk-of-inadequate-systems-operations-support/', status: 'verified',
  },
  'nasa-hrp-ongoing': {
    id: 'nasa-hrp-ongoing', title: 'Ongoing HRP Research in Space', publisher: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/', status: 'verified',
  },
  'osdr-osd-575': {
    id: 'osdr-osd-575', title: 'SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays', publisher: 'NASA OSDR',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575', status: 'verified',
  },
};
