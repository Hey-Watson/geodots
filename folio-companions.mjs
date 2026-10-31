/** Native, stage-neutral companion engravings rebuilt from the owner's approved illustration. */
import {FOLIO_LINEWORK} from './folio-linework.mjs';
export const FOLIO_COMPANION_IDS=Object.freeze(['vessel','compass','wayfinder']);
export const FOLIO_KEYWORDS=Object.freeze({en:['Connection','Understanding','Discovery'],fr:['Connexion','Compréhension','Découverte']});
export function companionEtching(id,{x=0,y=0,width=160}={}){
 if(!FOLIO_COMPANION_IDS.includes(id))return '';
 const art=FOLIO_LINEWORK[id],[,,w,h]=art.bounds,k=Math.min(148/w,118/h),dx=(160-w*k)/2,dy=(128-h*k)/2;
 return `<g class="folio-companion-etching" data-folio-companion="${id}" transform="translate(${x} ${y}) scale(${width/160})" fill="currentColor" stroke="none" aria-hidden="true"><g transform="translate(${dx} ${dy}) scale(${k})">${art.body}</g></g>`;
}
export function companionEtchingSVG(id){return `<svg xmlns="http://www.w3.org/2000/svg" class="folio-companion-study" viewBox="0 0 160 128" width="640" height="512" style="color:#d1ad73" aria-hidden="true">${companionEtching(id)}</svg>`}
/** Replace a single known SVG group, retaining the surrounding approved book geometry. */
function withoutGroup(svg,className){
 const start=svg.indexOf(`<g class="${className}`);if(start<0)throw Error('Atlas illustration group unavailable');
 const tags=/<g\b[^>]*>|<\/g>/g;tags.lastIndex=start;let depth=0,match;
 while((match=tags.exec(svg))){depth+=match[0].startsWith('</')?-1:1;if(depth===0)return svg.slice(0,start)+svg.slice(tags.lastIndex)}
 throw Error('Incomplete Atlas illustration group');
}
function recognitionPlate(language){
 const labels=FOLIO_KEYWORDS[language==='fr'?'fr':'en'];
 return `<g class="folio-revelation-plate" aria-hidden="true"><g transform="translate(90 135) scale(${740/751})"><g class="folio-survey-engraving">${FOLIO_LINEWORK.survey.body}</g>${FOLIO_COMPANION_IDS.map(id=>{const a=FOLIO_LINEWORK[id];return `<g class="folio-companion-etching" data-folio-companion="${id}" transform="translate(${a.bounds[0]} ${a.bounds[1]})" fill="currentColor" stroke="none">${a.body}</g>`}).join('')}</g><g class="folio-symbol-keywords">${labels.map((word,i)=>`<text class="folio-symbol-word" data-companion-perspective="${FOLIO_COMPANION_IDS[i]}" x="${[219,463,704][i]}" y="582" text-anchor="middle">${word}</text>`).join('')}</g></g>`;
}
/** The recognition spread is the approved three-companion plate; the epilogue keeps its geography. */
export function sharedCompanionPlate(atlas,{ending=false,language='en'}={}){
 const plate=ending?`<g class="folio-companion-margins is-resolved" aria-hidden="true">${companionEtching('vessel',{x:127,y:465,width:155})}${companionEtching('compass',{x:709,y:94,width:108})}${companionEtching('wayfinder',{x:624,y:479,width:151})}</g>`:recognitionPlate(language);
 let svg=atlas.replace('class="finale-atlas-art ','class="finale-atlas-art folio-engraved-atlas ')
  .replace(/<path class="finale-index-lines"[^>]*\/>/,'');
 if(!ending){svg=withoutGroup(svg,'finale-world');svg=svg.replace(/aria-label="[^"]*"/,`aria-label="${language==='fr'?'Les trois compagnons gravés dans les pages de l’Atlas.':'The three companions engraved in the Atlas pages.'}"`)}
 // The artwork is physically inside the original moving page group, never an HTML overlay.
 const end=svg.indexOf('<g class="finale-closed-book'),closing=svg.lastIndexOf('</g>',end);
 if(end<0||closing<0)throw Error('Atlas page group unavailable');
 return svg.slice(0,closing)+plate+svg.slice(closing);
}
export function openingCompanionPlate(atlas,id){
 if(!FOLIO_COMPANION_IDS.includes(id))return atlas;
 const page=atlas.replace('M116 541h190m-190 20h155m-155 20h173M574 541h200m-200 20h152m-152 20h180','M116 541h190m-190 20h155m-155 20h173').replace('<circle cx="564" cy="541" r="1"/>','');
 return page.replace('</svg>',`<g class="story-companion-impression" aria-hidden="true">${companionEtching(id,{x:636,y:506,width:128})}</g></svg>`);
}
