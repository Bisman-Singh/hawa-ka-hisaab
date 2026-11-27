# Code quality

Each rule below says where it is enforced and which check proves it. `npm run gate` runs every check: Prettier, ESLint, three TypeScript projects, the tests with coverage, the build and the bundle budget. The convention tests under `test/conventions/` read the repository itself, so a rule that drifts fails the suite.

## Types

**Strict TypeScript with the extra flags.** `tsconfig.base.json` turns on `strict` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noPropertyAccessFromIndexSignature` and `verbatimModuleSyntax`, among others.

- Enforced in `tsconfig.base.json`, extended by `tsconfig.app.json` for the browser, `tsconfig.server.json` for the server and `tsconfig.tooling.json` for tests, end to end specs and scripts.
- Check: `npm run typecheck` compiles all three projects.

**No type assertions and no `any`.** Values from outside the program, such as request bodies, upstream answers, model replies and JSON content, are narrowed by zod schemas, never cast.

- Enforced in `eslint.config.js`: `no-restricted-syntax` refuses `as` and angle bracket assertions, `@typescript-eslint/consistent-type-assertions` is set to never, and the typescript-eslint strict and stylistic type-checked sets refuse `any` and unsafe use of untyped values.
- `linterOptions.noInlineConfig` is on, so a disable comment in a file has no effect, and unused disable directives are errors.
- Check: `npm run lint`, which fails on any warning.

**Exhaustive and explicit.** Switches over unions must cover every member, exported functions declare their return types, and type-only imports are marked.

- Enforced in `eslint.config.js` by `switch-exhaustiveness-check`, `explicit-module-boundary-types` and `consistent-type-imports`.
- Check: `npm run lint`.

## Size and shape

**Small functions and files.** Cyclomatic complexity at most 8, nesting at most 3, at most 3 parameters, at most 120 code lines a file and 30 a function, 50 for a component in a `.tsx` file. Blank lines and comments do not count. Test files are exempt from the line limits only.

- Enforced in `eslint.config.js`.
- Check: `npm run lint`.

**Byte caps and a line budget.** A hand-written source file is at most 12,000 bytes and any other file at most 64,000, the lockfile excepted. TypeScript source outside tests and the fact tables has a budget of 15,030 code lines and the stylesheets one of 2,600.

- Enforced in `test/conventions/size.test.ts`.
- Measured in this tree: 15,023 TypeScript code lines across 287 files, and 2,210 CSS code lines.

## Layers

**Dependencies point one way.** `config` and `lib` sit at the bottom. `features` is pure domain code and imports neither the server nor the interface. `ui` never imports the server. `api` imports only the server.

- Packages are held to their layer as well: `@google/genai` and Hono only in the server, React only in the interface, `fast-xml-parser` only in features and the server. So no server or model SDK can reach the browser bundle.
- Enforced in `test/conventions/layers.test.ts`, which parses every import, static and dynamic.

**Ports and fakes.** The Hono app is built by `createApp` in `src/server/app.ts` from a `ServerDeps` object, defined in `src/server/deps.ts`: clock, logger, two rate limiters, air sources and the model port. The runtime builds real ones in `src/server/runtime.ts`. Tests pass fakes from `test/support/`.

## One shape, one source

**Route contracts.** Each route is one object naming its method, path, input schema and response schema, built with `src/lib/contract.ts`.

- The server checks input before the handler and its own response before sending it, in `src/server/mount.ts`. A response that breaks its contract becomes a logged 500, tested in `test/server/mount.test.ts`.
- The browser client checks input before sending and responses before use with the same schemas, in `src/ui/api-client.ts`, tested in `test/ui/api-client.test.ts`.

**Types from schemas.** Shapes are declared once as zod schemas and the types are inferred from them, in `src/lib/types.ts` and each feature's types file, such as `src/features/air/types.ts`.

**Expected failures are values.** `src/lib/result.ts` carries success or failure. Upstream fetches in `src/lib/http.ts` return failures as data and never throw. A failing source becomes a state of the answer, such as a stale reading or a labelled fallback, not an error page.

**One display name.** The product name lives in `src/config/app.ts`. `test/config/app.test.ts` checks it appears literally in no other source file and that the build fills it into the page title.

**One facts registry.** Code cites facts only through `src/config/facts/index.ts`. `test/config/facts/index.test.ts` checks ids are unique, sources are https links and ranges are well formed.

## Content as data

**Wording lives in JSON, not in code.** Interface text, plan templates, the community notice, the fixed medical replies and the model instructions are JSON files next to the code that uses them, such as `src/features/planner/words/en.json` and `src/features/planner/words/hi.json`.

- `test/conventions/content.test.ts` checks every sentence is plain text with whole placeholders, and that wherever English and Hindi sit side by side they have the same shape and fill the same placeholders.

## Comments and documents

**A role comment on every file.** Each source file opens with one or two comment lines saying what it is for.

- Enforced in `test/conventions/role-comment.test.ts`.

**A doc comment on every export.** Every export in source, scripts and test support carries a `/** */` comment.

- Enforced in `test/conventions/doc-comment.test.ts`.

**No work markers and plain text.** Comments say what code is for. Work markers are refused by the `no-warning-comments` lint rule. Every text file is also scanned for work markers, em dashes and machine-local paths.

- Enforced in `eslint.config.js` and `test/conventions/public-text.test.ts`.

**Documents point at real files.** Every repository path cited in a markdown file must exist.

- Enforced in `test/conventions/markdown-paths.test.ts`.

## Tests mirror the source

Every source file with runtime code has a test at the same path under `test/`, such as `src/lib/cache.ts` and `test/lib/cache.test.ts`. Type-only files are exempt.

- Enforced in `test/conventions/mirror.test.ts`.

## Style

- **Formatting.** Prettier with `.prettierrc.json`. Check: `npm run format:check`.
- **Plain JavaScript hygiene.** `eqeqeq`, `curly`, `no-param-reassign`, and `no-console` outside the logger and scripts, in `eslint.config.js`.
- **React.** The hooks rules, the jsx-a11y strict set and `react/no-danger` run on every `.tsx` file. Writing to `innerHTML`, `outerHTML` or `insertAdjacentHTML` is refused anywhere.
- **Visual rules.** `test/conventions/visual-rules.test.ts` keeps gradients, shadows, blur, forced capitals and transitions out of the stylesheets, allows one stepped skeleton pulse only when motion is welcome, and keeps em dashes, middle dots, arrow glyphs, emoji and inline style attributes out of interface text.

## Dependencies

Six runtime packages: React, React DOM, Hono, zod, `@google/genai` and `fast-xml-parser`. Development packages are on a fixed list as well. Every version is pinned exactly, and `.npmrc` saves new ones exactly.

- Enforced in `test/conventions/dependencies.test.ts`, which also checks the Node versions in `package.json`.
- Updates arrive weekly through `.github/dependabot.yml`.

## Running the checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run gate
```

CI runs `npm audit --audit-level=low` and `npm run gate` on Node 22, 24 and 26 for every push to main and every pull request, in `.github/workflows/ci.yml`. Test counts and coverage are in [TESTING.md](TESTING.md).
