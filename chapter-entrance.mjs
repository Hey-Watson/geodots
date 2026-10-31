/** Read-only release policy. Historical main completions count; bonus records do not. */
export function journeyAvailability({features,mainIds=[],completedIds=[],simulation=false}){
 const main=new Set(mainIds),done=new Set(completedIds);
 const eligible=!simulation&&main.size===60&&[...main].every(id=>done.has(id));
 const chapter=eligible&&features?.unchartedWorld===true,finale=eligible&&features?.seriesOneFinale===true;
 return {eligible,chapter,finale,choices:chapter&&finale};
}
export function chapterEntrance(options){
 if(options.simulation)return 'hidden';
 const {chapter,finale}=journeyAvailability(options),features=options.features;
 if(chapter||finale)return 'unlocked';
 return features?.sealedFolioTeaser===true||features?.unchartedWorld===true||features?.seriesOneFinale===true?'locked':'hidden';
}
