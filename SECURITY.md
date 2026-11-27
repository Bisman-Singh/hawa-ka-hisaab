# Security

Hawa Ka Hisaab has no accounts, no database and no payments. What it protects is the model key and the data key, the people who type about their household, the free tiers of its upstreams, and the page itself against anything an upstream or the model sends back. Each control below names where it is enforced and the test or command that checks it.

To report a problem, open an issue on https://github.com/Bisman-Singh/hawa-ka-hisaab with no secret or personal detail in it.

## Keys and configuration

**Keys come from the environment only.** `GEMINI_API_KEY` and `DATA_GOV_IN_API_KEY` are read and checked once at start in `src/config/env.ts`. `.env.example` ships with every value empty, and `.gitignore` keeps every other `.env` file out of git.

- A bad value stops startup naming the variable, never its value. Test: `test/config/env.test.ts`.
- `/api/health` says only whether each source is set up, never a key or its length. Test: `test/server/routes/health.test.ts`.

**The Gemini key goes only to the SDK, which sends it as a header.** `src/server/gemini.ts`. Test: `test/server/gemini.test.ts` checks the key is never in the URL or the body.

**The data.gov.in key goes only in the URL, as that API requires, and is never logged.** `src/features/air/data-gov.ts` and `src/server/air/data-gov.ts`.

- Upstream fetches never follow a redirect, so a query string cannot travel to another host, and nothing of a thrown fetch error is kept, since its message can quote the URL. `src/lib/http.ts`, tested in `test/lib/http.test.ts`.
- A refused call is reported without the key. Test: `test/server/air/data-gov.test.ts`.

**No key reaches the browser.** The model SDK and the server code are held out of the interface layer by `test/conventions/layers.test.ts`. Vite exposes only variables prefixed `HAWA_PUBLIC_`, set in `vite.config.ts`, and the source reads none.

**Secret scan.** Gitleaks scans the whole history on every push to main and every pull request, in `.github/workflows/secret-scan.yml`.

## Response headers

**A strict page policy.** `src/config/headers.ts` defines the page headers once.

- Content Security Policy: scripts, styles, fonts and connections from this origin only, no inline script or style, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, and Trusted Types required with no policy allowed, so an injection sink such as `innerHTML` refuses a plain string.
- Strict-Transport-Security for two years with subdomains, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a Permissions-Policy that turns off camera, microphone, payment and USB and allows location for this site only, and same-origin opener and resource policies.
- `vercel.json` sets the same headers on every path; `test/conventions/deploy.test.ts` checks the two agree. The preview server sets them from the same constant in `vite.config.ts`.
- Test: `test/config/headers.test.ts`. The end to end journeys record every policy violation under the real policy and fail on any, in `e2e/support/page.ts`.

**A deny-all policy on the API.** JSON responses load nothing, so the API policy is `default-src 'none'`. It is set after every handler, on errors too, in `src/server/middleware.ts`. Test: `test/server/middleware.test.ts`.

## Requests

**Same-site only.** Requests a browser marks as cross-site or same-site through `Sec-Fetch-Site` are refused with 403. POST bodies must be `application/json`, which also blocks the simple posts a cross-site form can send.

- Enforced in `src/server/middleware.ts` and `src/server/validate.ts`. Tests: `test/server/middleware.test.ts`, `test/server/validate.test.ts`, `test/server/app.test.ts`.

**Every input is checked by a schema before a handler sees it.** Request bodies are strict objects, so an unknown field is refused. Text is trimmed and capped: 2,000 characters for a description, 500 for a question, 80 for a place search. Coordinates must lie in a box around India and carry at most two decimals. A household holds at most 12 members, 30 activities and 10 rooms.

- Contracts in `src/features/*/contract.ts`, limits in `src/config/limits.ts`, mounting in `src/server/mount.ts`.
- Validation messages name the field and the rule, never the value sent, and an unexpected field name is not repeated. Test: `test/server/validate.test.ts`.

**A body limit of 64 KB**, whether or not the body declares its length. `src/server/middleware.ts`. Test: `test/server/middleware.test.ts`.

**Rate limits per client.** By default a client may make 60 requests a minute across all routes, then gets 429 with `Retry-After`. Model calls have their own limit of 6 a minute per client by default; over it a route still answers, on the rules path. Each instance makes at most 200 model calls a day by default.

- The client key is `x-real-ip`, which Vercel sets and overwrites, or the connection address on the local servers. IPv6 is grouped by its /64 network. `src/server/mount.ts` and `src/lib/rate-limit.ts`.
- The limiter tracks at most 10,000 clients and never forgives a blocked client when a flood of new keys fills it. Test: `test/lib/rate-limit.test.ts`.
- The counts live in each instance's memory, so with several instances running the limits apply per instance.

**Upstream call budgets.** Each upstream has a budget per client and per instance, by the minute and by the day, so one client cannot use up a free tier for everyone. Values are in `UPSTREAM_BUDGET` in `src/config/limits.ts`, applied in `src/server/air/budget.ts`. Test: `test/server/air/budget.test.ts`.

## Answers and logs

**Errors name a code, never internals.** Every failure is one of eight codes with a plain message and no stack trace. A thrown value that is not an Error is caught too. Only the error's name is logged.

- `src/server/errors.ts`, `src/server/app.ts`, `src/server/middleware.ts`. Tests: `test/server/errors.test.ts`, `test/server/app.test.ts`.

**Logs carry codes, never what was typed.** A log line has an event and a closed set of fields. Any string that does not look like a short code is written as `[redacted]`. The request log records the route pattern, never the path.

- `src/lib/logger.ts`, `src/server/air/read-log.ts`. Tests: `test/lib/logger.test.ts`, `test/server/middleware.test.ts`, `test/server/air/read-log.test.ts`.

## Upstream data

**Bounded, timed and checked.** Each upstream call has a time limit and a size bound. The CPCB feed is refused over 2 MB or when it declares a DOCTYPE or an entity, so no entity is ever expanded. Every answer is checked by a schema, and a station that fails its check is skipped without sinking the rest.

- `src/lib/http.ts`, `src/features/air/cpcb-feed.ts`. Tests: `test/lib/http.test.ts`, `test/features/air/cpcb-feed.test.ts`.

**Upstream names are cleaned.** Station names lose control, format and bidi characters before anything shows them or sends them to the model, in `src/lib/clean-text.ts`. Test: `test/lib/clean-text.test.ts`.

## The model

**Prompt injection.** User text is data, never instructions.

- Fixed instructions go in the system text. Facts and data go in blocks opened and closed by a random marker made for each request, and the system text says anything inside them is material to read, even when it claims to come from the developer. `src/server/gemini-turns.ts`. Test: `test/server/gemini.test.ts`.
- The model may call only the declared calculators, with arguments checked by their schemas. They take ids from the household and modes from a closed list, never a free number, and run with no more reach than the household sent. At most 2 tool rounds of up to 5 calls each. `src/features/assistant/tools.ts`, `src/server/gemini-request.ts`. Test: `test/server/gemini-tools.test.ts`.
- `test/features/assistant/injection.test.ts` plays a compromised model that obeys every injection, and checks nothing unsafe passes.

**Output is untrusted.** Every reply must pass the schema, number, text and quote guards and the task's own checks before use, in `src/features/assistant/attempt.ts`. Model text is shown as plain text through React, never as HTML: `react/no-danger` and the ban on `innerHTML` in `eslint.config.js`, and Trusted Types in the page policy. The Gemini safety settings block harassment, hate, sexual and dangerous content at medium and above, in `src/server/gemini-request.ts`.

**Refusals by reason.** A refused reply is never kept or shown. The trace names the check that refused it, one of the reasons in `guardCheckSchema` in `src/lib/schemas/trace.ts`, such as markup, a link, a third script, numbers not supplied, a misquote, a medicine or a guessed measure, and lists the numbers that matched nothing. The page shows the reason in words. Test: `test/features/assistant/guarded.test.ts`, and the regression set in `test/features/assistant/guard-bypass.test.ts`.

**Medical questions never reach the model.** A rule based gate in English, Hindi and romanised Hindi answers them with a fixed reply. `src/features/assistant/medical-gate.ts`. Test: `test/features/assistant/medical-gate.test.ts`.

## Personal data

- The server keeps nothing on disk or in a database. The household, the place and the model choice live in the browser's local storage and can be cleared from the Privacy page. `src/ui/storage.ts`, `src/ui/legal/ClearHousehold.tsx`. Tests: `test/ui/storage.test.ts`, `test/ui/legal/ClearHousehold.test.tsx`.
- A point is rounded to two decimals, about a kilometre, before any provider sees it or it enters a URL. `src/features/air/service.ts`. Test: `test/features/air/service.test.ts`.
- The page asks before anything first goes to the model, and with the model kept off nothing about the household is sent. `src/ui/consent/ModelChoice.tsx`. Test: `test/ui/consent/ModelChoice.test.tsx`.
- The Privacy page states what Google's free tier terms allow with what is sent, from `src/ui/legal/words.json`.

## Supply chain

- Six runtime dependencies, every version pinned exactly, the lockfile committed and installed with `npm ci`. `test/conventions/dependencies.test.ts`.
- CI runs `npm audit --audit-level=low` before the gate, in `.github/workflows/ci.yml`.
- Dependency review fails a pull request that adds a known vulnerability of low severity or above, in `.github/workflows/dependency-review.yml`.
- CodeQL analyses the code on every push to main, every pull request and once a week, in `.github/workflows/codeql.yml`.
- Dependabot proposes npm and Actions updates weekly, in `.github/dependabot.yml`.
- Every Action is pinned to a commit and every checkout keeps no credentials. Workflows may only read the repository contents; the CodeQL job may also read Actions metadata and write its security findings.
