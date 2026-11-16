import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Action, ThunkDispatch } from '@reduxjs/toolkit';
import type { ScenarioFile, Source } from './types';
import type { I4Labs, TepcWindow, SleepAggregate } from '../views/evidence/evidenceTypes';

// By default the API is on the SAME origin as the app. That works when the
// backend serves the built SPA (pnpm build -> backend/app/static) and when a
// reverse proxy (Vercel) fronts both. Override with VITE_API_BASE for a
// different origin, e.g. VITE_API_BASE=http://localhost:8002.
const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

/**
 * RTK Query endpoint for the M.A.T.E. backend.
 * The backend is the single source of truth for scenario + source data.
 */
export const mateApi = createApi({
  reducerPath: 'mateApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: ['Scenario', 'Sources', 'Evidence'],
  endpoints: (builder) => ({
    issScenario: builder.query<ScenarioFile, void>({
      query: () => '/api/scenarios/iss',
      providesTags: ['Scenario'],
    }),
    cislunarScenario: builder.query<ScenarioFile, void>({
      query: () => '/api/scenarios/cislunar',
      providesTags: ['Scenario'],
    }),
    sources: builder.query<Source[], void>({
      query: () => '/api/sources',
      providesTags: ['Sources'],
    }),
    // Historical evidence subsets (DATA03). Fetched lazily when the Evidence
    // page opens; cached in the RTK Query store (tag 'Evidence').
    evidenceLabs: builder.query<I4Labs, void>({
      query: () => '/api/evidence/labs',
      providesTags: ['Evidence'],
    }),
    evidenceRadiation: builder.query<TepcWindow, void>({
      query: () => '/api/evidence/radiation',
      providesTags: ['Evidence'],
    }),
    evidenceSleep: builder.query<SleepAggregate, void>({
      query: () => '/api/evidence/sleep',
      providesTags: ['Evidence'],
    }),
    // FD30 companion chat: one POST per question, fresh conversation on the
    // backend (system prompt + optional scenario context). No caching.
    askAgent: builder.mutation<{ reply: string; model: string | null }, { text: string; lang: 'en' | 'es'; context?: string }>({
      query: (body) => ({ url: '/api/chat', method: 'POST', body }),
    }),
  }),
});

export const useAskAgentMutation = mateApi.useAskAgentMutation.bind(mateApi);

/**
 * Promise wrapper for the chat mutation for callers outside React (FD30
 * preview event handlers). Routes through the shared store.
 */
export async function askAgent(
  dispatch: ThunkDispatch<unknown, undefined, Action>,
  body: { text: string; lang: 'en' | 'es'; context?: string },
): Promise<{ reply: string; model: string | null }> {
  const action = await dispatch(mateApi.endpoints.askAgent.initiate(body));
  if ('error' in action) throw action.error;
  return action.data;
}

// RTK 2.x attaches hooks onto the api instance (module augmentation).
export const useIssScenarioQuery = mateApi.useIssScenarioQuery.bind(mateApi);
export const useCislunarScenarioQuery = mateApi.useCislunarScenarioQuery.bind(mateApi);
export const useSourcesQuery = mateApi.useSourcesQuery.bind(mateApi);
export const useEvidenceLabsQuery = mateApi.useEvidenceLabsQuery.bind(mateApi);
export const useEvidenceRadiationQuery = mateApi.useEvidenceRadiationQuery.bind(mateApi);
export const useEvidenceSleepQuery = mateApi.useEvidenceSleepQuery.bind(mateApi);
