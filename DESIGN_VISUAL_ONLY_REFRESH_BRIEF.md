# GEODOTS — Survey × Meridian website visual-only refresh
**Status:** Owner-approved design exploration. **Do not deploy.**  
**Repository:** `Hey-Watson/geodots`  
**Working branch:** `design/survey-meridian-visual-refresh` (branched from approved live `main` at `ed2cb7db6198bc559d1bc123629bff39db82db0f`)  
**Creative direction:** Use the final approved Astra Survey × Meridian *iPhone* interactive prototype, its actual screenshots and `IMPLEMENTATION_HANDOFF.md`, as authoritative references. Keep the existing GEODOTS wordmark and icon.

## Owner decision
Bring the website's **design, colours, and visual treatment** into line with the approved iPhone app **without changing any functionality, interactions, behaviour, layouts or navigation flow**. This is a visual skin, **not** the website adopting the phone's screen layout.

## Scope — appearance only
- Establish shared navy / rich teal / cream / warm brass palette, correct type scale, subtle depth and consistent visual states from the approved iPhone reference (do not invent a second design system).
- Update colours, borders, radii, surface treatment, typography presentation, shadows, chart styling, focus/hover/selected/disabled appearance, spacing *only where it does not change underlying layout or content placement*.
- Style all existing surfaces coherently: campaign/secret-code entry, play/chart/clues/countries, Atlas and expedition UI, Cabinet and twenty earned-only Discoveries, companions, introduction, Uncharted World, Final Folio and ending, settings, dialogs, responsive layouts.
- Maintain visual hierarchy and readability on **desktop, tablet and mobile**, not only a narrow phone mock.
- Preserve approved illustrations, logo/wordmark, existing narrative artwork and earned/concealed reveal rules. Avoid unnecessary glow, fantasy, mysticism or decorative maps.

## Out of scope: PROTECTED / NO CHANGES
- Gameplay/solution/validation logic; all 60 clues, edges, coordinates and countries.
- Touch, mouse, keyboard, scrolling, pinch/zoom, drag, Undo, Check, animation timings/sequences, replay, outcomes, navigation, modal/focus behaviour, EN/FR switching, sound, persistence, stores or unlock flow.
- Any responsive breakpoint changes that alter which controls appear, section order, number of visible choices or interaction.
- Page information architecture, route names/hash navigation, text/content/copy, accessibility semantics or DOM IDs/classes used by JS (style existing selectors instead).
- Atlas progress, 10 expeditions, 20 Landmark Discoveries and earned-only concealment, companion evolution, twenty islands and Trace → Reveal → Place, introduction/finale sequencing and wording.
- GitHub Pages deployment configuration, CNAME, live site, app source, production `main`. Do not push/merge/deploy without owner approval.

## Working method
1. Inspect existing UI source and old CSS before edits: `index.html`, `style.css`, `atlas.css`, `companion-presence.css`, `story/story.css`, `finale/finale.css`, `uncharted/chapter.css`, `campaign/style.css`. The marketing entry is styled inside a Shadow DOM and must be treated separately.
2. Inspect approved iPhone visual references and extract a **named colour/typography/surface token mapping**, with before → after examples. Do **not** blindly port mobile layout/interaction CSS.
3. Implement in CSS wherever possible. If a non-CSS change is indispensable, explain why before changing it; no behavioral JS edits.
4. Build the branch for **local preview only**, not live publication. Check visual continuity across all existing screens, stages and reward states, including EN/FR, sealed/earned, incomplete/completed, small and wide screens.
5. Audit for contrast, legibility, visible keyboard focus, reduced motion and charts. Preserve touch targets and map geography.
6. Take matched **before/after** actual browser screenshots for desktop 1440×900, tablet ~1024×768 and mobile ~390×844, including puzzle, Atlas, Cabinet, companion, narrative, Uncharted World and entry. Demonstrate real screenshots, not AI-generated new interpretations.
7. Regression-check exact interactions: select/assign/reassign/Undo/Check, chart zoom/pan, progression, save/reload, region unlock, earned-only art, chapter number tracing, island placement, finale and EN/FR. Do not silently change original gameplay during testing.
8. Check offline/service-worker behaviour: existing `sw.js` caches `style.css` and selected assets. **Do not modify the cache or activate a new worker on the live site before approval**. Record the cache versioning needed for an eventual authorised release.

## Deliverables for owner
- Branch-only changes and explicit file inventory/diff; confirm nonvisual engine/data/content remains identical.
- Side-by-side actual screenshots and preview instructions that work without touching production, plus any known fidelity gaps.
- Focused interaction/regression results with honest limitations (do not claim real browser/device testing without doing it).
- A succinct owner review checklist and specific open questions only if material.
- **Stop for approval. Do not merge, deploy, modify the website domain, or update iOS.**

## Acceptance test
**The website should LOOK like it belongs to the iPhone app and behave EXACTLY like the current live website.**
