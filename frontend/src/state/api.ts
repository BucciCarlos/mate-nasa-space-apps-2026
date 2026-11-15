import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ScenarioFile, Source } from './types';

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
  tagTypes: ['Scenario', 'Sources'],
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
  }),
});

// RTK 2.x attaches hooks onto the api instance (module augmentation).
export const useIssScenarioQuery = mateApi.useIssScenarioQuery.bind(mateApi);
export const useCislunarScenarioQuery = mateApi.useCislunarScenarioQuery.bind(mateApi);
export const useSourcesQuery = mateApi.useSourcesQuery.bind(mateApi);
