/** Presentation only. The caller supplies the existing earned, visible evolution stage. */
import {PEOPLE} from './copy.mjs';
import {companionEtchingSVG,openingCompanionPlate,sharedCompanionPlate,FOLIO_KEYWORDS} from './folio-companions.mjs';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const COMPANION_IDS=Object.freeze(['vessel','compass','wayfinder']);
export const COMPANION_PERSPECTIVES=FOLIO_KEYWORDS;
export const appearanceStage=appearance=>Number.isInteger(appearance?.stage)&&appearance.stage>=0&&appearance.stage<=3?appearance.stage:0;
export const appearanceKey=appearance=>`${COMPANION_IDS.includes(appearance?.id)?appearance.id:''}:${appearanceStage(appearance)}`;
function artwork(id,appearance){return `<img src="${new URL(`assets/${id}-${appearanceStage(appearance)+1}.jpg`,import.meta.url).href}" alt="" decoding="async">`}
export function companionPresence(appearance,placement=''){
 if(!COMPANION_IDS.includes(appearance?.id))return '';
 return `<span class="companion-presence ${E(placement)}" data-companion-presence="${appearance.id}" data-companion-stage="${appearanceStage(appearance)}" aria-hidden="true">${placement==='uw-companion'?companionEtchingSVG(appearance.id):artwork(appearance.id,appearance)}</span>`;
}
/** A first visit glimpses the companions separately; a chosen companion stays the only presence. */
export function openingCompanion(atlas,appearance,scene){
 const glimpses={unfinished:'vessel',inheritance:'compass',continuation:'wayfinder'};
 if(!glimpses[scene])return atlas;
 const id=COMPANION_IDS.includes(appearance?.id)?appearance.id:glimpses[scene];
 return openingCompanionPlate(atlas,id);
}
/** Visible keywords are printed in the Atlas; the hidden caption gives their complete accessible associations. */
export function companionRevelation(atlas,appearance,language='en'){
 const lang=language==='fr'?'fr':'en';
 return `<figure class="companion-revelation" aria-label="${lang==='fr'?'Les trois compagnons':'The three companions'}"><div class="companion-engraved-world" aria-hidden="true">${sharedCompanionPlate(atlas,{language:lang})}</div><figcaption class="sr-only" id="companion-perspectives-caption">${COMPANION_IDS.map((id,i)=>`<span class="companion-perspective-word"><span class="sr-only">${E(PEOPLE[id][lang])} — </span>${COMPANION_PERSPECTIVES[lang][i]}</span>`).join('<span class="perspective-divider" aria-hidden="true"> · </span>')}</figcaption></figure>`;
}
/** Closing tableau: the same three printed forms, resolved within the restored Atlas. */
export function companionUnity(atlas,appearance){
 return `<div class="companion-unity" aria-hidden="true">${sharedCompanionPlate(atlas,{ending:true})}</div>`;
}
