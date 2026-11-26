// Vercel function entry. One function serves every /api route through the Hono app's fetch method.
import { createApp } from '../src/server/app.js';
import { createRuntimeDeps } from '../src/server/runtime.js';

/** The API app. Vercel calls its fetch method for each request rewritten to /api. */
export default createApp(createRuntimeDeps(process.env));
