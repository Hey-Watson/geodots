import{appearanceKey,openingCompanion}from'../companion-presence.mjs';
import{passages,titles}from'./content.mjs';
import{storyIllustration}from'./illustration.mjs';
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountStory(root,{features,language='en',reduced=false,companion=null,onOpen=()=>{},onSkip=onOpen}={}){
 let index=0,prefs={language,reduced,companion},destroyed=false;
 const local=(en,fr)=>prefs.language==='fr'?fr:en;
 function render(focus=false){
  if(destroyed)return;const page=passages[index],last=index===passages.length-1;
  let copy=E(page[prefs.language]);
  if(index===1){const phrase=local('Elias Vale, a brilliant cartographer, and Inès Varenne, a passionate historian','Elias Vale, un brillant cartographe, et Inès Varenne, une historienne passionnée');copy=copy.replace(E(phrase),`<strong>${E(phrase)}</strong>`)}
  root.innerHTML=`<section class="story-reader${prefs.reduced?' story-still':''}" data-story-page="${index}" aria-labelledby="story-title">
   <header class="story-heading"><h1 id="story-title">${titles[prefs.language]}</h1><button class="story-skip" type="button" data-story="skip">${local('Skip introduction','Passer l’introduction')}</button></header>
   <div class="story-spread"><div class="story-artwork">${openingCompanion(storyIllustration(features,page.art,prefs.language),prefs.companion,page.art)}</div><div class="story-reading-column"><article class="story-passage${last?' story-question':''}" tabindex="-1" role="group" aria-label="${local('Introduction, passage','Introduction, passage')} ${index+1} ${local('of','sur')} ${passages.length}"><p>${last?`<strong>${copy}</strong>`:copy}</p></article>
    <nav class="story-navigation" aria-label="${local('Story navigation','Navigation dans le récit')}">${index?`<button class="story-previous" type="button" data-story="previous">← ${local('Previous page','Page précédente')}</button>`:'<span></span>'}<button class="primary" type="button" data-story="${last?'open':'next'}">${last?local('Open the Atlas','Ouvrir l’Atlas'):local('Turn the page','Tourner la page')}<span aria-hidden="true"> →</span></button></nav>
   </div></div></section>`;
  if(focus){root.querySelector('.story-passage').focus({preventScroll:true});if(innerWidth<761)root.querySelector('.story-heading').scrollIntoView({block:'start',behavior:'instant'})}
 }
 const abort=new AbortController();root.addEventListener('click',event=>{const button=event.target.closest('[data-story]');if(!button)return;event.stopPropagation();if(button.dataset.story==='skip')onSkip();else if(button.dataset.story==='open')onOpen();else{index=Math.max(0,Math.min(passages.length-1,index+(button.dataset.story==='previous'?-1:1)));render(true)}},{signal:abort.signal});
 render(true);
 return{setPreferences(next){if(next.language===prefs.language&&next.reduced===prefs.reduced&&appearanceKey(next.companion)===appearanceKey(prefs.companion))return;prefs=next;render()},destroy(){destroyed=true;abort.abort()}};
}
