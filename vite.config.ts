// Vite config: React for the browser, the API mounted on the dev and preview servers, and the page title.
import { getRequestListener } from '@hono/node-server';
import react from '@vitejs/plugin-react';
import { type Connect, defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite';
import { APP_NAME } from './src/config/app.js';
import { PAGE_HEADERS } from './src/config/headers.js';
import { createApp } from './src/server/app.js';
import { createRuntimeDeps } from './src/server/runtime.js';

const isApiPath = (url: string): boolean => url === '/api' || /^\/api[/?]/.test(url);

function apiMiddleware(config: ResolvedConfig): Connect.NextHandleFunction {
  const env = loadEnv(config.mode, config.envDir, '');
  const listener = getRequestListener(createApp(createRuntimeDeps(env)).fetch);
  return (request, response, next) => {
    if (isApiPath(request.url ?? '')) {
      void listener(request, response);
      return;
    }
    next();
  };
}

function apiServer(): Plugin {
  return {
    name: 'api-server',
    configureServer(server) {
      server.middlewares.use(apiMiddleware(server.config));
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware(server.config));
    },
  };
}

function pageTitle(): Plugin {
  return {
    name: 'page-title',
    transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%APP_NAME%', APP_NAME) },
  };
}

export default defineConfig({
  plugins: [react(), pageTitle(), apiServer()],
  envPrefix: 'HAWA_PUBLIC_',
  server: { port: 5173, strictPort: true },
  preview: {
    port: 4173,
    strictPort: true,
    headers: Object.fromEntries(PAGE_HEADERS.map((header) => [header.key, header.value])),
  },
  build: { outDir: 'dist', sourcemap: false },
});
