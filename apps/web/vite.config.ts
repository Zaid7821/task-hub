import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { msw } from 'msw/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/** Fails `vite build` if dev-only switches are on, so they can never reach production. */
function forbidDevFlagsInBuild(mode: string): Plugin {
  return {
    name: 'forbid-dev-flags-in-build',
    apply: 'build',
    configResolved() {
      const env = loadEnv(mode, process.cwd(), 'VITE_');
      if (env.VITE_AUTH_MODE === 'dev') {
        throw new Error('VITE_AUTH_MODE=dev is not allowed in builds. Use "entra".');
      }
      if (env.VITE_USE_MOCKS === 'true') {
        throw new Error('VITE_USE_MOCKS=true is not allowed in builds.');
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Serves /mockServiceWorker.js in dev only; nothing is emitted into production builds.
    { ...msw({ mode: 'worker-only' }), apply: 'serve' },
    forbidDevFlagsInBuild(mode),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}));
