import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ScenarioFile, Source } from './types';

const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8002';

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
