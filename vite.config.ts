import { defineConfig } from 'vite';

// Relative base so dist/ works from any path or subdomain.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    host: '127.0.0.1',
    port: 5191,
    strictPort: true,
  },
});
