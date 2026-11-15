// Sources the catalog cites. Copied from the registry in 04 §3 (IDs, URLs and status as recorded there).
// Only `nasa-hrp-risks` and `nasa-hrp-risk-ops-support` are also in src/data/sources.json; the test checks they match.

export type CatalogSourceId = 'nasa-hrp-risks' | 'nasa-hrp-risk-ops-support' | 'nasa-hrp-ongoing' | 'osdr-osd-575' | 'ochmo-tb-037' | 'osdr-osd-65' | 'osdr-osd-252';

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
  // CAT09: verified in CAT-SRC01 (2026-11-15). The OCHMO brief was downloaded and read; the OSDR studies were read through the OSDR metadata API
  // (their HTML pages are rendered in the browser and were not opened), so they are recorded as partial.
  'ochmo-tb-037': {
    id: 'ochmo-tb-037', title: 'NASA-STD-3001 Technical Brief OCHMO-TB-037 Rev D: Decompression Sickness (DCS) Risk Mitigation', publisher: 'NASA OCHMO',
    url: 'https://www.nasa.gov/sites/default/files/atoms/files/dcs_technical_brief_ochmo.pdf', status: 'verified',
  },
  'osdr-osd-65': {
    id: 'osdr-osd-65', title: 'OSD-65: Microbial Observatory (ISS-MO): Microbial diversity', publisher: 'NASA OSDR',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-65', status: 'partial',
  },
  'osdr-osd-252': {
    id: 'osdr-osd-252', title: 'OSD-252: International Space Station - Microbial Observatory of Pathogenic Virus, Bacteria, and Fungi project', publisher: 'NASA OSDR',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-252', status: 'partial',
  },
};
