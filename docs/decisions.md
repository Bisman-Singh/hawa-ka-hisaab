# Engineering decisions

Short records of the choices that shape the code. Each gives the context, the decision and what follows from it, with the files where it lives.

## 1. Code computes, the model words

- **Context.** A family acts on the numbers in its plan. A language model can write a plausible number that no source backs.
- **Decision.** Code builds every candidate step and every figure before any model call, in `src/features/planner/candidates.ts` and `src/features/ledger/`. The model chooses among the candidates and writes the words. `src/features/planner/from-wording.ts` takes every number, time and effect from the candidate, never from the reply.
- **Consequence.** The model can make a plan read better but cannot change what it says about the air or the effects. The number guard in `src/features/assistant/number-guard.ts` refuses model text that states any number code did not send.

## 2. One facts registry

- **Context.** Factors, quotes and bands come from many documents, and a number shown without a source cannot be checked.
- **Decision.** Every sourced fact lives once in `src/config/facts/`, with an id, a title, a value or a quoted passage, and a source with a link and the date it was retrieved. Code cites facts only through `src/config/facts/index.ts`.
- **Consequence.** The working sheet, the data page and the facts sent to the model all read from the same entries. A figure with no verified source, such as a metro CO2 factor or a household dose, has no entry, so it cannot be shown.

## 3. A provider chain for station data

- **Context.** The CPCB CAAQMS feed answers from some networks and times out at connect from hosted servers. The same CPCB data is published on data.gov.in, which needs a key.
- **Decision.** Station records come through one `AirProvider` port, first fresh copy wins: the direct feed with a 3 second limit, then data.gov.in when `DATA_GOV_IN_API_KEY` is set, then the modelled path. `src/server/air/chain.ts`, `src/server/air/cpcb.ts`, `src/server/air/data-gov.ts`. `CPCB_DIRECT_FEED=off` skips the direct feed where it never answers.
- **Consequence.** On a network the feed accepts the server reads it directly, and elsewhere it reads data.gov.in, with the same station records either way. Every reading says which copy served it.

## 4. The AQI from averages on the data.gov.in path

- **Context.** data.gov.in gives each pollutant's minimum, maximum and average sub-index but no AQI.
- **Decision.** Apply CPCB's rule in `aqiByCpcbRule` in `src/features/air/data-gov.ts`: the highest average sub-index, from at least three pollutants including PM2.5 or PM10, else null. Use a station only when all seven pollutant rows of one hour are there.
- **Consequence.** On the saved CPCB feed of 24 Nov 2026 the rule gives the published AQI at 546 of 546 stations that have one, pinned in `test/features/air/data-gov.test.ts`. A station caught mid rebuild with a row missing is skipped rather than shown with an AQI that could be too low.

## 5. CPCB's AQI as published on the feed path

- **Context.** People trust the official number, and a recomputed index can disagree with it.
- **Decision.** On the feed path the card shows CPCB's AQI and predominant pollutant as published, in `src/features/air/stations.ts`. A blank AQI is said in words. Each pollutant shows its hourly sub-index, labelled as not the AQI.
- **Consequence.** The app never works out an AQI for a station on that path. `test/features/air/reading.test.ts` checks the published value passes through even when the sub-indices say otherwise.

## 6. A labelled model estimate where no station is near

- **Context.** Many places in India have no station within reach, and people there still need a plan.
- **Decision.** With no station reading within 50 km, `src/features/naqi/estimate.ts` computes an index from the CAMS global model through Open-Meteo, from trailing means read against the NAQI table. The card calls it a modelled estimate, not a measurement, that tends to read low in cities.
- **Consequence.** Every place in India gets an answer, and the words never call the estimate live or measured; `test/features/air/reading.test.ts` checks that.

## 7. The forecast compares hours, it does not replace the reading

- **Context.** The model forecast reads low in cities, but its shape across a day still shows which hours are cleaner.
- **Decision.** Plans use the hourly forecast only to pick cleaner hours and to size the relative change of a move. The facts sent to the model never hold a forecast concentration.
- **Consequence.** A move is offered only when the forecast has an hour cleaner by enough, and its reason says the hours come from a model forecast. `test/features/planner/claims.test.ts` checks no forecast concentration reaches the model.

## 8. A PIN table of our own, on the server

- **Context.** Open-Meteo's place search returns nothing for six digit PIN codes, and people know their PIN.
- **Decision.** Ship a PIN table built from GeoNames postal codes as server data in `src/server/data/pin/`, resolved exact PIN first, then a four digit prefix shared by at least 3 PINs, then three digits, in `src/features/air/pin.ts`.
- **Consequence.** A PIN gives a place with its district and state, and a prefix answer says how rough it is. The table never enters the browser bundle, and a PIN centre is used only to find the nearest station.

## 9. Free-tier models in order, with hard limits

- **Context.** The model key is on Gemini's free tier, whose quota can run out while people use the app.
- **Decision.** Try three models in order, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` and `gemini-3.6-flash`, moving on after a quota error, overload, missing model, server error or timeout, and rest a model for a minute after a quota error. Cap each request at 3 model HTTP calls, each client at 6 calls a minute and each instance at 200 calls a day by default. Reuse a checked reply to an identical request for five minutes. `src/server/model-config.ts`, `src/server/gemini.ts`, `src/features/assistant/call-budget.ts`, `src/features/assistant/reply-cache.ts`.
- **Consequence.** A spent quota costs at most one call a minute per model, and one person cannot use the day's calls for everyone. `src/server/model-config.ts` records the default order as chosen from measured latency and success; `scripts/measure-models.ts` is the script that measures them and is never part of the gate.

## 10. The rules path is part of the product

- **Context.** With no key, over quota, out of time or after a refused reply, there is no model wording.
- **Decision.** `src/features/planner/rules-plan.ts` picks the same candidates by rule and words them with templates in English and Hindi. The notice has its own rules wording. Both are labelled with the reason. With the model kept off for a browser, `src/ui/plan/local.ts` and `src/ui/community/local.ts` run the same pure functions in the browser.
- **Consequence.** Without the model, a plan and a notice are still served, never an error page. Because the features layer is pure, the browser and the server compute the same plan.

## 11. Guards in code, and refused text is never kept

- **Context.** Model output is untrusted, and a refused reply shown anywhere could pass for advice.
- **Decision.** Every reply passes the schema, number, text and quote guards and the task's own checks, in `src/features/assistant/attempt.ts`. A refused reply is retried once with a fixed note, then the rules path answers. The trace keeps only the check that refused it and the numbers that matched nothing.
- **Consequence.** The "How this was made" sheet can say why a reply was refused without showing it. `test/features/assistant/guarded.test.ts` checks a refused reply's text never reaches the trace.

## 12. Medical questions never reach the model

- **Context.** A question about symptoms or medicines deserves a doctor, not a generated answer.
- **Decision.** A rule based gate in English, Hindi and romanised Hindi, in `src/features/assistant/medical-gate.ts`, runs before any limit is taken or model asked, and answers with a fixed reply from `src/features/assistant/replies.json`.
- **Consequence.** These questions cost no model call and get the same fixed reply each time, with the health ministry advice for the band or, for an emergency, the number 112.

## 13. No database and no accounts

- **Context.** A smog plan needs no login, and stored households would be personal data to protect.
- **Decision.** The client sends the household with every request and the server keeps nothing on disk. The household, the place and the model choice live in the browser's local storage, in `src/ui/storage.ts`.
- **Consequence.** No household is stored on the server. The only thing it keeps between requests is a checked model reply, in memory for five minutes. Caches and rate limits live in each instance's memory, behind the interfaces in `src/lib/rate-limit.ts` and `src/lib/cache.ts`, which a shared store could implement later.

## 14. Coordinates rounded to about a kilometre

- **Context.** An exact home location should not reach request logs, a shared cache or a provider.
- **Decision.** Points are rounded to two decimals before any provider sees them, in `src/features/air/service.ts`, and the air route refuses finer coordinates, in `src/features/air/contract.ts`.
- **Consequence.** Nearby callers share cached answers, and the forecast is asked once per model grid cell, in `src/server/air/open-meteo.ts`.

## 15. One contract per route, checked on both sides

- **Context.** The server and the browser must agree on every shape, and a server bug should never ship a malformed answer.
- **Decision.** Each route is one object with its method, path and zod schemas, built with `src/lib/contract.ts`. The server checks input and its own output in `src/server/mount.ts`; the browser checks responses in `src/ui/api-client.ts`.
- **Consequence.** A response that breaks its contract becomes a logged 500 rather than a page fed bad data. Types are inferred from the same schemas.

## 16. Hono on one Vercel function

- **Context.** Seven small routes share middleware, limits and caches, and the same API must run locally.
- **Decision.** One Hono app built by `src/server/app.ts` from its dependencies, served by `api/index.ts` in the Mumbai region, with every `/api/` path rewritten to it in `vercel.json`. `vite.config.ts` mounts the same app on the dev and preview servers.
- **Consequence.** Local development and the end to end tests run the exact API that deploys. The air caches are shared by every route of an instance.

## 17. Plain CSS and self-hosted type

- **Context.** The page must be small on a phone, work under a strict policy, and show Hindi well.
- **Decision.** Plain stylesheets under `src/ui/styles/` with tokens in `src/ui/styles/tokens.css`, no CSS framework, and the Anek type for Latin and Devanagari served from this origin.
- **Consequence.** The page policy allows styles and fonts from this origin only. `test/conventions/visual-rules.test.ts` and the CSS line budget in `test/conventions/size.test.ts` keep the stylesheets in check.

## 18. Effects as relative changes with a range

- **Context.** The registry has no verified source for a household dose in micrograms or a "PM added" figure.
- **Decision.** Exposure is a relative change with a range, from the air where you are, breathing rate and time, in `src/features/ledger/exposure.ts`. CO2 is kg for one traveller with the occupancy stated, in `src/features/ledger/co2.ts`. A missing distance, occupancy or factor gives no figure.
- **Consequence.** Every figure can be checked from its working. `test/features/planner/claims.test.ts` checks the numbers the app does not show never appear.

## 19. Strict limits enforced by the repository itself

- **Context.** Rules that live only in a document drift.
- **Decision.** ESLint limits on complexity, depth, parameters and lines, no type assertions, and convention tests under `test/conventions/` for layers, mirrored tests, comments, sizes, dependencies, deployment and public text.
- **Consequence.** `npm run gate` fails on a broken rule, so the rules hold for every file. [CODE_QUALITY.md](../CODE_QUALITY.md) lists them.

## 20. Bands told by hatching and words, not colour

- **Context.** Colour alone cannot carry a band in black and white print, with forced colours on, or for people who do not see the colours apart.
- **Decision.** A band is drawn as a hatched square whose density is the band, with the band's name always written beside it, in `src/ui/components/Band.tsx` and `src/ui/styles/bands.css`. CPCB's colour appears once, as a chip over today's cell.
- **Consequence.** No meaning rests on colour alone, and the hatching is held to 3 to 1 contrast by `test/a11y/contrast.test.ts`. [ACCESSIBILITY.md](../ACCESSIBILITY.md) lists this with the other controls.

## 21. Focus is never left on the page body

- **Context.** Many actions replace the button that was pressed, such as a retry, a model choice or a language switch, and the browser then drops focus to the start of the page.
- **Decision.** `useRescueFocus` and `useFocusLater` in `src/ui/hooks/focus.ts` move focus to the view's heading or the next useful control, and a busy button is marked with `aria-disabled` so it keeps focus.
- **Consequence.** A keyboard or screen reader user keeps a place in the view after the action, never back at the start of the page. `e2e/focus.spec.ts` checks where focus is after each such action.
