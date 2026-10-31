/** Presentation-only finish over the approved geometry. Revelation returns the original SVG. */
import {createIllustrator as approvedIllustrator} from './illustration.mjs';
export function createIllustrator(options){
 const approved=approvedIllustrator(options);
 return (kind,language)=>{
  let svg=approved(kind,language);
  if(kind==='revelation')return svg;
  svg=svg.replace('class="finale-atlas-art ', 'class="finale-atlas-art craft-atlas ');
  svg=svg.replace('<defs>',`<defs>
   <filter id="craft-book-shadow" x="-20%" y="-15%" width="140%" height="145%" color-interpolation-filters="sRGB"><feDropShadow dx="2" dy="15" stdDeviation="10" flood-color="#020c12" flood-opacity=".55"/></filter>
   <linearGradient id="craft-left-page" x1="0" y1="0" x2="1" y2=".2"><stop stop-color="#63807b" stop-opacity=".16"/><stop offset=".7" stop-color="#496463" stop-opacity=".02"/><stop offset="1" stop-color="#061721" stop-opacity=".36"/></linearGradient>
   <linearGradient id="craft-right-page" x1="0" y1=".2" x2="1" y2="0"><stop stop-color="#04151e" stop-opacity=".32"/><stop offset=".12" stop-color="#a5b8a0" stop-opacity=".08"/><stop offset=".8" stop-color="#92a891" stop-opacity=".04"/><stop offset="1" stop-color="#25404a" stop-opacity=".1"/></linearGradient>
   <linearGradient id="craft-gutter"><stop stop-color="#29414a" stop-opacity="0"/><stop offset=".45" stop-color="#06141d" stop-opacity=".8"/><stop offset=".55" stop-color="#0a1b25" stop-opacity=".8"/><stop offset="1" stop-color="#829c8e" stop-opacity=".12"/></linearGradient>
   <linearGradient id="craft-cover-edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#101f29"/><stop offset=".28" stop-color="#446064"/><stop offset=".55" stop-color="#162c37"/><stop offset="1" stop-color="#081923"/></linearGradient>`);
  svg=svg.replace('<g class="finale-open-book">','<g class="finale-open-book crafted-book">');
  svg=svg.replace('<path class="finale-pages"',`<path class="craft-page-block" d="M63 605 431 634q29-12 58 0l369-29v17l-369 29q-29-12-58 0L63 622Z"/><path class="finale-pages"`);
  svg=svg.replace('<path class="finale-page-rule" d="m86',`<path class="craft-page-left" d="M66 100 431 71q19 5 28 7v548q-14-4-28 4L66 607Z"/><path class="craft-page-right" d="M460 78q14 1 28-7l366 29v507l-366 23q-18-8-28-4Z"/><path class="finale-page-rule" d="m86`);
  svg=svg.replace('<path class="finale-spine" d="M459 86v535"/>',`<path class="craft-gutter" d="M446 77q14 5 28 0l-1 550q-13-8-27 0Z"/><path class="craft-sewn-fold" d="M460 88q-5 267 0 529"/>`);
  svg=svg.replace('<path class="finale-index-lines"',`<path class="craft-leaf-edges" d="m72 615 360 29q28-12 56 0l360-29m-776 5 360 29q28-12 56 0l360-29"/><path class="finale-index-lines"`);
  svg=svg.replace('<g class="finale-closed-book">','<g class="finale-closed-book crafted-book"><path class="craft-cover-binding" d="m202 111 25 4 21 507-46-11Z"/>');
  svg=svg.replace('<path class="finale-page-rule" d="m235', '<path class="craft-cover-gleam" d="m224 119 465-27 1 5-463 27Z"/><path class="finale-page-rule" d="m235');
  return svg;
 };
}
