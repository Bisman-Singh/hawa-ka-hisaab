// Test runner config: browser views run in jsdom, everything else in node, with full coverage required over src.
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

const domTests = ['test/ui/**/*.test.{ts,tsx}', 'test/a11y/**/*.test.tsx'];

export default defineConfig({
  plugins: [react()],
  envPrefix: 'HAWA_PUBLIC_',
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text'],
      reportsDirectory: 'coverage',
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: domTests,
          setupFiles: ['./test/support/setup-dom.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, ...domTests],
        },
      },
    ],
  },
});
