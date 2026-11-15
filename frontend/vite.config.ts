/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Emite en backend/app/static para que el backend FastAPI sirva la SPA
  // (deploy unificado en Vercel; ver terraform/README.md).
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    // Dev-only: proxy the API to the FastAPI backend so the same-origin
    // default in src/state/api.ts works with `pnpm dev` (frontend on :5173).
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8002',
        changeOrigin: true,
      },
    },
  },
  build: {
    // El backend FastAPI sirve la SPA desde backend/app/static (mismo origen en
    // Vercel y localmente tras `pnpm build`). MATE_BUILD_OUT permite otro destino
    // (p. ej. `dist` para `pnpm preview`).
    outDir: process.env.MATE_BUILD_OUT ?? '../backend/app/static',
    emptyOutDir: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/test-setup.ts'],
  },
});
