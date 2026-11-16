/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Emite en backend/app/static para que el backend FastAPI sirva la SPA
  // (deploy unificado en Vercel; ver terraform/README.md).
  base: './',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // runonweb ships raw TS (src/stt/index.ts) that the dep optimizer's parser
    // can't handle. It's only ever dynamically imported at runtime (mic tap),
    // so skip pre-bundling it and let the browser load it on demand.
    exclude: ['runonweb'],
  },
  server: {
    // Chrome treats http://localhost as a secure context, so getUserMedia and
    // WebGPU work on :5173 without HTTPS. If you open the app through a
    // different hostname (LAN IP, tunnel, Vercel preview), switch to a real
    // certificate: pnpm dev -- --host --cert=localhost-ip-000-web.org.crt
    // --key=localhost-ip-000-web.org.key (mkcert makes this trivial).
    //
    // Dev-only: proxy the API to the FastAPI backend so the same-origin
    // default in src/state/api.ts works with `pnpm dev` (frontend on :5173).
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://0.0.0.0:8002',
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
    // Filenames estables (sin hash de contenido) para evitar 404s cuando el
    // HTML cacheado referencia assets de un deploy anterior.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/test-setup.ts'],
  },
});
