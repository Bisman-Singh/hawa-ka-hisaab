# Build log

What was built, in the order it landed on the main branch, from `git log`. Dates are in IST. This account runs to commit 2bdc19c.

## 26 November 2026

1. **Foundation.** The toolchain, strict TypeScript, lint rules, the route contracts with their shared schemas, the app shell, the CI workflows, and the household and planner schemas the other parts build on.
2. **Facts, household, ledger and planner.** The first fact tables with their sources, household helpers, the ledger that works out exposure and travel CO2 with their working, and the day planner that turns a household, a band and a forecast into morning, afternoon and evening steps.
3. **Community.** Community facts, the rules that rank actions for a housing society or a school, and the notice in English and Hindi.
4. **Design system and frame.** The stylesheets on the colour tokens, the self-hosted Anek type, the shared components with their reference page, and the app frame with its navigation.
5. **Line budget.** The source line budget in `test/conventions/size.test.ts` raised to fit the screens.
6. **Air.** Station readings from the CPCB feed, the modelled estimate from Open-Meteo with the NAQI table, place search, the PIN table from GeoNames postal codes, GRAP for Delhi NCR, and the places and air routes.

## 27 November 2026

7. **Home and household views.** Place search with the air card on the first screen, and the household view with the description box and the form.
8. **Plan and the other views.** The day plan, indoor air, compare, community and ask views, with the sheet that shows how an answer was made.
9. **Line budget.** The source line budget widened until the code is trimmed.
10. **The model.** The Gemini adapter with its guards, one facts registry for the whole app, and the intake, plan, ask and notice routes.
11. **Sources checked.** Quotes, citations and the stated scope of facts corrected against their source documents.
12. **Screens on the routes.** The screens fitted to the real routes, the choice of whether to use the model, the privacy and data pages, and the first end to end tests.
13. **Station read logging.** A failed station read now logs its kind and status.
14. **Per-household wording and Hindi.** Plans and effects reworded for each household, Hindi on the rules path, harder guards, and refusals shown by their reason.
15. **data.gov.in and budgets.** Only stations with every pollutant row are used from data.gov.in, failed reads are retried sooner, upstream calls are held to budgets, and the rate limiter is tighter.
16. **Wording as checked data.** Interface wording moved into checked content files, button, section and time helpers shared across the views, and seven small product faults fixed.
17. **Focus, errors and targets.** Focus kept on a useful element after every action on every screen, form errors announced, one line for each kind of station data problem, and touch targets brought to 44 px, with end to end checks for focus, screen layout and target size.
