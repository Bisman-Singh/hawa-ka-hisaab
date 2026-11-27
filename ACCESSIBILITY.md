# Accessibility

People use this app on phones, in English and in Hindi, often in a hurry on a bad air day. Each control below gives the behaviour, where it is built and the test that checks it. A WCAG 2.2 success criterion is named only where the control speaks to it. No conformance level is claimed. The limits of the evidence close this file.

## Structure and headings

**One heading per view, landmarks and a skip link.** Every view opens with one `h1`, from `ViewHeading` in `src/ui/components/Navigation.tsx`. The frame in `src/ui/components/AppShell.tsx` puts a skip link first, then the banner, `main` and the footer, and sets the page title to the view's name followed by the app's name. The plan view adds a named side column and a named navigation. Criteria 1.3.1, 2.4.1, 2.4.2.

- Tests: `test/ui/components/AppShell.test.tsx`, `test/ui/components/Navigation.test.tsx`, and `e2e/first-visit.spec.ts`, which checks the title of every view across reloads and the back button.

**Native elements.** Buttons are `button` elements, groups of choices are `fieldset` with a `legend`, the working of each step is a `details` disclosure, "How this was made" is a native modal `dialog`, and tables have captions and header cells with scope. `src/ui/components/Segmented.tsx`, `src/ui/components/Disclosure.tsx`, `src/ui/components/DialogSheet.tsx`, `src/ui/components/BandLegend.tsx`. Criteria 1.3.1, 4.1.2.

- Tests: `test/ui/components/Segmented.test.tsx`, `test/ui/components/Disclosure.test.tsx`, `test/ui/components/DialogSheet.test.tsx`, `test/ui/components/BandLegend.test.tsx`.
- A disclosure is named by its words, not by the plus or minus drawn beside it, and the band table keeps its column headers on a phone. Test: `e2e/screens.spec.ts`.

**Who each column is.** In the compare view each line starts with "Yours." or "Sample.", so a side is known by its words and not only by its place on the screen. `src/ui/compare/CompareResult.tsx`, tested in `test/ui/compare/CompareResult.test.tsx`. Criterion 1.3.1.

**Short forms spelled out.** The About the data page has a "Short forms used here" section for AQI, CPCB, CAAQMS, PM2.5, GRAP, CAQM, NCR and CADR. `src/ui/legal/AboutDataView.tsx`, tested in `test/ui/legal/AboutDataView.test.tsx`.

## Keyboard and focus

**Everything works from the keyboard.** Every control is native, and radios move with the arrow keys. `e2e/main-journey.spec.ts` runs the main journey with the keyboard alone: place, sample, household, plan, a what-if, the sheet, and a question. Criterion 2.1.1.

**A visible ring.** `:focus-visible` draws a 3 px outline 2 px outside the control, in `src/ui/styles/base.css`; on a segmented choice the ring goes on the label, in `src/ui/styles/controls.css`. The ring colour is held to 3 to 1 against both backgrounds in both schemes by `test/a11y/contrast.test.ts`, and the sheet draws its ring inside its own edge, checked in `e2e/screens.spec.ts`. Headings, the first screen's opening line and the air card slot, which take focus from code and are not controls, show no ring. Criterion 2.4.7.

**Focus goes somewhere useful.** Criterion 2.4.3.

- Moving to a view puts focus on its heading. The first screen, whose heading is hidden, focuses its visible opening line instead, through `ViewLede` in `src/ui/components/Navigation.tsx`.
- Content that appears after an action takes focus once it exists, such as the first place choice or the first field with a problem, through `useFocusLater` in `src/ui/hooks/focus.ts`.
- When an action removes the control that had focus, as when the model choice or a retry replaces a button, `useRescueFocus` in the same file moves focus to the view's heading or a named control instead of the page body. The plan, compare and community views and the description box use it.
- A busy or unavailable button is marked with `aria-disabled` and keeps focus, in `src/ui/components/Button.tsx`.
- "Try again" on a failed air reading moves focus to the air card slot, in `src/ui/place/AirCardSlot.tsx`.
- The sheet opens as a modal dialog, Escape closes it, and focus returns to the button that opened it.
- Tests: `test/ui/hooks/focus.test.tsx`, `test/ui/components/Button.test.tsx`, `test/ui/components/DialogSheet.test.tsx`, and `e2e/focus.spec.ts`, which checks where focus is after choosing the model, switching the plan language, stepping the forecast to either end, asking, sending the community form, comparing and retrying a failed reading.

**The severe-day warning is read first.** On a very poor or severe day the plan's bulletin sits right after the `h1` that takes focus, inside `src/ui/plan/PlanHead.tsx`. Tests: `test/ui/plan/PlanView.test.tsx`, and `e2e/focus.spec.ts` for its place after the heading. On a wide screen the plan column comes first in reading order and on screen, with the side column after it, from `src/ui/plan/PlanView.tsx` and the `.spread.flip` rules in `src/ui/styles/frame.css`; no test measures that layout.

## Announcements

**One polite live region for results.** `src/ui/hooks/announcer.tsx` renders a single status region. Each announcement is a new node, so the same words said twice are read twice, and each carries its language. The household form, place search, the description box, the plan, what-if toggles, the ask box, compare, the community notice and clearing the household announce through it. Criterion 4.1.3.

- Status regions for "working" lines exist before their text appears, so the text is read when it arrives, in `src/ui/ask/AskBox.tsx`, `src/ui/compare/CompareView.tsx`, `src/ui/household/IntakeBox.tsx` and `src/ui/community/CommunityView.tsx`.
- A what-if choice on a Hindi plan is announced in Hindi with the Hindi sentence stop, from `stops` in `src/ui/plan/words.json`.
- Tests: `test/ui/hooks/announcer.test.tsx`, `test/ui/plan/PlanEntry.test.tsx`, `test/ui/place/PlaceSearch.test.tsx`.

## Language of parts

The page is `lang="en"`. Every Hindi passage carries `lang="hi"`: the plan's slots and steps in Hindi, Hindi answers and the fixed Hindi replies, the Hindi notice, the Hindi wordmark, the Hindi language option and the names of the parts of the day on the forecast chart. The working of a Hindi plan stays in English inside `lang="en"`, and its summary says so. Criteria 3.1.1, 3.1.2.

- Tests: `test/ui/ask/Answer.test.tsx`, `test/ui/components/Masthead.test.tsx`, `test/ui/components/Segmented.test.tsx`, `test/ui/plan/StripChart.test.tsx`, `test/ui/components/Ledger.test.tsx`, `test/ui/trace/Working.test.tsx`, `test/ui/community/CommunityView.test.tsx`, and in a browser `e2e/community.spec.ts` and `e2e/no-model.spec.ts`.

## Forms and errors

**Labels, hints and errors tied to the control.** Fields are built on `Field` in `src/ui/components/Field.tsx`, which labels the control and ties its hint and error to it with `aria-describedby`, the error read first, and marks the control with `aria-invalid` while the error stands. No field uses placeholder text. Number fields ask for the matching phone keyboard, times use the time input, and the place field carries `autocomplete="address-level2"`. Criteria 1.3.1, 3.3.1, 3.3.2.

- Test: `test/ui/components/Field.test.tsx`.

**Errors are heard.** When a form refuses a value, focus moves to the field with the error already in its description, so it is read as focus lands. Where focus stays put, as when Enter is pressed in an empty place field, the error is said in the live region. Saving the household with problems moves focus to the first one and announces how many there are. Criteria 3.3.1, 3.3.3.

- Tests: `test/ui/ask/AskBox.test.tsx`, `test/ui/place/PlaceSearch.test.tsx`, `test/ui/household/useHouseholdForm.test.tsx`, `test/ui/community/CommunityForm.test.tsx`, and `e2e/focus.spec.ts` for the question box, the place field and the community form.

**The community form says what it needs.** Required fields are marked "needed" in their labels and a line above the form explains it. Each number error states its range, such as "Enter the number of homes, from 1 to 10000.", from `src/ui/community/words.json`. `test/ui/community/community-form.test.ts` checks the schema holds each stated range at its edge and one past it. Criteria 3.3.2, 3.3.3.

**Nothing typed twice.** "Change what you wrote" opens the description box with the text that was read last. `src/ui/household/IntakeBox.tsx`, tested in `test/ui/household/IntakeBox.test.tsx`. Criterion 3.3.7.

**Sample buttons have their own names.** On the first screen they read "Use this, 1 of 3" and so on, each described by its own sentence. `src/ui/household/intake-parts.tsx`, tested in `test/ui/household/intake-parts.test.tsx`.

## Colour, contrast and bands

**Contrast held by a test.** Colours are tokens in `src/ui/styles/tokens.css`, with a light and a dark value that follow the system setting. `test/a11y/contrast.test.ts` keeps every text pair at 4.5 to 1 and every interface pair, the focus ring, field borders and band hatching among them, at 3 to 1, in both schemes, and fails if a token changes to break one. Criteria 1.4.3, 1.4.11.

**Bands are never told by colour alone.** A band is shown by hatch density with its name always written beside it, in `src/ui/components/Band.tsx` and `src/ui/styles/bands.css`. CPCB's colour appears once, as a chip over today's cell, and carries no meaning alone. The six-step scale is hidden from screen readers and replaced by one sentence naming the value, its band and its range. Links in text keep their underline. Criterion 1.4.1.

- Tests: `test/ui/components/Band.test.tsx`, `test/ui/components/BandLegend.test.tsx`.

**Forced colours.** With forced colours on, the chosen segment uses the system highlight colours and the band hatches are drawn in the system text colour, in `src/ui/styles/controls.css` and `src/ui/styles/bands.css`.

## Size, reflow and motion

**Targets of 44 by 44.** Control styles set a minimum height of 2.75 rem, the `--target` token in `src/ui/styles/tokens.css`. `e2e/targets.spec.ts` measures every link, button, field and disclosure on eight screens at 360 px wide and fails on any under 44 by 44 CSS pixels. A link inside a sentence is left out, since the text around it sets its size. Criterion 2.5.8, at the 44 by 44 size that 2.5.5 describes.

**Text that resizes and wraps.** Font sizes are rem tokens in `src/ui/styles/tokens.css`, the viewport does not block zoom, and long words and rows wrap with `overflow-wrap` and `flex-wrap` rules in the stylesheets. `e2e/screens.spec.ts` sets the line height to 1.5, letter spacing to 0.12 em and word spacing to 0.16 em on every element and checks the plan does not pan sideways at 360 px wide. Criteria 1.4.4, 1.4.10, 1.4.12.

**Motion only when it is welcome.** The one animation is the stepped pulse of the loading skeleton, in `src/ui/styles/states.css`, and only under `prefers-reduced-motion: no-preference`. There are no transitions. `test/conventions/visual-rules.test.ts` enforces both.

**No time limits.** Nothing in `src/ui` sets a timer, so nothing times out on the person; `git grep -E "setTimeout|setInterval" -- src/ui` finds nothing. Criterion 2.2.1.

## Charts and pictures

**The forecast chart has a table behind it.** The drawn chart is hidden from screen readers, in `src/ui/plan/StripChart.tsx`. `src/ui/plan/HourTable.tsx` gives every hour and its PM2.5 value as a real table with a caption and column headers, inside a visually hidden box, so the hidden table cannot widen the page. The stepper's reading is announced through a polite `output`, in `src/ui/plan/ForecastStrip.tsx`. Criteria 1.1.1, 1.3.1.

- Tests: `test/ui/plan/HourTable.test.tsx`, `test/ui/plan/ForecastStrip.test.tsx`, `test/ui/plan/StripChart.test.tsx`.

Drawn icons and band glyphs are marked `aria-hidden`, and the words beside them carry the meaning.

**Without JavaScript.** `index.html` holds a `noscript` line saying the app needs JavaScript.

## Automated checks

- **Lint.** The jsx-a11y strict rules run on every `.tsx` file, in `eslint.config.js`, through `npm run lint`.
- **axe in unit tests.** Interface tests run axe-core on what they render through `axeViolations` in `test/ui/helpers.tsx`. `test/a11y/reference.test.tsx` runs it over every shared component in every state, in the light and the dark scheme, with the sheet shut and open.
- **axe in the browser.** At every step of the four journeys in `e2e/main-journey.spec.ts`, `e2e/no-model.spec.ts`, `e2e/community.spec.ts` and `e2e/first-visit.spec.ts`, `e2e/support/page.ts` runs axe on the whole page against the WCAG 2.2 A and AA tags, and fails on any violation, console error or policy violation. The journeys run on a phone and a laptop profile.
- Counts and results of these runs are in [TESTING.md](TESTING.md).

## Limits of this evidence

- No session with a real screen reader is recorded. Names, roles, live regions and reading order are checked by axe, by Testing Library queries and by the browser's accessibility tree in Playwright, not by listening.
- The forced-colours rules and text enlarged to 200 percent were written for but not measured. The reflow and text spacing check covers the plan at 360 px wide.
- axe in jsdom has no layout, so those runs cannot measure rendered contrast or size; the token test, the browser runs and the target measure cover those.
- The target measure runs on eight screens at 360 px wide, not on every state of every screen.
- The Hindi wording has had no professional review.
