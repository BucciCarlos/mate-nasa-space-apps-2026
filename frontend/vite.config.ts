/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Emite en backend/app/static para que el backend FastAPI sirva la SPA
  // (deploy unificado en Vercel; ver terraform/README.md).
  base: './',
  plugins: [react()],
  build: {
    // En producción el backend sirve la SPA desde el mismo origen (Vercel);
    // localmente se mantiene dist/ para `pnpm preview`.
    outDir: process.env.MATE_BUILD_OUT ?? 'dist',
    emptyOutDir: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/test-setup.ts'],
  },
});
