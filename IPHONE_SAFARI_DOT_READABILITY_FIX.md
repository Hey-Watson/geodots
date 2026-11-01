# Geodots — iPhone Safari chart-dot readability correction

**Status:** Confirmed physical-device usability regression reported by owner after Survey × Meridian visual refresh. **Not yet implemented or deployed.**

**Target:** `Hey-Watson/geodots`, branch `fix/iphone-safari-chart-dots` from deployed `dfdcbcd523421e01a90a2c84c0e05f473047dd86`.
**Owner evidence:** iPhone Safari screenshot from 1 November 2026 (IMG_4721.jpg) showing Puzzle 01. Numbered dots and 01–06 numeral labels are too small inside a large chart frame. The screenshot shows much unused chart space; the map is not comfortably playable on a phone.

## Root cause confirmed in website source
- `app.mjs`, `graphSVG()` creates a chart SVG with `viewBox="${S.zoom.x} ${S.zoom.y} ${S.zoom.w} ${S.zoom.h}"`. Normal initial camera is `900×580`, while the SVG is rendered much narrower on Safari iPhone.
- Node radii/number text use inline SVG-space variables `--ring`, `--number`, `--hit`. In `style.css`, `.graph-node .node-ring{r:var(--ring,16px)}` and `.graph-node .node-number{font-size:var(--number,12px)}`. Those values shrink with the entire 900-unit chart when displayed at phone width.
- On Puzzle 01 this makes the centres, rings and 01–06 labels tiny. Colours alone will not solve this. The SVG also leaves generous space that can be used to present the geographic topology more clearly.

## Fix required
**Make the default mobile chart comfortably readable and tappable, without requiring an initial zoom gesture.**

- Aim for approximately **32–40 CSS-pixel visible numbered-dot diameter**, readable **14–18 CSS-pixel numerals**, and **≥44 CSS-pixel effective touch targets** on an iPhone where geography allows. Work in rendered screen units, not merely SVG user units; verify actual `getBoundingClientRect()` measurements.
- Keep the underlying actual nodes, geographical relative positions, edges, ordering, labels, answer correctness, and interaction semantics unchanged. Do **not** replace the geography with an illustrative layout.
- Use the available chart area intelligently. A default camera fit / visual scale adjustment may be appropriate on mobile, provided the whole graph remains visible (including extrema), the north marker does not distract, and pan/zoom/Fit/Reset still behave as before.
- Do not just enlarge dot rings in place if that would overlap or cause overlapping invisible tap targets. For close nodes (e.g. Puzzle 48 points 4/5), retain or improve existing unambiguous number chooser, correct tap ownership, keyboard focus and accessibility.
- Any corrective CSS/JS change must affect **rendering / initial presentation only**. No gameplay, progression, data, saves, clue text, navigation, campaign entrance, narrative, or rewards changes. Avoid visual overflow/clipping, reflow or unexpected auto-scrolling when assigning countries.
- Preserve English and French labels, selected/assigned/focus states, colour contrast, zoom controls and map labels.

## Acceptance / regression checks
1. Capture **actual browser before/after** screenshots for Puzzle 01 and Puzzle 48 at the iPhone 16 Pro Safari-equivalent width and at a narrower phone width; include the **default unzoomed state** and assigned labels. Do not use AI-generated mockups as proof.
2. Check all sixty puzzles at mobile widths so every point is visible, every numeral readable, lines geographically faithful, no false nearest-neighbour taps. Test a sample of densest / widest puzzle arrangements by touch and keyboard.
3. Verify graph selection, reassignment, Undo, Remove, Check, label modes, zoom/pan/Reset, saved drafts/reload and language toggle. No accidental reveals.
4. Verify current desktop display remains pixel-identical if possible, and other website screens remain unchanged. Do not alter shared `svg.chart` styling that would affect the Discovery pin map.
5. Run browser-based simulated touch tests, but explicitly note that **physical iPhone Safari testing remains outstanding** until the owner checks the preview.
6. Confirm service-worker revision strategy before release; existing open Safari sessions may use an older cached CSS/JS. Do not suggest clearing progress/site data.

## Handoff
Have **Astra** implement the focused fix on this dedicated branch using the approved iPhone app's dot legibility as a design reference. Provide a playable preview, actual iPhone-width screenshots, measured ring/touch target dimensions and a concise diff and regression report. **Stop for owner review. Do not deploy or change `main` yet.**

**Success is not just a prettier chart: the numbered dots should be legible immediately on a real iPhone, with zero compromise to puzzle behaviour.**
