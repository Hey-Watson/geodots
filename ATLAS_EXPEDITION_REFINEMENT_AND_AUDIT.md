# GEODOTS — My Atlas expedition milestone, states & map controls

**Owner-approved next task:** Implement one focused Atlas UX refinement and perform a **read-only** expedition progression audit.  
**GitHub repository:** `Hey-Watson/geodots`  
**Working branch:** `design/atlas-expedition-clarity`  
**Baseline:** live `main` at `78e36bed22473265ee5b85d1d379bc00501528a8` (2 Nov 2026)  
**Do not publish or change live main before owner review.**  
**Creative direction:** the approved Survey × Meridian system (deep navy, rich teal, warm brass, cream) already used by web and iPhone.

## Owner feedback (from actual website screenshots)

1. When a new expedition choice is earned, the current thin notice "An expedition choice is ready" is too ordinary and does not explain what was earned or what the user should do.
2. In My Atlas, a button labelled "Europe" looks like a geographical filter; the owner questions why Europe alone gets special treatment.
3. In the list of expeditions many cards say "OPEN" despite the owner thinking they have only played one puzzle recently. Do not presume they are truly unlocked by mistake; investigate records/provenance before touching game rules or saved data.
4. Atlas screenshot shows **9/60 completed** and **2 expedition choices available**, while several expeditions show **OPEN** and a further one **YOUR CHOICE**. Distinguish these four concepts clearly.

## What the existing source actually does

- `data/regional-plan.json`: 10 expeditions, opening region `opening`, unlock thresholds `[2,5,9,14,20,27,34,42,50]` unique completed puzzles. The model permits choosing **any** locked expedition when a milestone is earned.
- `core/progression.mjs` `regionState`: `earned = thresholds.filter(t => completed >= t).length`; `spent` counts region records whose source is `player-choice`; `opportunities = min(remaining, max(0, earned-spent))`. Thus **9 completions + 1 spent choice = 2 remaining choices** is a plausible expected state, not proof of a fault.
- `initialiseRegions` can permanently grant access from **historical completions, old unfinished drafts and superseded regional-plan membership**, without spending a current choice. A returning player may legitimately have several previously open regions.
- `app.mjs` `atlas()` currently renders `r.open ? 'open' : state.opportunities ? 'eligible' : 'sealed'`; an eligible-but-locked card receives "YOUR CHOICE". It is easy to misread that styling as already opened.
- `atlas-view.mjs` `atlasControls()` always includes `europe`; `app.mjs` `moveAtlas('europe')` is solely a fixed map-camera zoom shortcut. It is **not an expedition filter or unlock rule**.
- `app.mjs` renders an `.unlock-notice` on the Play screen and another in My Atlas. Make both consistent.
- `data/regional-plan.json` still contains `approvalStatus` proposal metadata and `productionApproved: false`; **do not silently alter**. Audit whether it is stale metadata from the released plan, and report separately if material.

## Implement: a clear earned-expedition moment

Treat a new choice as a valuable milestone, not merely a small status message. Rework the existing `.unlock-notice` treatment in My Atlas and Play using the established website visual language.

Example English copy (refine as needed, with natural equivalent French):
- Eyebrow: "NEW EXPEDITION CHOICE"
- Heading: "Your next expedition awaits"
- Description: "You've earned a choice of where to explore next. Open one expedition permanently."
- Primary action: "Choose an expedition"
- For multiple unspent choices, say the count clearly, e.g. "2 choices ready" but avoid implying two new choices were just earned in the current session.

Keep the card concise, responsive and clearly differentiated. No auto-opening, new popups, forced modal, flashing celebration or animation trigger. **A choice is not the same as an unlocked expedition.** Reuse existing navigation/choice logic; do not award extra choices.

## Implement: expedition-state clarity

Maintain actual state and access. Present distinctions unmistakably:
- **COMPLETED** — all its charts finished.
- **OPEN / IN PROGRESS** — the expedition is legitimately available; remaining charts playable.
- **AVAILABLE TO UNLOCK** — a choice is available to spend, but region is not yet open. Emphasise the intentional "Unlock this expedition" action; no `OPEN` label.
- **SEALED** — unavailable until another milestone, no implicit play access.

If historical access is detected, show a small grounded explanation such as "Previously opened" where provenance supports it; do not downgrade or revoke that access.

Avoid labelling every locked expedition "YOUR CHOICE" as if it were already selected. A selection highlight should be separate from the underlying status. Preserve accessible state labels in EN/FR and selected focus treatment.

The current cards are long. Refine visual treatment and hierarchy without making a new dashboard or changing which expeditions are accessible.

## Implement: map navigation clarity

Remove the misleading **Europe** shortcut from primary Atlas controls. Optional replacement **Focus on selected expedition** is better **only** if it can use existing saved expedition geography/normal map camera without revealing locked answers or interfering with map gestures. `app.mjs` already includes `chosenGeography(id)` for a region bounding rectangle; reuse responsibly if adding a focus action.

Preserve +/−, directional pan and Whole atlas, keyboard/zoom behavior, markers, earned coverage and map data. "Puzzles / Expeditions / Discoveries" are map-view toggles, not filters of eligibility; make them understandable without changing their behavior.

## Audit progression without altering player data

1. Run a **new empty-store** scenario: initially just opening expedition open; 1 completed => no new choice; 2 => one choice; 5 => two earned total; 9 => three earned total.
2. Test one spent choice, two unspent choices, and migration of historical completion/draft/previous-plan unlocks. Distinguish the button labels/card styling in each scenario.
3. For the user's real returning-player state, **if authorised local browser access is available**, inspect progression **read-only**. Report only aggregate counts and region-open provenance (record `source`: `opening`, `player-choice`, `migrated-availability`, `historical-completion`, `historical-draft`; plus `evidenceRecord` type when present). Do not export/share the owner's raw save or identifying data. Do not claim to have inspected it if inaccessible.
4. Specifically reconcile screenshot counts **9 completed**, **2 choice opportunities**, number of actual open regions, and their provenance. The player says they only played one puzzle recently; this can coexist with nine cumulative saved completions, but verify rather than assert.
5. Make **zero changes** to unlocking thresholds, `initialiseRegions`, historical records, completed count, SQLite/IndexedDB/localStorage or save IDs until a separate diagnosed and approved change is necessary. No resets, mass relocking or migration rewrite.

## Regression and deliverables

- Implement actual code on this working branch; not only a report or a static mockup.
- Provide working **local preview** with actual before/after screenshots, desktop + iPhone dimensions, English and French, empty player, in-progress player, one available choice, multiple choices and returning player with legitimate historical opens.
- Run current tests plus focused `regionState` / `initialiseRegions` / `chooseRegion` / `canPlay` scenarios; check milestone eligibility, permanent unlock, completion, navigation and save/reload.
- Confirm map navigation, Atlas view toggles, earning and spending choices, saved progress and other gameplay unchanged.
- Clearly list code files modified, precise state/provenance findings, any unverified areas and rollback baseline.
- Stop at owner review. **No merge, GitHub Pages deployment or iOS app changes.**

## Non-negotiable

**Make progress understandable and the next expedition choice feel rewarding, without changing the progression rules or existing player entitlements.**
