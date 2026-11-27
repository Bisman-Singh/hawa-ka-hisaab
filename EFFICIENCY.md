# Efficiency

The app runs on free tiers: Gemini's free API tier, Open-Meteo's free tier and the data.gov.in API, on one Vercel function. So efficiency here means asking upstreams as rarely as the data allows, never letting one person spend a shared quota, answering fast when a source is slow, and keeping the page small on a phone. Each control names where it lives and the test or command that checks it.

## Upstream reads

**The CPCB feed is fetched at most once an hour.** While it answers, one copy serves every request for an hour, and concurrent reads share a single load. After a failure the last good copy is served, and a direct fetch that failed waits 30 minutes before it is tried again, so a host the feed does not answer rarely pays the 3 second limit.

- `src/server/air/cpcb.ts` on the cache in `src/lib/cache.ts`. Tests: `test/server/air/cpcb.test.ts`, `test/lib/cache.test.ts`.
- `CPCB_DIRECT_FEED=off` skips the feed altogether on hosts it does not answer, so a cold start never waits for it.

**data.gov.in is read by state, and only for the states near the point.** The bundled index in `src/server/data/stations.json` names the states of the four stations nearest a point, and only those states are asked for. Each state's copy is kept for an hour when whole and recent, ten minutes when it is an hour behind and the next hour is due, and twenty seconds when it came mid rebuild. One call has 5 seconds, and a second attempt is made inside the request only when a short pause may fix the first and time is left.

- `src/server/air/data-gov.ts`, `src/features/air/state-copy.ts`, `src/features/air/failures.ts`. Test: `test/server/air/data-gov.test.ts`.

**One forecast call serves a whole model grid cell.** A point is moved to the nearest node of the 0.4 degree CAMS grid, the node Open-Meteo answers from, so every point in a cell shares one call. A cell's curve is reused for an hour, and the last good curve is served for up to twelve hours while Open-Meteo refuses. Place searches are cached for a day by their plain text, however they are spaced or capitalised.

- `src/server/air/open-meteo.ts`. Test: `test/server/air/open-meteo.test.ts`.

**The air card's three reads run side by side.** The station read, the forecast and the GRAP check start together in `src/features/air/service.ts`.

**The PIN table is loaded once, on first use, on the server only.** `src/server/air/pin-data.ts`. Test: `test/server/air/pin-data.test.ts`.

## Call budgets

**Per client and per instance, by the minute and by the day.** The app's budget for Open-Meteo is 20 calls a minute per client, and 120 a minute and 8,000 a day per instance. For data.gov.in it is 16 a minute per client, and 30 a minute and 20,000 a day per instance. A client over its own minute is refused before it counts against the instance, and a call over budget is not made at all.

- Values in `UPSTREAM_BUDGET` in `src/config/limits.ts`, applied in `src/server/air/budget.ts`. Tests: `test/server/air/budget.test.ts`, and the over-budget cases in `test/server/air/open-meteo.test.ts` and `test/server/air/data-gov.test.ts`.

**Model calls are bounded per request, per client and per instance.**

- One request makes at most 3 model HTTP calls, tool rounds, the one retry and fallback models included. `src/features/assistant/call-budget.ts`. Test: `test/server/gemini-budget.test.ts`.
- The model may ask for at most 2 rounds of tool calls of up to 5 calls each, and the round that spends the last call may not call tools, so it must answer. `src/server/gemini-request.ts`, `src/server/gemini-limits.ts`.
- A model that answered with a quota error rests for a minute, so a spent quota costs one call a minute per model. Test: `test/server/gemini-budget.test.ts`.
- By default 6 model calls a minute per client and 200 a day per instance, from `MODEL_RATE_LIMIT_PER_MINUTE` and `MODEL_DAILY_CALL_CAP` in `src/config/env.ts`.

**Calls that are never made.** A medical question gets its fixed reply without a call. With no key, a daily cap of 0, too little time left, or a client over its limit, the route answers on the rules path without a call. With the model kept off in the browser, plans and notices are computed in the browser and nothing is sent. Tests: `test/features/assistant/guarded.test.ts`, `test/features/assistant/ask.test.ts`.

## Time limits

- One upstream call has 8 seconds by default, the direct CPCB feed 3 and data.gov.in 5. `src/config/limits.ts`, `src/server/air/cpcb.ts`, `src/server/air/data-gov.ts`.
- One generate call has 15 seconds, every tool round and fallback model included, and one model's turn 9 seconds, so a model that hangs leaves the rest to the next. `src/server/model-config.ts`. Test: `test/server/gemini-deadline.test.ts`.
- A model route has 20 seconds from request to answer, inside the host's 30 second limit in `vercel.json`. No model call starts with under 3 seconds left, and the retry is skipped with under 5. `src/config/limits.ts`. Tests: `test/config/limits.test.ts`, `test/features/assistant/guarded.test.ts`.
- Every model call asks for low thinking and at most 4096 output tokens. `src/server/gemini-request.ts`.

## Reuse of answers

**Checked model replies are reused for five minutes.** An identical request answered in the last five minutes is served from memory with no call and no unit of the client's limit, and identical requests in flight together share one call. Fallbacks are never cached, so they are tried again. At most 200 replies are held per route.

- `src/features/assistant/reply-cache.ts`, `src/features/assistant/guarded.ts`, `src/server/model-route.ts`. Test: `test/features/assistant/guarded.test.ts`.

**Small model requests.** The model gets the candidates of at most 12 activities, the household in words rather than its working, and at most 500 facts, so a request stays small however large the household is. `src/features/planner/worded.ts`, `src/features/assistant/plan-view.ts`, `src/features/planner/fact-set.ts`.

**HTTP caching.** Place answers may be kept by the browser and the CDN for a day, and air answers for five minutes, through `max-age` and `s-maxage`. An air answer built while a source failed is never kept, so a retry reaches the server. POST answers and errors are `no-store`. Hashed assets are cached for a year as immutable.

- `src/server/mount.ts`, `src/server/routes/air.ts`, the contracts in `src/features/air/contract.ts`, and `vercel.json`. Tests: `test/server/mount.test.ts`, `test/server/routes/air.test.ts`, `test/conventions/deploy.test.ts`.

**Nearby callers share cached answers.** Coordinates are rounded to two decimals, about a kilometre, before they go into a URL. `src/features/air/contract.ts`.

All of these caches and counters live in each server instance's memory. A new instance starts with none, and with several instances running each keeps its own.

## The page

**A bundle budget the gate enforces.** `scripts/bundle-budget.ts` measures the build gzipped and fails over budget: 120 kB for the JavaScript the page loads first, 40 kB for any lazy chunk and 12 kB for CSS. The budget is in `scripts/bundle-size.ts`, tested in `test/scripts/bundle-size.test.ts`.

Measured with `npm run build` and `npm run budget` on this tree, in kB of 1,024 bytes, gzipped:

| Part                    | Size     | Budget |
| ----------------------- | -------- | ------ |
| JavaScript loaded first | 110.3 kB | 120 kB |
| Largest lazy chunk      | 29.4 kB  | 40 kB  |
| CSS                     | 7.6 kB   | 12 kB  |
| Lazy chunks             | 24       |        |

**Views load on demand.** The first screen comes with the page. Every other view, the household, plan, indoor, compare, community, privacy and data pages, loads when it is opened, and so does the air card. `src/ui/views.ts`, `src/ui/place/AirCardSlot.tsx`.

**Server data stays on the server.** The PIN tables and the station index are server files under `src/server/data/` and never enter the browser bundle; the layer rule in `test/conventions/layers.test.ts` keeps server code out of the interface.

**No third-party requests from the page.** The type is self-hosted and the page policy allows fonts, scripts, styles and connections from this origin only, in `src/config/headers.ts`. There is no analytics script.

**Plain CSS.** Styles are plain stylesheets under `src/ui/styles/`, with no CSS framework, held to a line budget by `test/conventions/size.test.ts`.

## Placement

The API function runs in the Mumbai region, `bom1` in `vercel.json`, in India with the people who use it.

## Checking it

```sh
npm run build
npm run budget
npm run test:coverage
```
