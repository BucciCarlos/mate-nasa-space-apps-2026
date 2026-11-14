import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScenarioFile } from './state/types';

// Populate the scenario registry from backend/data before any test runs.
const DATA_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '../../backend/data');
const load = (p: string) => JSON.parse(readFileSync(join(DATA_DIR, p), 'utf-8'));

// eslint-disable-next-line import/no-relative-packages
const { setScenarios } = await import('./state/initialState');
setScenarios(load('iss.json') as ScenarioFile, load('cislunar.json') as ScenarioFile);
