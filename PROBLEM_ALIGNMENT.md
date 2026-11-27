# Problem alignment

> "Urban Air Quality Assistant: Create a GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution. The application should suggest low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to their location and lifestyle, while clearly explaining the direct impact of their choices."

This file takes the statement clause by clause. For each it gives what a person does and sees, the files that do it, the tests that check it, and why it was built that way.

## A GenAI-powered assistant

**Journey.** A person types who is at home and how the day goes. Gemini reads it into a household form shown beside the text. Their plan is chosen and worded by the model, a follow-up question is answered by the model through calculators, and a society's notice is reworded by the model in English and Hindi.

- Files: `src/features/assistant/intake.ts`, `src/features/assistant/word-plan.ts`, `src/features/assistant/ask.ts`, `src/features/assistant/notice.ts`, all run through `src/features/assistant/guarded.ts` and the adapter in `src/server/gemini.ts`.
- Tests: `test/features/assistant/intake.test.ts`, `test/features/assistant/word-plan.test.ts`, `test/features/assistant/ask.test.ts`, `test/features/assistant/notice.test.ts`, `test/server/claims.test.ts`.

**Why this way.** People describe a day in their own words better than they fill in a form, so the model does the reading and the writing. A family acting on a number needs it to be right, so the model never supplies one of its own. Code computes every figure first; the model may only repeat numbers it was sent, and the number guard in `src/features/assistant/number-guard.ts` refuses any other. The form stays editable and works with the model off, so a person can always correct or replace what the model read.

## Families

**Journey.** The household is members by age group, infant, child, teen, adult or 60 and over, with flags for pregnancy, asthma or another lung condition, a heart condition and outdoor work. No names are asked for. Plans speak to each person by these words, such as "the child with asthma or a lung condition". When a household has more activities than the model is asked to word, those of the people the health ministry advisory counts as vulnerable are worded first, and on a severe day their protection is kept even when the model leaves it out.

- Files: `src/features/household/schemas.ts`, `src/features/household/members.ts`, `src/features/planner/worded.ts`, `src/features/planner/protect.ts`.
- Tests: `test/features/household/schemas.test.ts`, `test/features/household/members.test.ts`, `test/features/planner/protect.test.ts`, and `test/features/planner/claims.test.ts`, which checks every household gets a step for each person outside on a moderate or worse day, the outdoor worker included.

**Why this way.** The advice that matters on a smog day depends on who is at risk. Age and condition are enough to choose it, and leaving names out keeps what is sent to the model general.

## Communities

**Journey.** On the "Society or school" view, a housing society enters its homes and a school its pupils, with generator hours, waste burning, gate idling and outdoor periods. It gets computed facts, such as the number of people the health advisory counts as vulnerable summed from the counts entered, ranked actions such as moving outdoor periods into the cleaner window, and a notice in English and Hindi to copy or print.

- Files: `src/features/community/report.ts`, `src/features/community/figures.ts`, `src/features/community/rules.ts`, `src/features/community/notice.ts`, `src/ui/community/CommunityView.tsx`.
- Tests: `test/features/community/report.test.ts`, `test/features/community/report-claims.test.ts`, `e2e/community.spec.ts`.

**Why this way.** A secretary or a head teacher decides for many people at once and has to tell them. A notice in both languages, addressed to residents or to parents and staff, is the thing they can act with. Each fact is a count or sum of what was entered, set beside a cited city-wide share where one exists, never a mass, concentration or emission figure.

## Severe winter smog and urban air pollution

**Journey.** The first screen shows the air card for the place: the nearest CPCB station, its distance, the reading's hour, CPCB's AQI and band, the main pollutant and, from the CPCB feed, each pollutant's hourly sub-index. A stale reading says so with its hour. The plan opens with the band and the health ministry advice for it, quoted word for word in English. In Delhi NCR the card adds the GRAP stage left in force by the dated order.

- Files: `src/features/air/reading.ts`, `src/features/air/stations.ts`, `src/features/air/grap.ts`, `src/config/facts/advice.ts`.
- Tests: `test/features/air/reading.test.ts`, `test/features/air/stations.test.ts`, `test/features/air/grap.test.ts`, `test/server/routes/air.test.ts`.

**Why this way.** People trust the official reading, so the card shows CPCB's own AQI as published and never computes one for a station. Every reading names its source and its hour. A severe day gets firm steps and a mild day gets reassurance, since restrictions on a clean day would teach people to ignore the plan; `test/features/planner/claims.test.ts` checks a mild day carries no restricting item.

## Low-emission daily routines

**Journey.** The plan has a morning, an afternoon and an evening, starting at 05:00, 12:00 and 17:00 IST. Fixed commitments, such as work or school, stay where they are and get protection: a closed car with the AC on recirculate, a light pace, a well fitted N95. Flexible ones, such as a walk or a game, move to the cleaner hours of the forecast, or indoors on the worst days. A car trip gets a swap to the bus, the metro or a shared ride.

- Files: `src/features/planner/activity-actions.ts`, `src/features/planner/effects.ts`, `src/features/planner/travel.ts`, `src/features/planner/swap.ts`, `src/features/planner/assemble.ts`.
- Tests: `test/features/planner/activity-actions.test.ts`, `test/features/planner/effects.test.ts`, `test/features/planner/travel.test.ts`, `test/features/planner/swap.test.ts`.

**Why this way.** A day is lived in parts, so the plan is too. A move is offered only when the forecast has a cleaner hour by enough, the hour either side is shown so a little early or late still counts, and the cleaner hours are always called a model forecast.

## Indoor air quality hacks

**Journey.** The "Indoor air and swaps" view lists the steps for the home: when to air the rooms from the forecast and the advisory, the smallest purifier rating each room with a typed area needs and whether the one there meets it, a step for each smoke source the household listed such as a mosquito coil or incense, wet mopping, masks, and short corrections of common beliefs such as houseplants cleaning smoky air.

- Files: `src/features/planner/indoor.ts`, `src/features/planner/indoor-purifier.ts`, `src/features/planner/indoor-guidance.ts`, `src/features/ledger/purifier.ts`, `src/config/facts/indoor.ts`.
- Tests: `test/features/planner/indoor.test.ts`, `test/features/planner/indoor-purifier.test.ts`, `test/features/planner/indoor-guidance.test.ts`, `test/features/ledger/purifier.test.ts`.

**Why this way.** Most hours of a smog day are spent at home. Sizing uses the EPA rule of 65 cfm per 100 sq ft, converted to m³ per hour, so the advice fits the room that was typed rather than a generic "buy a purifier".

## Sustainable alternatives

**Journey.** The same view pairs the household's own habits with cleaner ones: a car commute with the bus, the metro or a shared ride, driven errands with one combined trip, a school run with the school bus, a wood, coal or kerosene stove with gas or induction, a mosquito coil with a net or a repellent that does not burn.

- Files: `src/features/planner/alternatives.ts`, `src/config/facts/travel.ts`.
- Tests: `test/features/planner/alternatives.test.ts`.

**Why this way.** A swap only helps if it fits a trip the family already makes. Pairs with a cited factor show a number; the rest give the reason only. The metro has no verified CO2 factor in the registry, so its pair says so and shows no figure.

## Tailored to their location

**Journey.** A person types a town, a city or a six digit PIN, or uses the device location. A PIN is matched in a table on the server, falling back to its four or three digit prefix with the roughness said. The nearest station within 50 km gives the reading; with none, a labelled model estimate stands in and says why. The forecast curve for that point decides the cleaner hours.

- Files: `src/features/air/service.ts`, `src/features/air/pin.ts`, `src/features/air/places.ts`, `src/features/air/stations.ts`, `src/features/naqi/estimate.ts`, `src/server/air/chain.ts`.
- Tests: `test/features/air/pin.test.ts`, `test/features/air/places.test.ts`, `test/features/air/stations.test.ts`, `test/features/naqi/estimate.test.ts`, `test/server/air/chain.test.ts`.

**Why this way.** Readings differ from station to station, and people know their PIN. Every place in India gets an answer: a station where there is one in range, and an estimate clearly labelled as a model where there is not. GRAP applies only to Delhi NCR, so it is shown only there.

## Tailored to their lifestyle

**Journey.** Each activity carries who goes, when, for how long, indoors, outdoors or in transit, the travel mode, fuel and distance, and whether the time is fixed or can move. The home carries its rooms, cooking fuel and indoor sources. The plan is built from these, so a cyclist, a delivery rider and a family with a car get different steps on the same day. The "Two households, the same air" view shows two plans side by side and names the differences.

- Files: `src/features/planner/candidates.ts`, `src/features/planner/compare.ts`, `src/ui/compare/CompareView.tsx`.
- Tests: `test/features/planner/claims.test.ts`, which checks two households in the same air get different plans and the differences are named, `test/features/planner/compare.test.ts`, `e2e/community.spec.ts`.

**Why this way.** Advice for a city is advice for nobody in particular. Building the candidates from the household's own day makes two neighbours' plans differ for reasons each can see.

## Clearly explaining the direct impact of their choices

**Journey.** Each step shows its effect: the change in pollution breathed in as a relative figure with a range, such as "Up to 2.4× as much" for a bus against a closed car, and the CO2 change in kg for one traveller with the occupancy it assumes. "Show the working" opens the inputs, the formula, each factor and its source link. What-if toggles, such as sharing the ride with one more person, recompute the figure at once in the browser. Trade-offs are stated, such as a bus ride that adds CO2 that cycling does not, in exchange for breathing less on the way. "How this was made" shows the facts sent to the model, its reply, the calculator calls and the number check.

- Files: `src/features/ledger/exposure.ts`, `src/features/ledger/co2.ts`, `src/features/ledger/display.ts`, `src/features/planner/what-if.ts`, `src/lib/schemas/trace.ts`, `src/ui/trace/Working.tsx`.
- Tests: `test/features/ledger/exposure.test.ts`, `test/features/ledger/co2.test.ts`, `test/features/planner/what-if.test.ts`, `test/ui/trace/Working.test.tsx`, `e2e/main-journey.spec.ts`.

**Why this way.** An effect people can check is one they can act on. Exposure is shown only as a relative change with a range. The registry holds no verified source for a household dose, so it carries no "PM added", dose total or indoor to outdoor ratio. Where a factor is missing, as for the metro or an electric car, no figure is shown rather than a guess; `test/features/planner/claims.test.ts` checks it.

## When the model is not there

The free tier can run out while people are using the app, so the rules path is part of the product. Without the model, a plan and a notice are still served, worded by fixed templates in English and Hindi, and labelled with the reason. With the model kept off for a browser, they are made in that browser and nothing about the household is sent. `src/features/planner/rules-plan.ts`, `src/ui/plan/local.ts`; tested in `test/features/planner/rules-plan.test.ts` and `e2e/no-model.spec.ts`.

## Language

Plans and the community notice can be read in Hindi, and Hindi passages carry `lang="hi"`. The Hindi templates and fixed replies have not yet been reviewed by a professional translator.
