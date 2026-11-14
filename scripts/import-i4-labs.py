"""Build the offline evidence subset from the two public OSDR submitted CSVs."""
import csv
import hashlib
import json
import math
import sys
from datetime import date
from pathlib import Path

SUBJECTS = ('C001', 'C002', 'C003', 'C004')
TIMEPOINTS = ('L-92', 'L-44', 'L-3', 'R+1', 'R+45', 'R+82', 'R+194')
FILES = {
    'CMP': ('OSD-575', 'LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv', 'timepoint'),
    'CBC': ('OSD-569', 'LSDS-7_Complete_Blood_Count_CBC.upload_SUBMITTED.csv', 'TEST_DATE'),
}
ANALYTES = [
    ('glucose', 'CMP', 'GLUCOSE', 'mg/dL', 'mg/dL'),
    ('calcium', 'CMP', 'CALCIUM', 'mg/dL', 'mg/dL'),
    ('hemoglobin', 'CBC', 'HEMOGLOBIN', 'g/dL', 'g/dL'),
    ('rbc', 'CBC', 'RED BLOOD CELL COUNT', 'Million/uL', '10⁶/µL'),
    ('wbc', 'CBC', 'WHITE BLOOD CELL COUNT', 'Thousand/uL', '10³/µL'),
]


def build(folder, accessed_at):
    raw_files, panels, analytes = [], {}, []
    for panel, (study, name, time_column) in FILES.items():
        path = folder / name
        url = f'https://osdr.nasa.gov/geode-py/ws/studies/{study}/download?source=datamanager&file={name}'
        raw_files.append({'name': name, 'url': url, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        with path.open(encoding='utf-8-sig', newline='') as source:
            panels[panel] = list(csv.DictReader(source)), time_column

    for key, panel, analyte, expected_unit, display_unit in ANALYTES:
        rows, time_column = panels[panel]
        aliases = [analyte] if key not in ('hemoglobin', 'rbc') else [analyte, f'{analyte} (FEMALE)']
        values = {}
        for row in rows:
            if row['ANALYTE'] not in aliases:
                continue
            subject, timepoint = row['SUBJECT_ID'], row[time_column]
            pair = subject, timepoint
            if subject not in SUBJECTS or timepoint not in TIMEPOINTS or pair in values:
                raise ValueError(f'{key}: unexpected or duplicate pair {pair}')
            if row['UNITS'] != expected_unit:
                raise ValueError(f'{key}: expected {expected_unit}, got {row["UNITS"]}')
            value = None if row['VALUE'] == 'NA' else float(row['VALUE'])
            if value is not None and not math.isfinite(value):
                raise ValueError(f'{key}: non-finite value at {pair}')
            values[pair] = value
        analytes.append({
            'id': key, 'panel': panel, 'sourceAnalytes': aliases, 'unit': display_unit,
            'values': [
                {'subject': subject, 'timepoint': timepoint, 'value': values[subject, timepoint]}
                for subject in SUBJECTS for timepoint in TIMEPOINTS
            ],
        })
    return {
        'sourceIds': ['osdr-osd-575', 'osdr-osd-569'], 'accessedAt': accessed_at,
        'rawFiles': raw_files, 'flight': {'start': '2021-09-16', 'end': '2021-09-18'},
        'timepoints': TIMEPOINTS, 'subjects': SUBJECTS, 'analytes': analytes,
        'transformations': ['monitoring.transformations'],
    }


if __name__ == '__main__':
    data = build(Path(sys.argv[1]), date.fromisoformat(sys.argv[2]).isoformat())
    destination = Path(__file__).resolve().parents[1] / 'src/data/evidence/i4-labs.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
