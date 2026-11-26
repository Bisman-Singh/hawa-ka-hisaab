// Tests for the route registry.
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { registerHealth } from '../../../src/server/routes/health.js';
import { routeModules } from '../../../src/server/routes/index.js';
import { createTestDeps } from '../../support/test-deps.js';

describe('routeModules', () => {
  it('includes the health route', () => {
    expect(routeModules).toContain(registerHealth);
  });

  it('registers every route under /api', () => {
    for (const register of routeModules) {
      const app = new Hono();
      register({ app, deps: createTestDeps().deps });
      expect(app.routes.length).toBeGreaterThan(0);
      for (const route of app.routes) {
        expect(route.path).toMatch(/^\/api\//);
      }
    }
  });
});
