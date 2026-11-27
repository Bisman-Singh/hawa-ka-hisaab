# Hawa Ka Hisaab

Hawa Ka Hisaab, "the account of the air", helps families, housing societies and schools in Indian cities get through smog days. It reads the official CPCB air reading for your place, or a labelled model estimate where no station is near, takes a plain description of who is at home and how the day goes, and returns a morning, afternoon and evening plan with low-emission routines, indoor air steps and cleaner alternatives. Every figure in the plan is worked out in code from a published factor and shows its working and source one tap away. Gemini reads the description and words the plan. It never supplies a number of its own.

Live app: https://hawa-ka-hisaab.vercel.app

Code: https://github.com/Bisman-Singh/hawa-ka-hisaab

Built for the PromptWars virtual hackathon, Challenge 6.

## Chosen Vertical

Urban Air Quality Assistant. The problem statement, as given:

> "Urban Air Quality Assistant: Create a GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution. The application should suggest low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to their location and lifestyle, while clearly explaining the direct impact of their choices."

Each clause, what the product does for it, the main source file and the test that checks it. [PROBLEM_ALIGNMENT.md](PROBLEM_ALIGNMENT.md) walks through the same clauses with the user journey.

| Clause                                          | What the product does                                                                                                                                                                             | Main source                                | Test                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| GenAI-powered assistant                         | Gemini reads the description into a household, chooses and words the plan, answers questions by calling calculators, and rewords the community notice, each under code checks.                    | `src/features/assistant/guarded.ts`        | `test/server/claims.test.ts`                     |
| Families                                        | A household is members by age group and condition, the day's activities and the home. Steps name each person by age and condition, and people the advisory counts as vulnerable are worded first. | `src/features/household/schemas.ts`        | `test/features/planner/claims.test.ts`           |
| Communities                                     | A society or school enters its homes or pupils, generator, waste burning, gate idling and outdoor periods, and gets computed facts, ranked actions and a notice in English and Hindi.             | `src/features/community/report.ts`         | `test/features/community/report-claims.test.ts`  |
| Severe winter smog and urban air pollution      | The air card shows CPCB's AQI and band, the plan follows the health ministry advice for the band, and Delhi NCR places get the GRAP stage of the dated order.                                     | `src/features/air/reading.ts`              | `test/features/air/reading.test.ts`              |
| Low-emission daily routines                     | Each activity is kept, moved to cleaner forecast hours, taken indoors or protected, and trips get a lower-emission swap with its CO2 change.                                                      | `src/features/planner/activity-actions.ts` | `test/features/planner/activity-actions.test.ts` |
| Indoor air quality hacks                        | When to air the rooms, the purifier size each room needs by EPA sizing, steps for the smoke sources the household listed, wet mopping, masks and corrections of common beliefs.                   | `src/features/planner/indoor.ts`           | `test/features/planner/indoor.test.ts`           |
| Sustainable alternatives                        | "Instead of X, do Y" pairs tied to the household's own trips, errands, cooking fuel and mosquito coil. Only pairs with a cited factor carry a number.                                             | `src/features/planner/alternatives.ts`     | `test/features/planner/alternatives.test.ts`     |
| Tailored to location                            | Town, city or PIN search in India, the nearest CPCB station within 50 km, the model forecast for that point, and GRAP only inside Delhi NCR.                                                      | `src/features/air/stations.ts`             | `test/features/air/stations.test.ts`             |
| Tailored to lifestyle                           | Activities carry who, when, how long, setting, travel mode, distance and whether the time can move. Two households in the same air get different plans and the differences are named.             | `src/features/planner/candidates.ts`       | `test/features/planner/claims.test.ts`           |
| Clearly explaining the direct impact of choices | Each step shows the change in what is breathed in as a range, CO2 in kg with the occupancy it assumes, and the working: inputs, formula, factors and sources. What-if toggles recompute it.       | `src/features/ledger/exposure.ts`          | `test/features/planner/what-if.test.ts`          |

## Approach and Logic

The app splits the work between code and the model on purpose. Code holds every fact and does every sum. The model reads free text and writes words.

1. **Facts first.** Every number the app can show traces to one entry in the facts registry under `src/config/facts/`, with a title and a public source link. The registry holds the health ministry advisory by band, the NAQI breakpoint table, travel CO2 factors from the India GHG Program, commute exposure ratios and ventilation rates from a Delhi study, EPA breathing rates and purifier sizing, mask and indoor smoke findings, and the GRAP order.
2. **Candidates in code.** For a household, a band and the forecast curve, `src/features/planner/candidates.ts` builds every possible step before any model call: keep, move, take indoors or protect each activity, the travel swaps, the indoor steps and the alternatives. Each carries its effects, computed by the ledger in `src/features/ledger/`, and its own template text in English and Hindi.
3. **The model chooses and words.** The model gets the candidates, the household in words and the exact list of numbers it may use. It picks and orders steps and writes the reasons. `src/features/planner/from-wording.ts` then builds the plan, and every number, time and effect in it comes from the candidate, never from the reply.
4. **Rules when the model cannot.** With no key, over quota, out of time or after a refused reply, `src/features/planner/rules-plan.ts` picks the same candidates by rule and words them with the templates. The page says which path made the plan.
5. **Show the working.** Every step opens to its inputs, formula, factors and sources, and the "How this was made" sheet shows the facts sent to the model, its reply, the calculator calls and the number check.

Two households in the same city get different plans because the candidates come from their own members, activities, trips and home, not from the city.

## How the Solution Works

### The journey

1. **Place.** Type a city, town or six digit PIN code, or use the device location, which is rounded to about a kilometre before it is used. The air card shows the nearest CPCB station's reading, or a labelled model estimate when no station with a reading is within 50 km.
2. **Household.** Describe who is at home and how the day goes, or start from a sample sentence. The model reads it into a form shown beside it. Every field can be changed by hand, and the form works with the model off. The page asks people not to enter names.
3. **Plan.** The plan has a morning, an afternoon and an evening. Each step says what to do, why and its effect. Fixed commitments stay put and get protection. Flexible ones move to cleaner hours when the forecast has some. Trade-offs are said plainly, such as a bus that adds a little CO2 against a cycle ride while cutting what is breathed in.
4. **What-if.** Toggles on a step, such as sharing the ride with one more person, recompute the effect in the browser with the same functions the server uses, from `src/features/planner/what-if.ts`.
5. **Ask.** A question under the plan is answered by the model through three calculators bound to this household. The calls are listed with the answer.
6. **Indoor air and swaps, Compare, Society or school.** Indoor steps and alternatives have their own view. Compare puts two households in the same air side by side. The community view returns facts, actions and a notice to copy or print.
7. **Language.** Plans and the community notice can be shown in Hindi. Hindi passages carry `lang="hi"`. The interface itself is in English.

### How GenAI is used

The model is Gemini through `@google/genai`, called only from the server in `src/server/gemini.ts`. It does four things.

| Step           | What the model does                                                                                                     | What code does instead                                                                                                              | Task file                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Intake         | Turns the typed description into one household object, with phrases it could not place and notes on what it assumed.    | Checks the schema, that unplaced phrases are copied exactly, that labels carry no names or numbers, and that no measure is guessed. | `src/features/assistant/intake.ts`    |
| Plan wording   | Chooses, orders and words candidate steps for this household, in English or Hindi.                                      | Builds every candidate and number first, then places the chosen ones and takes every figure from the candidate.                     | `src/features/assistant/word-plan.ts` |
| Ask            | Answers a follow-up question by calling calculator tools that take ids and modes from closed lists, never free numbers. | Runs the medical gate first, binds the tools to the household, and runs them itself with checked arguments.                         | `src/features/assistant/ask.ts`       |
| Notice wording | Rewords the rules notice for a society or school in English and Hindi.                                                  | Builds the facts, actions and the rules notice, and refuses a rewording that drops an action or a number.                           | `src/features/assistant/notice.ts`    |

**Models and order.** `src/server/model-config.ts` tries `gemini-3.5-flash-lite`, then `gemini-3.1-flash-lite`, then `gemini-3.6-flash`. `GEMINI_MODEL` can set another comma separated order. A quota error, overload, missing model, server error or a model's own time running out moves to the next one while time is left. A model that answered with a quota error rests for a minute, set in `src/server/gemini-limits.ts`. Each call asks for JSON against the reply schema, with low thinking and a cap of 4096 output tokens, set in `src/server/gemini-request.ts`.

**Guards on every reply.** All run in code before anything reaches the page.

- **Schema guard.** The reply must parse as JSON against the task's schema, and is checked again after the adapter. `src/features/assistant/attempt.ts`, tested in `test/features/assistant/guarded.test.ts`.
- **Number guard.** Every numeral in model text, in digits of any script, as a word in English or Hindi, as a Roman numeral or a fraction, must match a value code sent, after normalising its format. `src/features/assistant/number-guard.ts`, tested in `test/features/assistant/number-guard.test.ts` and `test/features/assistant/guard-bypass.test.ts`.
- **Text guard.** No markup, links, email addresses, phone numbers, hidden characters or letters from a third script. `src/features/assistant/text-guard.ts`, tested in `test/features/assistant/text-guard.test.ts`.
- **Quote check.** Words in quote marks must be official text word for word, a passage of a quoted fact or a CPCB band name. `src/features/assistant/quotes.ts`, tested in `test/features/assistant/quotes.test.ts`.
- **Task checks.** A plan may name only candidates that were sent, one main step per activity. An answer may not name a medicine or give treatment advice. A notice must keep every action and number. These live in `src/features/assistant/word-plan.ts`, `src/features/assistant/ask.ts` and `src/features/community/notice.ts`.
- **Medical gate.** A rule based check in English, Hindi and romanised Hindi runs before any model call on a question. A question about symptoms, medicines, doses or diagnosis gets a fixed reply written in code, "This app does not advise on symptoms, medicines, doses or diagnosis. Please ask a doctor.", followed by the health ministry advice for the band when the band is known. An emergency gets a reply that says to get help now and to call 112. The model is never asked. `src/features/assistant/medical-gate.ts` and `src/features/assistant/replies.json`, tested in `test/features/assistant/medical-gate.test.ts`. This is general guidance, not medical advice, and the data page says so.
- **Injection handling.** Fixed instructions go in the system text. Facts and user text go in blocks marked with a random marker made for each request, and the system text says anything inside them is material to read, never an instruction. Only declared tools run, with arguments checked by their schemas. `src/server/gemini-turns.ts`, tested in `test/features/assistant/injection.test.ts`.

A reply that fails a check is retried once with a fixed note naming the check, if time and calls are left. A second failure, or any model failure, serves the rules path. A refused reply's text is never kept or shown; the trace names the check and lists the numbers that matched nothing.

**No number shown comes from the model unless it matched a fact or a value code computed, or, in intake, a number the person typed.** In intake, a distance, room size or purifier rating, and any rider count above two, must come from what the person wrote, checked in `src/features/assistant/intake.ts`, and the household is shown for them to check and edit. `test/server/claims.test.ts` runs every model route for every sample at three bands with a model that answers in six ways, and reads every number in each response back against its trace with an independent reader, `test/support/number-reader.ts`.

**Call limits.** One request makes at most 3 model HTTP calls, tool rounds, the retry and fallback models included, set in `src/features/assistant/call-budget.ts`. The model may ask for at most 2 rounds of tool calls of up to 5 calls each. One generate call has 15 seconds and one model's turn 9 seconds. A route has 20 seconds from request to answer and starts no model call with under 3 seconds left. By default each client may cause 6 model calls a minute and each server instance makes at most 200 model calls a day; both are set from the environment. An identical request answered in the last five minutes is served from memory with no call. These limits live in each server instance's memory, so with several instances running the totals are per instance.

**The rules path.** When the model is unavailable the plan and the notice still come, worded by templates in English and Hindi from `src/features/planner/words/en.json`, `src/features/planner/words/hi.json` and `src/features/community/words.json`, and labelled as made by fixed rules with the reason. With the model kept off for the browser, plans and notices are made in the browser by the same functions, from `src/ui/plan/local.ts` and `src/ui/community/local.ts`, and nothing about the household is sent. Questions need the model. When it is unavailable the answer says so and adds the band's advice.

**The trace.** Every generated answer carries a trace, defined in `src/lib/schemas/trace.ts`: who produced it, the model id, the fallback reason, the facts sent, the model's reply when it was used, the tool calls and the number check. "How this was made" opens it on the page.

The Hindi wording in the templates and the fixed replies has not yet been reviewed by a professional translator. A Hindi plan says once that the health ministry's words are rendered, with the original in the sources.

### Data

**Station readings.** Station records come through one provider chain in `src/server/air/chain.ts`, first fresh copy wins.

1. The CPCB CAAQMS hourly feed, read directly by `src/server/air/cpcb.ts`, with a 3 second limit and one fetch an hour while it answers. It works where the server runs on a network the feed host accepts, such as local development. Its host does not answer from hosted servers, so `CPCB_DIRECT_FEED=off` skips it there.
2. The same CPCB data from the data.gov.in resource "Real time Air Quality Index from various locations", read by `src/server/air/data-gov.ts` when `DATA_GOV_IN_API_KEY` is set. It asks only for the states that hold the four indexed stations nearest the point, using the bundled index in `src/server/data/stations.json`.
3. With no station copy at all, the modelled path.

The air card always says which copy served the reading and its hour. The station chosen is the nearest within 50 km, with a station that has an AQI preferred unless it is over 10 km farther, and a fresh hour preferred unless it is over 25 km farther, in `src/features/air/stations.ts`. On the feed path the card shows CPCB's AQI as published and never works one out. If CPCB published none, it says so in words. On the feed path each pollutant's value is labelled "CPCB hourly sub-index, not the AQI." The data.gov.in copy has averages only, so there the card says no hourly sub-index is shown. When a station read fails, the card says which kind of problem it was, the source updating, busy, not answering or sending something unreadable, and shows the last good reading with its hour where there is one.

Readings are hourly. A copy is kept for up to an hour, and the data.gov.in copy is rebuilt about once an hour, so a reading can be an hour or more behind. The card shows the reading's hour and calls it stale after three hours, from `FEED_STALE_AFTER_MINUTES` in `src/config/limits.ts`.

**The AQI on the data.gov.in path.** That resource gives each pollutant's minimum, maximum and average sub-index but no AQI. `aqiByCpcbRule` in `src/features/air/data-gov.ts` applies CPCB's rule: the highest average sub-index, from at least three pollutants, one of them PM2.5 or PM10; otherwise the AQI is null. A station is used only when all seven pollutant rows are there, so a missing worst pollutant cannot lower its AQI. `test/features/air/data-gov.test.ts` pins the rule against a saved copy of the CPCB feed of 24 Nov 2026: it gives the published AQI at 546 of 546 stations that have one, and null at the 29 blank ones. The source line quotes CPCB's own rule.

**The modelled estimate.** Where no station with a reading is within 50 km, `src/features/naqi/estimate.ts` computes an index from the CAMS global model through Open-Meteo: trailing 24 hour means, 8 hour for ozone and CO, CO converted to mg/m³, each read against the NAQI table, the worst sub-index winning. An ozone 8 hour mean above 208 µg/m³ gives way to the highest hour of those 8, which the card names "Ozone, highest hour of the last 8". It needs at least three pollutants including PM2.5 or PM10. The card labels it "Modelled estimate from CAMS via Open-Meteo. Not a measurement. It tends to read low in cities." The same hourly model forecast decides which hours are cleaner in a plan and is always called a model forecast. The NAQI known-answer case from CPCB, PM2.5 of 31 µg/m³ giving sub-index 51 and 60 giving 100, is tested in `test/features/naqi/table.test.ts`.

**Place and PIN search.** Six digits go to a PIN table on the server, in `src/server/data/pin/`, built from GeoNames postal codes and described in `src/server/data/pin/SOURCE.txt`. It resolves the exact PIN, then the four digit prefix when at least 3 known PINs share it, then the three digit prefix, and says how rough a prefix answer is. A PIN centre is used only to find the nearest monitoring station and the app never claims neighbourhood accuracy. Other text goes to Open-Meteo's place search, limited to India. `src/features/air/pin.ts` and `src/features/air/places.ts`.

**GRAP.** Only for places in Delhi NCR, with the stage and the date of the CAQM order held in the facts, from `src/features/air/grap.ts`. Elsewhere it is not shown.

**The facts registry.** `src/config/facts/index.ts` holds 156 facts, 93 numbers and 63 quoted passages, citing 29 public documents. Each has an id, a title, a source with a link and the date it was retrieved, checked by `test/config/facts/index.test.ts`. It carries no household "PM added", no dose total, no metro or electric vehicle CO2 and no indoor to outdoor ratio, since none has a verified source; `test/config/facts/index.test.ts` and `test/features/planner/claims.test.ts` check they never appear.

**Licences and credits**, as the About the data page states them, from `src/ui/legal/AboutDataView.tsx` and the credit facts in `src/config/facts/air.ts`:

- Station readings: Central Pollution Control Board CAAQMS hourly feed. CPCB states no licence for this feed. The app shows CPCB's AQI as published.
- Through data.gov.in: the credit in the Government Open Data License India template, dated with the day the page is read, with the licence linked.
- Forecast and estimate: "Weather data by Open-Meteo.com" and the CAMS global forecast of the Copernicus Atmosphere Monitoring Service through Open-Meteo, CC BY 4.0.
- PIN code places: GeoNames postal codes, geonames.org, CC BY 4.0.
- Type: Anek, under the SIL Open Font License 1.1, in `src/ui/fonts/OFL.txt`.

### Privacy

There are no accounts, no analytics and no cookies. The server stores nothing on disk or in a database. The household, the place and the model choice stay in the browser's local storage until cleared from the Privacy page. Before anything first goes to the model the page asks, says what will be sent, and asks people not to add names or record numbers. The app uses the free tier of the Gemini API; the Privacy page, `src/ui/legal/words.json`, states that Google's terms for it let Google use what is sent, and the replies, to improve its products, and that people at Google may read it. Log lines carry codes from a closed set of fields, never what was typed, from `src/lib/logger.ts`.

### Accessibility

The views use native controls, one heading each and landmarks, keep focus on a useful element after every action, and announce results and errors through one polite live region, each in its own language. Bands are told by hatching and words, never by colour alone, the colour tokens are held to contrast minimums by a test, and controls on the main screens, links inside sentences aside, measure at least 44 by 44 CSS pixels on a phone. axe-core runs in the unit tests and at every step of the browser journeys, one of which is done with the keyboard alone. It has not been tried with a real screen reader; [ACCESSIBILITY.md](ACCESSIBILITY.md) has each control, its test and the limits of that evidence.

## Sample inputs

The first screen offers the first three of these made-up sample sentences and the household page offers all four. They describe no real family.

1. "Two parents, our son of 9 who has asthma, and his grandmother who has a heart condition. One parent drives a petrol car 14 km to the office at 8:30 and back. Our son has football at 6 in the evening, which can move. His grandmother walks in the park at 7 in the morning for 40 minutes and can go later. We cook on LPG, burn a mosquito coil at night and have a purifier in the living room."
2. "An older couple living on our own. One of us has a lung condition. We cook on a wood chulha and light incense in the morning. We walk to the market 1 km away at 7 in the morning for about an hour, and any time is fine. In the evening we sit in the park from 5:30 for 45 minutes."
3. "I work as a delivery rider on a petrol scooter from 11 in the morning to 9 at night and ride about 60 km a day. I live alone in a rented room of about 100 sq ft, cook on LPG and smoke."
4. "Three students sharing a flat. Two of us cycle 5 km to college at 8:40 and back in the evening. The third goes for a run at 6:30 in the morning for 45 minutes and can run at any time. We cook on induction and sometimes burn incense."

What to expect on a poor or worse day. Figures depend on the day's reading and forecast.

- **Sample 1.** The form shows two adults, a child with asthma and an older adult with a heart condition. The car commute gets "windows up, AC on" and a bus swap that cuts CO2 in kg and says plainly that the bus may mean breathing in more than a closed car with AC. The flexible football and park walk move to cleaner hours, or indoors on a very poor day. The coil and the car commute get alternatives. Add a room size in the form to get a purifier size for that room.
- **Sample 2.** The market walk and the evening in the park move to the cleaner afternoon hours when the forecast has them, and the wood chulha gets the gas or induction alternative.
- **Sample 3.** The fixed delivery shift stays where it is and gets a well fitted N95 and breaks away from traffic.
- **Sample 4.** The cycle commute gets a light pace and a mask, and a bus swap that says it adds CO2 that cycling does not, in exchange for breathing less on the way.
- **Society or school.** The community view offers two samples, a housing society of 120 flats with a diesel generator and a bus stop at the gate, and a primary school of 400 pupils with an outdoor assembly. "Work out the facts" returns computed facts, ranked actions and a notice in English and Hindi.

Edge cases worth trying:

- **A medical question.** Ask "He is wheezing, which inhaler dose should he take?" under a plan. The answer is the fixed reply, marked as written in advance and not sent to the model.
- **A place with no station.** PIN 744101, South Andaman, is far from every station in the bundled index, so the card shows the labelled modelled estimate and says why.
- **The model off.** Choose "Keep the model off" when the page asks. The plan is made in the browser with fixed wording and says so, in English or Hindi.

The end to end tests in `e2e/` run these flows against the real app with fixed station data and a scripted model, including a model over its quota and a wording the number check refuses, and check focus, screen layout and target sizes.

## Assumptions Made

- People using it are in India. Coordinates outside a box around India are refused and place search is limited to India.
- The nearest CPCB station within 50 km stands for the place. A PIN centre is accurate to about a city.
- The model forecast is used to compare hours within a day, not as a reading, since it tends to read low in cities.
- What is breathed in grows with the air where you are, how fast you breathe and for how long, so effects are relative changes with a range, not doses. The commute exposure ratios come from a study in Delhi and are applied in other cities too.
- Travel CO2 uses India GHG Program factors per vehicle km shared by the people inside, or per passenger km for bus and suburban rail. A driven trip with no rider count is taken to carry only the people named for it, and the notes on what was assumed say so.
- Times are IST. The morning starts at 05:00, the afternoon at 12:00 and the evening at 17:00, from `SLOT_START_HOURS` in `src/config/limits.ts`.
- Health advice is the health ministry advisory for the band, quoted word for word in English. The GRAP stage is the one left in force by the dated order in the facts, not a live feed.
- People describe their household in general words. The app does not need names and asks for none.

## Quick start

Node 22, 24 or 26, as `package.json` engines allow.

```sh
npm ci
cp .env.example .env.local   # every value may stay empty; then the app runs on the rules path and says so
npm run dev                  # http://localhost:5173, with the API on the same server
npm run gate                 # format, lint, typecheck, tests with coverage, build and the bundle budget
npx playwright install chromium
npm run e2e                  # builds, serves the preview on port 4173 and runs the journeys on a phone and a laptop profile
```

The variables are described in `.env.example`: `GEMINI_API_KEY`, `GEMINI_MODEL`, `MODEL_DAILY_CALL_CAP`, `API_RATE_LIMIT_PER_MINUTE`, `MODEL_RATE_LIMIT_PER_MINUTE`, `DATA_GOV_IN_API_KEY` and `CPCB_DIRECT_FEED`. They are read and checked once at start in `src/config/env.ts`; a bad value stops the server naming the variable, never its value.

## Endpoints

All routes are declared as contracts with zod schemas for input and output, and mounted by `src/server/mount.ts`.

| Method | Path          | Purpose                                                                                        | Contract                             |
| ------ | ------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------ |
| GET    | `/api/health` | Says the API is up, its clock, and which sources this instance is set up with.                 | `src/lib/health.ts`                  |
| GET    | `/api/places` | Places in India for `q`, a town, city or six digit PIN. An empty list means not found.         | `src/features/air/contract.ts`       |
| GET    | `/api/air`    | The air card for `lat` and `lon` rounded to two decimals: reading, feed state, forecast, GRAP. | `src/features/air/contract.ts`       |
| POST   | `/api/intake` | A typed description read into a household, or unavailable with the reason.                     | `src/features/household/contract.ts` |
| POST   | `/api/plan`   | The day plan for a household at a place, in English or Hindi, with its trace.                  | `src/features/planner/contract.ts`   |
| POST   | `/api/ask`    | A follow-up question, answered through calculators or by the fixed medical reply.              | `src/features/assistant/contract.ts` |
| POST   | `/api/notice` | Facts, actions and a notice in English and Hindi for a society or school.                      | `src/features/community/contract.ts` |

The server reads the air itself for every plan, question and notice; the client never sends air values. Places may be cached for a day and air for five minutes, except an air answer built while a source failed. POST answers and errors are never cached. Errors carry a code and a plain message, never a stack trace, from `src/server/errors.ts`.

## Folder layout

```text
api/index.ts          the one Vercel function, serving every /api route through the Hono app
src/config/           product name, environment, limits, security headers, the facts registry
src/lib/              route contracts, shared schemas, cache, upstream fetch, logger, rate limiter, model port
src/features/         pure domain code: air, naqi, household, ledger, planner, assistant, community
src/server/           Hono app, middleware, routes, the Gemini adapter, air providers, server-only data
src/ui/               React views, shared components, styles and fonts
test/                 mirrors src file for file, plus conventions, accessibility and test support
e2e/                  Playwright journeys with axe, and focus, layout and target size checks
scripts/              bundle budget, data build steps and live checks kept out of the gate
docs/                 engineering decisions and the build log
```

Features never import the server or the interface, and the interface never imports the server; `test/conventions/layers.test.ts` enforces it.

## Deployment

The app deploys to Vercel as `vercel.json` describes. Vercel runs `npm ci` and `npm run build` and serves the Vite build from the dist folder. The API is one function, `api/index.ts`, in the Mumbai region `bom1` with a 30 second limit, and every `/api/` path is rewritten to it. The same page headers the code defines in `src/config/headers.ts` are set on every path, and hashed assets are cached for a year; `test/conventions/deploy.test.ts` checks that the two agree. On the host, set `GEMINI_API_KEY`, `DATA_GOV_IN_API_KEY` and `CPCB_DIRECT_FEED=off`. Keys stay on the server and never reach the browser bundle.

## Documents

- [CODE_QUALITY.md](CODE_QUALITY.md): lint limits, conventions and the checks that enforce them.
- [SECURITY.md](SECURITY.md): controls one by one, with where each is enforced and tested.
- [EFFICIENCY.md](EFFICIENCY.md): caches, upstream budgets, bundle size and lazy views.
- [TESTING.md](TESTING.md): test layers, coverage, fakes and the adversarial sets.
- [ACCESSIBILITY.md](ACCESSIBILITY.md): accessibility controls one by one, with their tests and the limits of the evidence.
- [PROBLEM_ALIGNMENT.md](PROBLEM_ALIGNMENT.md): the problem statement clause by clause.
- [docs/decisions.md](docs/decisions.md): engineering decisions with their context and consequence.
- [docs/build-log.md](docs/build-log.md): what was built, in order.

## Licence

MIT, see [LICENSE](LICENSE).
