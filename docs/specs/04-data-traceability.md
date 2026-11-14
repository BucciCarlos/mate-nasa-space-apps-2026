# 04 — Data and traceability

Status: draft for team review · Sources consulted on 2026-11-14. Unverified items are marked and have a defined fallback.

## 1. Data policy (normative, MUST)

**Allowed**

- Simulating people (fictional crews), agendas, plans, link timing and status, and conversation. These are always labelled Simulated.
- Showing real data from verifiable sources in Evidence views, with full provenance.
- Computing clearly labelled values (Calculated) from inputs shown on screen.

**Forbidden**

1. Inventing physiological values, personal histories, clinical thresholds, probabilities, risk scores or predictions.
2. Attributing real data from any person to a fictional crew member, or combining records of different people into a baseline.
3. Filling an unobserved period, such as the in-flight phase of a dataset that has no in-flight samples.
4. Presenting an environmental or area measurement as a personal dose or exposure.
5. Presenting NASA-STD-3001 vehicle or habitat **system requirements** as personal health targets or thresholds (e.g. [V2 6004] CO₂, [V2 6109] water, [V2 7003] energy). Applying an **individual** limit such as the career radiation limit [V1 4030] to area or environmental data.
6. Interpreting individual lab results clinically: no high/low flags, no normal/abnormal.
7. Readiness verdicts (fit/unfit).

If a source does not state something, the UI says **"Not documented by source"**.

## 2. Provenance model

```ts
type Origin = 'simulated' | 'user_entered' | 'nasa_resource' | 'partner_resource'
            | 'flight_measured' | 'published_aggregate' | 'calculated';
type ClaimType = 'observed' | 'self_reported' | 'personal_pattern' | 'model_estimate' | 'unvalidated_hypothesis';
interface Provenance {
  origin: Origin;
  sourceId?: string;             // key in src/data/sources.json
  claimType?: ClaimType;
  transformations?: string[];    // i18n keys describing each transformation
  status?: 'verified' | 'partial' | 'pending';
}
```

- The two axes are independent. `origin` says where a datum comes from; `claimType` says what kind of statement it supports.
- In the prototype, `model_estimate` and `unvalidated_hypothesis` are never used for displayed values. They are reserved for FUTURE work and must be badged if ever used.
- `personal_pattern` requires records of the same person; M1–M3 have none (02 §6.4).
- Origins `terrestrial_measured` and `analog_measured` (Earth-based or analog studies) are reserved. The prototype uses no Earth-based datasets.
- Mapping to UI badges: 03 §5.

## 3. Source registry (`src/data/sources.json`)

Schema:

```ts
interface Source {
  id: string; title: string;            // title in original language
  publisher: string; url: string;
  kind: 'nasa_resource' | 'partner_resource' | 'dataset' | 'standard' | 'publication';
  challengeResource: boolean;           // true if listed in, or linked from, the challenge Resources tab
  accessedAt: string;                   // ISO date
  supports: { en: string; es: string }; // the product behaviour or content it supports
  status: 'verified' | 'partial' | 'pending';
  reuse: { en: string; es: string };    // license / attribution note
}
```

**Verification references** used in the Status column (all reviews on 2026-11-14):

- **[R0]** Source audit during project planning: pages and datasets opened; not all re-checked later.
- **[R1]** Checks made while writing these specs: files downloaded and inspected, pages fetched.
- **[R2]** Independent documentation audit MATE-AUD01:
  - re-downloaded the two Inspiration4 files and checked the five selected analytes;
  - opened the two NASA-STD-3001 requirements quoted below;
  - read the OSDR terms, NASA SPD-41a and the SPDF data use policy.

A status records what was checked and by which review. **It is not a permission to redistribute**; see the Reuse column and §9.

| ID | Title · publisher | URL | Supports (product behaviour or content) | Status | Reuse |
|---|---|---|---|---|---|
| `nasa-hrp-risks` | Risks of Human Spaceflight · NASA HRP (**challenge resource**) | https://www.nasa.gov/hrp/risks/ | Module catalog: each of the 17 risks is mapped to a module and linked (01 §5.2) | verified [R1]: all 17 risk pages respond (HTTP 200); listed among the challenge resources [R2] | U.S. Government work; cite; no NASA logos |
| `nasa-hrp-risk-sleep` | Risk from Inadequate Sleep and Irregular Schedules · NASA HRP (linked from the challenge resource) | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/ | **M1:** a reduction of the planned rest window is surfaced to the crew member as a context change and explained with NASA's description of the risk, without inferring outcomes. Companion `why.it_matters`; MOD-SLEEP. | verified [R1, R2] (page last updated 2025-05-16) | same |
| `nasa-hrp-risk-ops-support` | Risk of Inadequate Systems Operations Support · NASA HRP (linked from the challenge resource) | https://www.nasa.gov/reference/risk-of-inadequate-systems-operations-support/ | **M1:** the onboard core computes and explains changes locally, without real-time Ground support. Risk statement: "Risk of adverse mission outcomes due to Earth independent human-systems operation". | verified [R1, R2] (last updated 2025-05-16) | same |
| `nasa-hrp-hazards` | 5 Hazards of Human Spaceflight · NASA HRP (**challenge resource**) | https://www.nasa.gov/hrp/hazards/ | Catalog framing (five hazards); MOD-ENV hazard reference | verified [R0] (page content reviewed) | same |
| `nasa-hrp-ongoing` | Ongoing HRP Research in Space · NASA HRP (**challenge resource**) | https://www.nasa.gov/hrp/ongoing-hrp-research/ | Context for concept cards (e.g. Standard Measures, Tempus Pro, Immune Biomarkers) | verified [R0] (page content reviewed) | same |
| `csa-radiation` | Monitoring radiation for astronaut health · Canadian Space Agency (**challenge resource**) | https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp | MOD-RAD text: neutrons contribute about 30 % of total radiation on the ISS; CANS measures neutrons continuously and autonomously | verified [R0]; re-check the quote before release | CSA site terms; short quotes with link |
| `csa-why-science` | Why do we conduct science experiments in space? · CSA (**challenge resource**) | https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp | Concept cards: context such as the accelerated-aging analogy | verified [R0] (page content reviewed) | same |
| `osdr-osd-575` | SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays · NASA OSDR | https://osdr.nasa.gov/bio/repo/data/studies/OSD-575 | MOD-LABS (metabolic panel) | verified [R1]: files downloaded, columns and units inspected. [R2]: the selected analytes re-checked (4 codes × 7 timepoints, no gaps, no duplicates). | OSDR terms: distributed under NASA's Science Information Policy (SPD-41a: open availability and reuse, subject to applicable restrictions) [R2]. Cite the dataset; credit "Data are courtesy of the NASA Open Science Data Repository". The conditions for redistributing the derived subset are recorded before any data is committed (§9). |
| `osdr-osd-569` | Whole Blood Measurements from the SpaceX Inspiration4 Mission · NASA OSDR | https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 | MOD-LABS (complete blood count) | same as OSD-575 | same as OSD-575 |
| `osdr-eda` | Environmental Data Application · NASA OSDR | https://visualization.osdr.nasa.gov/eda/ | MOD-ENV | **partial** [R0, R1]: coverage checked; the unit (ppm) is taken from the application's label; sensor and location within the ISS are not documented | Cite OSDR (EDA credit line). Redistribution conditions recorded before any data is committed (§9). |
| `cdaweb-iss-tepc` | ISS_DOSANL_TEPC · NASA SPDF/CDAWeb (data provider: NASA Space Radiation Analysis Group, JSC) | https://cdaweb.gsfc.nasa.gov/misc/NotesI.html#ISS_DOSANL_TEPC · DOI 10.48322/0ba1-1764 | MOD-RAD | **partial:** metadata verified [R1]; product notes opened [R2]; data not downloaded; location code not decoded | The SPDF data use policy declares CC0 unless otherwise indicated [R2]. This product's notes must be checked for specific conditions before that default is applied (§9). Cite the DOI. |
| `nasa-std-3001-v1` | NASA-STD-3001 Vol. 1 Rev C · NASA | https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf | MOD-RAD text: [V1 4030] is an **individual** career effective-dose limit (below 600 mSv), a radiation-protection limit for a person. Shown as standard text only, and never related to area-monitor data. | verified [R2]: Vol. 1 Rev C §4.8.2, p. 39 | public |
| `nasa-std-3001-v2` | NASA-STD-3001 Vol. 2 Rev F · NASA | https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf | MOD-ENV text: [V2 6004] system requirement, one-hour average ppCO₂ no greater than 3 mmHg | verified [R2]: Vol. 2 Rev F §6.2.1.3, p. 53 | public |
| `osdr-radlab` | RadLab · NASA OSDR | https://visualization.osdr.nasa.gov/radlab/ | M4 SHOULD: per-module ISS dose series | **pending** [R1]: application and documentation returned HTTP 500; units undocumented | — |
| `nasa-donki` | DONKI space weather database · NASA | https://api.nasa.gov/ | M4 SHOULD: historical solar events | verified [R0] | public API; snapshot at build |
| `barger-2014` | Barger et al., *Lancet Neurology* 2014;13:904–12 | https://pubmed.ncbi.nlm.nih.gov/25127232/ | M2 SHOULD: published aggregate in MOD-SLEEP (ISS crew obtained a mean of 6.09 h of sleep per night) | verified [R0] (abstract) | cite numbers; do not copy figures |

**Not used, and not bundled:**

| Source | Reason |
|---|---|
| WESAD, CAMUS, The POCUS Atlas | Non-commercial terms, incompatible with an open-source repository |
| PhysioNet `cardioresp-response-orthostat` | License forbids sharing |
| SENSE-42 | Restricted access |
| AGBRESA on Dryad | DOI does not resolve |
| MMASH and other Earth-based datasets as a crew baseline | Each MMASH participant covers 24 hours; mixing people to build a baseline is forbidden (§1) |

## 4. MOD-LABS contract: Inspiration4 (OSD-575, OSD-569)

### 4.1 Facts verified on 2026-11-14

- **Mission:** SpaceX Inspiration4, a 3-day private mission to low Earth orbit. OSDR mission dates: 2021-09-16 to 2021-09-18.
- **Consent:** the study metadata states "All crew members have consented for data and sample sharing". The IRB is Weill Cornell Medicine, protocol 21-05023569. Public release date 2024-05-14.
- **Files**, all `restricted: false` in the OSDR file API:
  - OSD-575 `LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv`: long format. Columns `ANALYTE, VALUE, RANGE_MIN, RANGE_MAX, UNITS, TEST_TYPE, SUBJECT_ID, SEX, timepoint`; 531 data rows; 19 analytes; 22 values `NA`.
  - OSD-569 `LSDS-7_Complete_Blood_Count_CBC.upload_SUBMITTED.csv`: long format. Same columns, but with `TEST_DATE` instead of `timepoint`; 553 data rows; 20 analytes plus three "(FEMALE)" variants.
- **Subjects** C001–C004.
- **Timepoints** L-92, L-44, L-3, R+1, R+45, R+82, R+194 (both files). There are **no in-flight samples in these files**, and R+1 is post-flight.
- **Units** are given per row: GLUCOSE and CALCIUM in mg/dL; HEMOGLOBIN in g/dL; RED BLOOD CELL COUNT in Million/uL; WHITE BLOOD CELL COUNT in Thousand/uL.
- **Pitfalls:**
  - The TRANSFORMED CBC file names the hemoglobin column `hemoglobin_value_percent`, while the SUBMITTED file gives g/dL. Use SUBMITTED.
  - The OSD-575 study description lists post-flight timepoints up to R+82, but the CMP file also contains R+194.
  - The CMP includes two race-coefficient eGFR analytes.
  - The CBC encodes sex in analyte names ("HEMOGLOBIN (FEMALE)"), and the reference ranges are sex-specific.

### 4.2 Scope

| Display ID | Source ANALYTE | Unit (source → display) | Milestone |
|---|---|---|---|
| `glucose` | GLUCOSE | mg/dL → mg/dL | M2 MUST |
| `calcium` | CALCIUM | mg/dL → mg/dL | M2 MUST |
| `hemoglobin` | HEMOGLOBIN, HEMOGLOBIN (FEMALE) | g/dL → g/dL | M2 MUST |
| `rbc` | RED BLOOD CELL COUNT, RED BLOOD CELL COUNT (FEMALE) | Million/uL → 10⁶/µL | M2 MUST |
| `wbc` | WHITE BLOOD CELL COUNT | Thousand/uL → 10³/µL | M2 MUST |
| other CMP and CBC analytes | as listed in the files | as in the files | M4 SHOULD |
| cytokines (Eve panels) | — | — | M4 SHOULD. Caveat: the source normalizes them "by average of pre-flight values from all crew", a cross-person normalization that must be stated if shown. |

### 4.3 Transformations (all recorded in the output file)

1. Keep `SUBJECT_ID`, timepoint, `ANALYTE`, `VALUE` and `UNITS`.
2. **Drop `SEX`, `RANGE_MIN` and `RANGE_MAX`.** Sex-specific ranges would reveal each subject's sex, and M.A.T.E. does not interpret lab results.
3. Merge the "(FEMALE)" analyte variants into the base analyte ID, so sex is no longer encoded.
4. Exclude the two race-coefficient eGFR analytes.
5. Map `NA` to `null`, displayed as "No value in source".
6. No unit conversion, no rounding beyond source precision, no aggregation across subjects.

### 4.4 Output file `src/data/evidence/i4-labs.json`

```ts
interface I4Labs {
  sourceIds: ['osdr-osd-575', 'osdr-osd-569'];
  accessedAt: string;
  rawFiles: { name: string; url: string; sha256: string }[];
  flight: { start: '2021-09-16'; end: '2021-09-18' };
  timepoints: ['L-92', 'L-44', 'L-3', 'R+1', 'R+45', 'R+82', 'R+194'];
  subjects: ['C001', 'C002', 'C003', 'C004'];
  analytes: {
    id: 'glucose' | 'calcium' | 'hemoglobin' | 'rbc' | 'wbc';
    sourceAnalytes: string[]; unit: string; panel: 'CMP' | 'CBC';
    values: { subject: string; timepoint: string; value: number | null }[];
  }[];
  transformations: string[];  // i18n keys for §4.3
}
```

### 4.5 Display rules

- Title: "Real lab changes around a flight: a published crew (Inspiration4)".
- Disclaimer, always visible: these are four real private astronauts, identified only by the codes published by NASA OSDR (C001–C004). They are not M.A.T.E.'s fictional crew, and their results are never shown as anyone else's.
- X axis: L-92, L-44, L-3 · **flight band** · R+1, R+45, R+82, R+194 (ordered categories). Flight band text: "Flight, Sep 16–18, 2021 — no samples in these files".
- One line per code, distinguished by marker shape and direct labels (not color alone). A table view is available.
- No reference ranges, no flags, no cross-subject mean, no names, sex or age, no link to public figures.
- Notes shown on screen:
  - "Values as published. M.A.T.E. does not interpret individual lab results."
  - On the glucose chart: "At R+45, three codes show much lower values than at other timepoints; the source does not explain this."
- SHOULD (M4): a "Change vs own pre-flight" toggle.
  - For each code, it shows value − mean of that same code's L-92, L-44 and L-3 values (badge Calculated; formula in the popover).
  - It is calculated only when all three pre-flight values of that code and analyte are present.
  - Otherwise that line reads "Not calculated: incomplete pre-flight values for this code". There is no partial mean, and values of other codes are never used.
- Attribution: "Data: NASA Open Science Data Repository, OSD-575 and OSD-569 (SpaceX Inspiration4). Data are courtesy of the NASA Open Science Data Repository." plus the dataset citations.
- **No-data state (MUST).** The view shows it when `src/data/evidence/i4-labs.json` is absent or fails validation (§4.6). It contains:
  - title and disclaimer;
  - the source registry entries for OSD-575 and OSD-569;
  - the expected files;
  - the reason the data is pending ("Not loaded" or "Failed validation: {reason}");
  - **no curves and no values.**
  This state does not close M2 (05 §3).

### 4.6 Validation per participant–analyte–timepoint (pipeline, MUST)

- Checking only the global sets of subjects and timepoints is not enough. After merging the "(FEMALE)" variants, the pipeline checks every combination of the 4 codes × 5 analytes × 7 timepoints (140):
  - exactly one record, with no duplicates and no missing combination;
  - the expected unit (§4.2);
  - a numeric value, or `NA` mapped to `null`. Each `null` is listed in the output and reported, never filled in.
- Any duplicate, missing combination or unexpected unit fails the script, and the view shows its no-data state.
- Review [R2] found all 140 selected combinations present with no `NA` and no duplicates. This finding covers only these five analytes; it is not extended to the optional analytes or to the cytokines.

## 5. MOD-ENV contract: cabin CO₂ (OSDR EDA)

**Measurement card** (always shown):

| Field | Value |
|---|---|
| Detector | Not documented by source |
| Location | ISS (module not specified by source) |
| Dates | Window chosen by the pipeline (UTC) |
| Unit | ppm (as labelled by the source application) |
| Coverage | Only the windows of the biology payload missions in EDA (Rodent Research, APEX, VEG; 2014–2024); not continuous ISS telemetry |
| What it measures | CO₂ concentration (ppm) reported by the source for the ISS cabin during the window |
| What it does not represent | Anyone's personal exposure. Not converted to ppCO₂ in mmHg, because cabin total pressure is not in the dataset. |

- **Series:** one continuous 7-day window of ISS CO₂ from EDA mission RR-1, or from the first mission whose ISS CO₂ series has no null values for 7 days. Raw cadence, no aggregation. The pipeline records the mission, window and cadence.
- **Standard text:** NASA-STD-3001 Vol. 2 [V2 6004] sets a design requirement for the habitable volume: one-hour average ppCO₂ of no more than 3 mmHg. It is shown as text next to the chart, **not as a line on the chart** (different units; it is a vehicle requirement, not a personal threshold).
- **Fallback:** if the pipeline cannot confirm a non-null window and its unit, the view shows "Pending verification" with the measurement card and the standard text only.

## 6. MOD-RAD contract: radiation environment (CDAWeb ISS TEPC)

**Measurement card:**

| Field | Value |
|---|---|
| Detector | TEPC (tissue-equivalent proportional counter), serial number 1003 (CDAWeb notes) |
| Location | Inside the ISS. The source carries a location code that has not been decoded, so it is shown as "location code not decoded". |
| Unit | µGy/min, average absorbed dose rate (variable `DOSE`) |
| Coverage | 2010-04-29 → 2018-04-11; one 7-day window is shown (chosen by the pipeline) |
| What it measures | The absorbed dose rate at the location of an **area monitor** inside the ISS (the TEPC), averaged over the source's time interval |
| What it does not represent | Any person's dose. The individual career dose limit [V1 4030] cannot be applied to it. |

- **Text content:**
  - From the CSA challenge resource: neutrons contribute about 30 % of total radiation on the ISS, and CANS will measure neutron radiation continuously and autonomously.
  - NASA-STD-3001 Vol. 1 [V1 4030] is a radiation-protection limit **for an individual crew member**: a career effective dose below 600 mSv (Vol. 1 Rev C §4.8.2). It is shown as standard text, separately from the area-monitor series.
  - **No personal dose, and no fraction or percentage of that limit, is ever computed from `DOSE`.**
- **SHOULD (M4):** `DOSE_EQ60` (µSv/min) with the same caveats; DONKI solar events on the same timeline; RadLab per-module series once units are documented.
- **Fallback:** until data is downloaded and checked, "No data loaded" with the card and the text content.

## 7. MOD-SLEEP evidence (M2)

- NASA HRP risk page, with short verbatim quotes checked on 2026-11-14:
  - stressors "such as work overload, irregular light-dark cycles, and sleep-pattern disruptions";
  - countermeasures named by NASA: "light-emitting diodes, or LEDs, simulate Earth's light-dark cycle to help astronauts sleep better" and "Astronauts are also given designated times for relaxation and self-care as part of their routine to help prevent burnout."
- Personal section: "No sleep records for {name} in this prototype", with the reason (no sleep measurements are simulated).
- SHOULD: the Barger 2014 aggregate with the badge Published result. It describes other crews, not this crew member.

## 8. Simulated scenario (M1)

All content in this section is **Simulated**. It is not based on ISS operations data. Crew names are fictional: before release, check that none matches a real astronaut.

### 8.1 ISS (`iss.json`)

- `clockStart` 2027-03-09T14:00:00Z; `flightDayOne` 2027-01-28, so the session starts on FD 41.
- Link up; `transitMs` 4000.
- `onboardUserId` `iss:crew-lf`.
- Crew:

| ID | Name | Role title EN / ES |
|---|---|---|
| `iss:crew-lf` | Lucía Ferraro | Flight engineer / Ingeniera de vuelo |
| `iss:crew-ti` | Tomás Ibarra | Commander / Comandante |
| `iss:crew-mo` | Mei Okada | Flight engineer / Ingeniera de vuelo |

Plan version 1 (UTC):

| ID | Kind | Crew | Day | Start–End | Title EN / ES | Movable |
|---|---|---|---|---|---|---|
| `iss:blk-01` | task | lf, ti | Mar 9 | 14:00–16:00 | Station maintenance / Mantenimiento de la estación | no |
| `iss:blk-02` | task | mo | Mar 9 | 14:00–17:30 | Payload operations / Operaciones de carga útil | no |
| `iss:blk-03` / `-04` | exercise | lf / ti | Mar 9 | 16:00–17:30 | Exercise session / Sesión de ejercicio | no |
| `iss:blk-05` | meal | lf, ti, mo | Mar 9 | 18:00–19:00 | Evening meal / Cena | no |
| `iss:blk-06` | personal | lf, ti, mo | Mar 9 | 19:00–21:00 | Personal time / Tiempo personal | no |
| `iss:blk-07`…`-09` | pre_sleep | one each | Mar 9 | 21:00–21:30 | Pre-sleep / Preparación para dormir | no |
| `iss:blk-10`…`-12` | sleep | one each | Mar 9–10 | 21:30–06:00 | Sleep / Sueño | no |
| `iss:blk-13`…`-15` | post_sleep | one each | Mar 10 | 06:00–07:30 | Post-sleep / Rutina al despertar | no |
| `iss:blk-16` | task | lf, ti | Mar 10 | 07:30–09:00 | Payload hardware swap / Cambio de hardware de carga útil | **yes** (M1 demo task) |
| `iss:blk-17` | task | mo | Mar 10 | 07:30–10:00 | Station inspection / Inspección de la estación | no |
| `iss:blk-18` | conference | lf, ti, mo | Mar 10 | 10:00–10:30 | Crew conference with Ground / Conferencia con Tierra | no |
| `iss:blk-19` | meal | lf, ti, mo | Mar 10 | 12:00–13:00 | Midday meal / Almuerzo | no |
| `iss:blk-20` | task | mo | Mar 10 | 14:00–16:00 | Sample processing / Procesamiento de muestras | **yes** (no sleep impact; conflict case) |

Expected rule results, also used as unit tests:

| Change | Result |
|---|---|
| `blk-16` advanced 90 min | Lucía and Tomás: planned rest window 21:30–06:00 (8 h 30 min) → 21:30–04:30 (7 h 00 min), −1 h 30 min. Post-sleep 04:30–06:00. |
| `blk-16` advanced 120 min | 6 h 30 min (−2 h 00 min) |
| `blk-16` advanced 30 min after the 90-min change | 6 h 30 min (−30 min, relative to version 2) |
| `blk-20` advanced 60 min | Allowed; Mei's planned rest window unchanged |
| `blk-20` advanced 90 or 120 min | Conflict with `iss:blk-19` |

### 8.2 Cislunar mission (`cislunar.json`)

- `clockStart` 2027-03-09T14:00:00Z; `flightDayOne` 2027-02-26, so the session starts on FD 12.
- Link up; `transitMs` 6000; `onboardUserId` null.
- Crew:

| ID | Name | Role title EN / ES |
|---|---|---|
| `cis:crew-nh` | Nadia Haddad | Commander / Comandante |
| `cis:crew-km` | Kofi Mensah | Pilot / Piloto |
| `cis:crew-ev` | Elin Vang | Mission specialist / Especialista de misión |
| `cis:crew-jr` | Joaquín Rojas | Mission specialist / Especialista de misión |

- Plan version 1:
  - Per crew member: pre-sleep 21:30–22:00, sleep 22:00–06:30, post-sleep 06:30–08:00.
  - `cis:blk-20` task (all 4), Mar 10 08:00–09:00, "Communications window rehearsal / Ensayo de ventana de comunicaciones", **movable**.
  - Meal (all 4), Mar 10 12:00–13:00, "Midday meal / Almuerzo".
  - Task (nh, km), Mar 10 14:00–16:00, "Habitat systems check / Revisión de sistemas del hábitat", not movable.
  - The remaining afternoon blocks are free to design, within the scenario rules of 02 §11.

### 8.3 Journey content (M3)

Short, simulated plan items, bilingual, with no clinical specifics:

- Pre-flight: "Meet your companion", "Choose what you share", "Review your mission agenda".
- Post-flight: "Reconditioning sessions scheduled by your Ground team", "Medical check-in", "Rest". Shown as agenda-like items with the badge Simulated.

## 9. Attribution, licensing and media

- The Sources page (M2) lists every source with status, access date, what it supports and its reuse note. The README carries a short credits section.
- **License of original M.A.T.E. material:** Apache License 2.0. The full text is in `LICENSE` at the repository root. It covers the code, documentation and original design assets created by Team Sora. The team chose this license; it is not presented as the only license the contest allows.
- **Third-party data and materials keep their own conditions.** Apache-2.0 does not relicense them. This covers NASA and CSA pages, OSDR and CDAWeb data, NASA-STD-3001 and cited publications: each keeps its own terms, credits and citations, listed in §3 and on the Sources page.
- **Repository contents today:** documentation only. There is no data file in the repository yet.
- **Before committing any derived data subset (M2), record for each one:**
  1. the policy that applies, with its URL and date of consultation;
  2. the attribution and citation required;
  3. any exception specific to that product.

  Known so far [R2]: OSDR distributes its data under NASA's Science Information Policy (SPD-41a: open availability and reuse, subject to applicable restrictions) and asks for citation and credit. The SPDF data use policy declares CC0 unless otherwise indicated; the TEPC product notes must be checked before applying that default.
- **What does not establish redistribution conditions:**
  - removing columns or deriving a subset: the subset is still a redistribution;
  - a file being listed as `restricted: false`.
- **Raw source files are never committed.** Only validated derived subsets in `src/data/evidence/*.json`, with attribution, links and checksums of the raw files, are committed, and only once their conditions are recorded. This is pending; it does not block publishing documentation that contains no data.
- No NASA insignia, logotype or seal, no mission patches and no images of real astronauts anywhere (03 §4).

## 10. Data pipeline (M2)

- Scripts in `scripts/data/*.mjs` (Node.js 20+, no dependencies), run manually, never during `npm run build` and never in the browser.
- Each script:
  1. Downloads into `data-raw/` (git-ignored) and records the URL, date and SHA-256 of each file.
  2. **Fails loudly** if columns, units, subjects or timepoints differ from this spec, or if a per-record validation such as §4.6 fails.
  3. Applies only the transformations listed here.
  4. Writes `src/data/evidence/<name>.json` including `transformations` and `rawFiles`.
- Order: `i4-labs` → `rad-tepc` → `env-eda`. A failing script leaves its module in its fallback state; it does not block the others.
- `data-raw/` is excluded in `.gitignore` **before** the first download.
