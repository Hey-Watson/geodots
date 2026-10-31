import {appearanceKey,companionRevelation,companionUnity} from '../companion-presence.mjs';
import {narrative,sequences} from './content.mjs';
import {compassRose} from './illustration.mjs';
import {createIllustrator} from './craftsmanship.mjs';
import {concealedFolio,openFolioSheet,folioSeal} from './folio-opening.mjs';
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountFinale(root,{kind='restored',startAtChoices=false,language='en',reduced=false,companion=null,features,puzzles,plan,chartedEntities,labels=[],choices=false,chapter=false,onExit=()=>{},onChoices=()=>{},onExplore=()=>{},onFolio=()=>{},onEpilogue=()=>{},onFinish=()=>{}}={}){
 let index=kind==='restored'&&startAtChoices?sequences.restored.length-1:0,unfolding=false,prefs={language,reduced,companion},destroyed=false,acting=false,opening=null;
 const local=(en,fr)=>prefs.language==='fr'?fr:en,art=createIllustrator({features,puzzles,chartedEntities,labels});
 if(!document.querySelector('link[data-finale-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('finale.css',import.meta.url);link.dataset.finaleStyle='';document.head.append(link)}
 const button=(label,action,classes='')=>`<button type="button" data-finale="${action}" class="${classes}">${E(label)}</button>`;
 function paragraphs(copy,indices){return indices.map(i=>{
  let value=E(copy.paragraphs[i]);
  if(kind==='restored'&&i===4){const words=local('why did Elias and Inès leave their extraordinary work unfinished?','pourquoi Elias et Inès ont-ils laissé leur œuvre extraordinaire inachevée ?');value=value.replace(E(words),`<strong>${E(words)}</strong>`)}
  if(kind==='folio'&&i===9){const sentence=local('It should awaken the desire to discover.','Il devrait éveiller en lui le désir de découvrir.');value=value.replace(E(sentence),`<span class="letter-desire">${E(sentence)}</span>`)}
  const reflection=kind==='folio'&&i===10?' letter-reflection':'';
  const bold=kind==='restored'&&[2,11].includes(i)||kind==='folio'&&[12,16,18].includes(i)||kind==='epilogue'&&[6,9].includes(i);
  const signature=kind==='folio'&&i>=15;
  return `<p data-narrative-line="${i}" class="${signature?'finale-signature-line signature-'+i:''} ${bold?'finale-emphasis':''}${reflection}">${bold?`<strong>${value}</strong>`:value}</p>`;
 }).join('')}
 function render(focus=true){
  if(destroyed)return;opening?.finish();opening=null;const copy=narrative[prefs.language][kind],page=sequences[kind][index],last=index===sequences[kind].length-1,inscription=page.art==='inscription';
  const discovering=kind==='folio'&&index===0,openingNow=kind==='folio'&&index===1&&unfolding&&!prefs.reduced;
  const illustration=discovering?concealedFolio(art('hidden',prefs.language)):kind==='folio'&&index===1?`<div class="folio-origin folio-empty-cover">${concealedFolio(art('letter',prefs.language))}</div>`:kind==='folio'&&index===5?companionRevelation(art(page.art,prefs.language),prefs.companion,prefs.language):art(page.art,prefs.language);
  const navigation=`<nav class="finale-page-navigation" aria-label="${local('Story navigation','Navigation dans le récit')}">${page.choices?button(local('Revisit the story','Revoir le récit'),'revisit','finale-previous'):index?button('← '+local('Previous page','Page précédente'),'previous','finale-previous'):'<span></span>'}${page.choices?'':button(last?(kind==='folio'?local('Fold the letter','Replier la lettre'):local('Return to My Atlas','Revenir à mon Atlas')):(kind==='folio'&&index===0?local('Unfold the letter','Déplier la lettre'):kind==='epilogue'&&index===0?local('Open the Atlas','Ouvrir l’Atlas'):local('Turn the page','Tourner la page')),last?(kind==='folio'?'epilogue':'finish'):'next','primary')}</nav>`;
  let passage=paragraphs(copy,page.lines);
  if(page.choices){const p=copy.paragraphs;passage=paragraphs(copy,[6])+`<div class="finale-two-choices">${[['explore',7,8],['folio',9,10]].map(([action,title,description],i)=>`<button class="finale-choice" type="button" data-finale="${action}"><span class="choice-engraving" aria-hidden="true">${i===0?compassRose():`<svg viewBox="0 0 100 90"><path d="m14 23 65-8 7 55-65 8Z"/><path d="m14 23 36 19 29-27M21 78l28-26 37 18"/></svg>`}</span><span class="choice-copy"><strong data-narrative-line="${title}">${E(p[title])}</strong><span data-narrative-line="${description}">${E(p[description])}</span></span><span class="choice-arrow" aria-hidden="true">→</span></button>`).join('')}</div>`+paragraphs(copy,[11])}
  root.innerHTML=`<section class="finale-reader finale-${kind} scene-${page.art}${prefs.reduced?' finale-still':''}${openingNow?' folio-opening':''}" data-finale-kind="${kind}" data-finale-page="${index}" aria-labelledby="finale-title">
   <div class="finale-toolbar">${button(local('Return to My Atlas','Revenir à mon Atlas'),'exit')}${kind!=='restored'&&choices?button(local('The restored Atlas','L’Atlas restauré'),'choices'):''}</div>
   <header class="finale-heading"><h1 id="finale-title">${E(copy.title)}</h1></header>
   ${inscription?`<div class="finale-inscription">${companionUnity(art('reopened',prefs.language),prefs.companion)}<div class="inscription-rose">${compassRose()}</div><article class="finale-passage" tabindex="-1" role="group" aria-label="${local('The final inscription','L’inscription finale')}">${passage}</article>${navigation}${chapter?button(local('Explore The Uncharted World','Explorer le Monde inexploré'),'explore','finale-explore-again'):''}</div>`:
   `<div class="finale-spread"><div class="finale-artwork">${illustration}</div><div class="finale-reading-column"><article class="finale-passage${kind==='folio'&&index>0?' finale-letter-reading':''}" tabindex="-1" role="group" ${kind==='folio'&&index===5?'aria-describedby="companion-perspectives-caption"':''} aria-label="${local('Story, passage','Récit, passage')} ${index+1} ${local('of','sur')} ${sequences[kind].length}">${openingNow?'<span class="folio-paper-sheen" aria-hidden="true"></span>'+folioSeal():''}${passage}</article>${navigation}</div></div>`}
   ${page.art==='reopened'?`<div class="finale-expedition-impressions" aria-label="${local('The ten restored expeditions','Les dix expéditions restaurées')}">${plan.regions.map((r,i)=>`<div><span aria-hidden="true">${['I','II','III','IV','V','VI','VII','VIII','IX','X'][i]}</span><span>${E(r.title[prefs.language])}</span></div>`).join('')}</div>`:''}
  </section>`;
  if(openingNow)opening=openFolioSheet(root.querySelector('.finale-reader'));
  unfolding=false;
  if(focus){root.querySelector('.finale-passage').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'})}
 }
 const abort=new AbortController();
 root.addEventListener('click',async event=>{
  const target=event.target.closest('[data-finale]');if(!target||acting)return;event.stopPropagation();const action=target.dataset.finale;
  if(action==='revisit'&&kind==='restored'){index=0;render();return}
  if(action==='next'||action==='previous'){unfolding=kind==='folio'&&index===0&&action==='next';index=Math.max(0,Math.min(sequences[kind].length-1,index+(action==='next'?1:-1)));render();return}
  const callbacks={exit:onExit,choices:onChoices,explore:onExplore,folio:onFolio,epilogue:onEpilogue,finish:onFinish};
  if(callbacks[action]){acting=true;target.disabled=true;try{await callbacks[action]()}finally{acting=false;if(target.isConnected)target.disabled=false}}
 },{signal:abort.signal});
 render();return{showChoices(){if(kind==='restored'){index=sequences.restored.length-1;render()}},setPreferences(next){if(next.language===prefs.language&&next.reduced===prefs.reduced&&appearanceKey(next.companion)===appearanceKey(prefs.companion))return;const refocus=kind==='folio'&&index<=1&&root.contains(document.activeElement),action=document.activeElement?.dataset.finale;prefs=next;render(false);if(refocus)(action?root.querySelector(`[data-finale="${action}"]`):root.querySelector('.finale-passage'))?.focus({preventScroll:true})},destroy(){opening?.finish();opening=null;destroyed=true;abort.abort()}};
}
