import {CAMPAIGN} from './config.mjs';
import {hasEntered,rememberEntry,correctCode} from './state.mjs';

let storage;
try { storage=localStorage; } catch { /* Restricted browsers can still play this visit. */ }

const show=()=>document.documentElement.removeAttribute('data-campaign-booting');

async function openGame(language) {
  // Let the native app decide whether this is a new or returning player.
  // A campaign marker is never imported as a game preference or achievement.
  let observer,timer;
  const ready=language==='fr'&&!location.hash?new Promise(resolve=>{
    observer=new MutationObserver(()=>{
      if(document.querySelector('.story-reader,#graphMap,#atlasMap,.loading button'))resolve();
    });
    observer.observe(document.querySelector('#main'),{childList:true,subtree:true});
    timer=setTimeout(resolve,15000);
  }):null;
  try {
    await import('../app.mjs');
    if(ready) {
      await ready;
      // Language handoff occurs only after the native first-player story decision.
      if(document.querySelector('.story-reader')&&document.documentElement.lang!=='fr') {
        await new Promise(resolve=>{
          const changed=new MutationObserver(()=>{
            if(document.documentElement.lang==='fr'){changed.disconnect();clearTimeout(timeout);resolve();}
          });
          changed.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
          const timeout=setTimeout(()=>{changed.disconnect();resolve();},2000);
          document.querySelector('#language').click();
        });
      }
    }
  } finally {
    observer?.disconnect();clearTimeout(timer);show();
  }
}

async function sealAtlas() {
  const {entrance}=await import('./entrance.mjs');
  const title=document.title,originalLanguage=document.documentElement.lang;
  const shell=document.createDocumentFragment();
  shell.append(...document.body.childNodes);
  const host=document.createElement('div');
  host.id='sealed-atlas';
  const shadow=host.attachShadow({mode:'open'});
  const style=document.createElement('link');
  style.rel='stylesheet';style.href=new URL('./style.css',import.meta.url).href;
  const styled=new Promise(resolve=>{style.onload=resolve;style.onerror=resolve;});
  shadow.append(style);document.body.append(host);
  let language;
  try { language=new URL(location.href).searchParams.get('lang'); } catch {}
  if(!['en','fr'].includes(language))language=navigator.language?.startsWith('fr')?'fr':'en';

  function render() {
    const content=document.createElement('div');content.innerHTML=entrance(language);
    shadow.querySelector('.sealed-shell')?.remove();
    shadow.append(content.firstElementChild);
    document.documentElement.lang=language;
    document.title=language==='fr'?'Geodots · L’ATLAS EST SCELLÉ':'Geodots · THE ATLAS IS SEALED';
    const form=shadow.querySelector('#unlock'),input=shadow.querySelector('#code'),error=shadow.querySelector('#error');
    shadow.querySelector('.language').addEventListener('click',event=>{
      event.preventDefault();language=language==='fr'?'en':'fr';render();
      shadow.querySelector('.language').focus();
    });
    shadow.querySelector('.skip').addEventListener('click',event=>{
      event.preventDefault();shadow.querySelector('#entrance').focus();
    });
    input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');error.textContent='';});
    let opening=false;
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(opening||!form.reportValidity())return;
      const value=input.value;input.value='';
      if(!correctCode(value,CAMPAIGN)) {
        input.setAttribute('aria-invalid','true');
        error.textContent=language==='fr'?'L’Atlas reste scellé.':'The Atlas remains sealed.';
        input.focus();return;
      }
      opening=true;form.querySelector('button').disabled=true;
      rememberEntry(storage);
      shadow.querySelector('.sealed-shell').classList.add('is-unlocking');
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,180));
      document.documentElement.setAttribute('data-campaign-booting','');
      host.remove();document.body.append(shell);
      document.title=title;document.documentElement.lang=originalLanguage;
      await openGame(language);
    });
  }
  render();await styled;show();
}

if(CAMPAIGN.campaignPasscodeEnabled&&!hasEntered(storage))await sealAtlas();
else { show();await openGame(); }
