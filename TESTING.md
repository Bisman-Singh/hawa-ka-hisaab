# Testing

Every source file with runtime code has its own test file. On top of those, adversarial and claims tests try to break what the product says about its numbers, its guards and its fallbacks. The model and every upstream are fakes in the tests; the Gemini adapter runs the real SDK against a scripted fetch, so no test calls the live model.

## Where the numbers stand

Measured on this tree. `npm run gate` exited 0, and so did the Playwright run:

- **Unit, route, interface and convention tests:** 1,825 tests in 319 files, all passing.
- **Coverage over `src/`:** 100 percent of statements, branches, functions and lines, which is 4,547 statements, 2,902 branches, 1,703 functions and 4,189 lines.
- **End to end:** 56 tests in 7 files, 28 on a phone profile and 28 on a laptop profile, all passing.

## Commands

```sh
npm test                 # every Vitest test once
npm run test:coverage    # the same with coverage, which fails under 100 percent
npm run e2e              # Playwright journeys against the production build
npm run gate             # format, lint, typecheck, coverage, build and bundle budget
```

## Coverage is held at 100 percent

`vitest.config.ts` measures coverage over `src/**/*.{ts,tsx}` with the V8 provider and fails the run below 100 percent of lines, branches, functions or statements. The tree holds no coverage ignore comment, no `@ts-ignore`, no lint disable comment and no skipped or focused test; `git grep` for each finds nothing, and inline lint configuration is switched off in `eslint.config.js`. Mocks, stubbed globals and stubbed environment variables are restored after every test.

## Layers

| Folder              | What it tests                                                                 | Environment | Files |
| ------------------- | ----------------------------------------------------------------------------- | ----------- | ----- |
| `test/features/`    | Pure domain code: air, NAQI, household, ledger, planner, assistant, community | Node        | 110   |
| `test/lib/`         | Cache, upstream fetch, logger, rate limiter, schemas, contracts               | Node        | 17    |
| `test/config/`      | Environment, limits, headers, the facts registry                              | Node        | 21    |
| `test/server/`      | The Hono app, middleware, every route, the Gemini adapter, air providers      | Node        | 32    |
| `test/ui/`          | React views, components, hooks and the API client                             | jsdom       | 124   |
| `test/a11y/`        | axe-core on every shared component, colour contrast of the tokens             | jsdom       | 2     |
| `test/conventions/` | Rules read from the repository itself                                         | Node        | 11    |
| `test/scripts/`     | The bundle size measure                                                       | Node        | 1     |
| `test/api/`         | The Vercel function entry                                                     | Node        | 1     |
| `e2e/`              | Journeys with axe at each step, and focus, layout and target checks           | Chromium    | 7     |

`test/` mirrors `src/` file for file, enforced by `test/conventions/mirror.test.ts`. Route tests call the real Hono app built by `createApp` with fakes, so middleware, contracts and handlers run together.

## Fakes and fixtures

- `test/support/fake-clock.ts`: a clock that moves only when a test moves it, so caches, rate windows, deadlines and quota rests are tested exactly.
- `test/support/fake-gemini.ts`: a scripted fetch for the real `@google/genai` SDK. The adapter tests run the SDK itself and record every request it sends, so the key, the marked blocks, the schema and the tool settings are checked on the wire.
- `test/support/fake-model.ts` and `test/support/model-run.ts`: a scripted model port and a run with a fresh cache, for pipeline tests.
- `test/support/fake-fetch.ts`, `test/support/fake-air.ts`, `test/support/fake-air-sources.ts`, `test/support/fake-data-gov.ts` and `test/support/open-meteo-samples.ts`: upstream answers shaped like the live ones, including timeouts, oversized bodies, gateway errors and answers caught mid rebuild.
- `test/support/cpcb-snapshot.ts`: the saved CPCB feed of 24 Nov 2026, all 575 stations, under `test/support/fixtures/cpcb-snapshot/`.
- `test/support/route-fixtures.ts`: air at a chosen band in Delhi or Mumbai and a model that answers in one of six ways.
- `test/support/number-reader.ts`: a reader of the numbers in response text that does not use the app's own numeral finder, so the central claim is not checked by the code it checks.
- `test/support/capture-logger.ts` and `test/support/test-deps.ts`: a logger whose lines a test reads back, and server dependencies with generous limits.

## Known-answer tests

- **NAQI.** CPCB's worked example: PM2.5 of 31 µg/m³ gives sub-index 51 and 60 gives 100. Every printed breakpoint maps to its index edge. `test/features/naqi/table.test.ts`.
- **The modelled index.** 24 hours of PM2.5 at 31 give 51; 8 hour means for CO and ozone; 16 of 24 hours needed for a 24 hour mean. `test/features/naqi/estimate.test.ts`.
- **CPCB's AQI rule on data.gov.in.** Against the saved feed it gives the published AQI at 546 of 546 stations that have one and null at the 29 blank ones. `test/features/air/data-gov.test.ts`.
- **Travel CO2.** Both legs of a round trip, vehicle factors split among riders, per passenger factors not split, no figure without a distance, an occupancy or a cited factor. `test/features/ledger/co2.test.ts`.

## Adversarial sets

- **Number guard.** Invented numbers in digits, Devanagari digits, words, Roman numerals, fractions, joined digits and compounds are all caught; text that only repeats what was sent passes. `test/features/assistant/number-guard.test.ts`, `test/features/assistant/numerals.test.ts`.
- **Guard bypass regressions.** Ways to write a number, a link or a medical question that the guards once missed. Each case passed the guards before they were hardened and must now be caught. `test/features/assistant/guard-bypass.test.ts`.
- **Injection.** A fake model that obeys every injection in hostile household text, states numbers or markup in a plan, and misuses tools; nothing unsafe may pass. With no key every pipeline falls back and no network call is made. `test/features/assistant/injection.test.ts`.
- **Medical gate.** At least 60 phrases across English, Hindi and romanised Hindi, at least 15 of them Hindi and 12 romanised, each with the verdict it must get; planning questions about a child with asthma still reach the planner. `test/features/assistant/medical-gate.test.ts`.
- **Prose.** Markup, links, phone numbers, hidden characters and third scripts are refused; plain English and Hindi with their joiners pass. `test/features/assistant/text-guard.test.ts`.
- **Tool calls.** Undeclared tools, arguments that fail their schema, too many calls in a round and tool calls on the last round are refused. `test/server/gemini-tools.test.ts`.

## Claims tests

Sweeps over every sample and band that check what the product says about itself.

- `test/server/claims.test.ts`: each model route, for every sample household or community at three bands and a model that answers in six ways, gives a valid labelled body whose every number is in its trace.
- `test/features/planner/claims.test.ts`: two households in the same air get different plans with the differences named; a mild day carries no restriction; every number cites a fact that exists; the figures the app does not show never appear; a Hindi plan is Hindi in every worded field with the same items and effects as the English.
- `test/features/community/report-claims.test.ts`: no mass or emission figure, every number traced to an input or a fact, GRAP only in Delhi NCR, the same actions in Hindi, and each notice addressed to its own readers.

## Convention tests

`test/conventions/` checks the repository: the layer rule, a test for every source file, a role comment on every file and a doc comment on every export, file byte caps and the source line budget, the approved and pinned dependencies, the deployment config against the code, plain public text, the visual rules, content files, and that every path a markdown file cites exists. Details are in [CODE_QUALITY.md](CODE_QUALITY.md).

## End to end

`playwright.config.ts` builds the app and runs the journeys in `e2e/` against the production build on the preview server, on a Pixel 7 profile and a desktop Chrome profile. `e2e/support/api.ts` answers every `/api` request from the real app with a fixed clock, station records and a forecast from the test fixtures, and a scripted model from `e2e/support/model.ts`, whose replies the real guards check.

- `e2e/main-journey.spec.ts`: a PIN, the air card, a sample sentence read into the household, the plan for a very poor day, its working, a what-if, how it was made, a question answered with a calculator call and a medical question answered by the fixed reply without the model; then the same journey with the keyboard alone.
- `e2e/no-model.spec.ts`: the model over its quota, the form by hand and a rules plan in English then Hindi; the model kept off, with plans made in the browser and nothing sent; a wording the number check refuses, where the sheet names the check and never shows the text.
- `e2e/community.spec.ts`: a housing society's facts, actions and notice in English and Hindi with copy, and two households compared in the same air.
- `e2e/first-visit.spec.ts`: no paint before the stylesheet and the type, a title for every view, back and reload, deep links, the privacy page with clearing, and the page policy in force.
- `e2e/focus.spec.ts`: where focus is after each action that replaces the control that was pressed, that a refused question, a blank place and a community form error are heard, and that the severe-day warning follows the heading.
- `e2e/screens.spec.ts`: a disclosure named by its words, the band table's headers on a phone, no sideways panning of the plan at 360 px with wide text spacing, and the sheet's focus ring inside its edge.
- `e2e/targets.spec.ts`: every control on eight screens at 360 px wide is at least 44 by 44 CSS pixels, links inside sentences aside.

The shared steps, a place by PIN, a household saved by hand and a plan with the model on, are in `e2e/support/flow.ts`. At every step of the first four journeys `e2e/support/page.ts` runs axe on the whole page against the WCAG 2.2 A and AA tags and fails on any violation, console error, page error or policy violation. CI runs the journeys after the gate passes, in `.github/workflows/ci.yml`, and keeps the traces of a failed run for seven days.

Playwright needs Chromium once: `npx playwright install chromium`.

## Limits of this evidence

- Unit and route tests run on fixtures and fakes shaped from live answers of 24 to 27 Nov 2026. A later change in an upstream's shape would show in the schemas at run time, not in these tests.
- The end to end journeys use fixed station values and a scripted model, so they prove the flows and the guards, not today's air or the live model's wording.
- Two scripts make live calls and are kept out of the gate: `scripts/air-smoke.ts` for the air routes against the real feeds, and `scripts/measure-models.ts` for real Gemini models through the app's own adapter.
- Accessibility is checked by axe, the contrast test, the focus, layout and target checks and the keyboard journey. No screen reader or real-device session is recorded in this repository; [ACCESSIBILITY.md](ACCESSIBILITY.md) lists what each check covers.
