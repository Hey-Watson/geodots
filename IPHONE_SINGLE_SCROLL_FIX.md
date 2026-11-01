# Geodots iPhone Safari — remove sliding puzzle panels and accidental chart panning
**Priority: blocking mobile gameplay usability**  
**Status:** owner-reported defect, correction required; not yet implemented or published  
**Repository:** `Hey-Watson/geodots`  
**Starting point:** live `main` at `2f853e8`  
**Working branch:** `fix/iphone-single-scroll-solving`

## What the owner has reported — do not reinterpret
Physical iPhone Safari screenshots from 1 November 2026 show:
1. **Clues are a fixed-height inner vertical scroller**, hiding clue 1 while clues 2 and 3 appear. The owner has REPEATEDLY rejected clue sliders/carousels/scrollable panels. ALL clues must be exposed as ordinary content in the page.
2. **Country choices are another inner scroller**, with a secondary scrollbar and clipping at its bottom. The numbered-point selector also scrolls horizontally on narrow screens. The owner rejects all sliding choice panels. ALL numbers and ALL country choices must be fully visible within ordinary document flow.
3. **One-finger vertical swipes starting over the chart move/zoom/pan the chart instead of scrolling the page**, leaving the diagram off-centre or clipped. This prevents normal mobile scrolling to the clues/countries. On iPhone a normal swipe must scroll the PAGE; the chart must remain stable except after an intentional map control interaction.

**These are not visual polish issues. Fix the interaction model.** The previous 36px dots / 16px numbers / 44px targets are approved and must stay.

## Confirmed code causes
- `style.css` uses fixed inner heights and `overflow:auto`: `.continuous-play .workspace-notes .clue-list` (e.g. 118px), `.continuous-play .names-pane .place-tray` (e.g. 94px), `.dot-selector` with `overflow:auto`, plus narrow-screen overrides. Remove these constraints *on iPhone* and let their combined contents determine document height.
- `style.css` globally assigns `svg.chart { touch-action:none }`. Scope the puzzle SVG to permit native one-finger page scrolling; DO NOT affect Discovery map semantics.
- `app.mjs` `bindMaps()` attaches pointerdown/pointermove, captures pointers on chart background, and changes `S.zoom` on single-finger movement. On mobile puzzle charts, this needs a touch-mode guard so vertical page swipes never mutate `S.zoom` or trigger selection. Preserve deliberate tapping of numbered dots and the plus/minus/Reset chart controls.

## Explicit acceptance criteria
- Puzzle 01: all three clues visible in order, six numbered choices fully visible, six country buttons fully visible. No inner vertical/horizontal scroll region, clipped row or offscreen carousel. Content may make the MAIN PAGE taller.
- Puzzle 48 and all sixty puzzles: all available clues, all numbered choices and all country options in natural page flow. Long country names wrap; sensible two-column or adaptive layout on 375–430px devices; do not make text smaller to force fitting.
- A vertical finger swipe anywhere (including over the chart) scrolls the document smoothly. **A single finger must not inadvertently pan the map**. A tapped number still selects accurately. Existing zoom buttons/Reset work and deliberate pan/zoom remains available through an interaction that does not steal one-finger page scroll (e.g., intentional two-finger gesture or clearly initiated control, if appropriate).
- Never zoom the map or displace the camera as a side effect of reading clues, scrolling, selecting countries or checking. No cropped graph after normal swipes.
- Keep 36px visible dots, 16px numerals, 44px touch targets as appropriate for mobile and protect precise dense-point selection.
- No change to solutions, clues, content, map geography/anchors, unlocking, save IDs, assignments/Undo/Check, results, rewards, EN/FR, or narrative. Desktop visuals and mouse/trackpad behaviour should remain unchanged.

## Implementation instructions to Astra
1. Implement this fix in actual code on this branch, not another analysis or mockup.
2. Remove nested scroll CSS from the MOBILE puzzle workspace (clue list, point selector, place tray). Make all of them naturally sized; respect long EN/FR text and no sideways overflow.
3. Correct the mobile puzzle-only chart touch handling: one-finger vertical page scroll gets priority, without altering Discovery pin maps. Re-centre the chart/reset after map interactions; preserve clickable dots.
4. Test real browser interactions on iPhone-sized WebKit, not just screenshots: long vertical swipe starting on chart; normal scroll to clues then all countries; select, assign, reassign, undo, wrong/correct Check, zoom +/-/Reset; try 48's close dots and longer French clues.
5. Capture genuine 390×844 and 375×667 screenshots showing full scrolling page in appropriate top/bottom states. Confirm all clues/countries are reachable as document sections rather than separate scrollers.
6. Regression test all 60 charts, EN/FR, desktop and saved progress. Audit service worker cache so revised CSS/JS is delivered without deleting browser storage. Include the exact changed files and results.
7. Supply a working **iPhone-accessible preview** (a `127.0.0.1` address alone will not work on the phone; use an appropriately reachable local preview with documented address if available).
8. **Stop for owner review before replacing live website**. Do not push, merge or deploy without approval.

**Pass/fail:** The user can scroll naturally from map to clues to countries using a single finger anywhere on the page. There are NO nested sliding panels. The map never accidentally moves while scrolling.
