/** Owner-approved English wording; French adaptation. Presentation only. */
export const INTRODUCTION_RECORD='presentation:introduction:series-one';
export const titles={en:'THE UNFINISHED ATLAS',fr:'L’ATLAS INACHEVÉ'};
export const paragraphs={
  "en": [
    "A remarkable Atlas has been left unfinished. Its maps are intact, but the names that once connected its places have disappeared.",
    "Hidden within its pages are fragments of a story told by Elias Vale, a brilliant cartographer, and Inès Varenne, a passionate historian. Together, they had set out on an extraordinary journey to chart the world, each seeing it in a very different way.",
    "Elias believed that understanding the world meant understanding its borders and geographical connections. Inès believed its true meaning lay in the people, places and remarkable things those borders contained.",
    "Something happened between them, and their final work was never completed. Decades passed. Elias and Inès were gone, and the mystery remained unsolved.",
    "Now the Atlas has found its way into your hands. Across its pages lie ten unfinished expeditions and sixty unfinished charts.",
    "The journey Elias and Inès began is yours to continue. But the world had not stood still. Borders had shifted, new nations had emerged, and places had changed their names. Completing the Atlas would mean more than picking up where its creators left off. It would mean charting the world as it is today.",
    "But why did Elias and Inès abandon the Atlas after giving so much of their lives to it?"
  ],
  "fr": [
    "Un Atlas remarquable est resté inachevé. Ses cartes sont intactes, mais les noms qui reliaient autrefois ses lieux ont disparu.",
    "Ses pages renferment les fragments d’une histoire racontée par Elias Vale, un brillant cartographe, et Inès Varenne, une historienne passionnée. Ensemble, ils s’étaient lancés dans une aventure extraordinaire : cartographier le monde, chacun le voyant d’une manière très différente.",
    "Pour Elias, comprendre le monde, c’était en comprendre les frontières et les liens géographiques. Pour Inès, son véritable sens résidait dans les êtres, les lieux et les merveilles que ces frontières renfermaient.",
    "Quelque chose s’était passé entre eux, et leur dernière œuvre n’avait jamais été achevée. Les décennies avaient passé. Elias et Inès n’étaient plus là, et le mystère demeurait entier.",
    "Aujourd’hui, l’Atlas est arrivé entre vos mains. Au fil de ses pages vous attendent dix expéditions et soixante cartes inachevées.",
    "À vous de poursuivre le voyage commencé par Elias et Inès. Mais le monde, lui, ne s’était pas arrêté. Des frontières avaient changé, de nouvelles nations étaient nées, des lieux avaient changé de nom. Achever l’Atlas ne consisterait pas simplement à reprendre le travail là où ses créateurs l’avaient laissé. Il faudrait cartographier le monde tel qu’il est aujourd’hui.",
    "Mais pourquoi Elias et Inès avaient-ils abandonné l’Atlas après y avoir consacré tant d’années de leur vie ?"
  ]
};
export const passages=[
  {
    "en": "A remarkable Atlas has been left unfinished. Its maps are intact, but the names that once connected its places have disappeared.",
    "fr": "Un Atlas remarquable est resté inachevé. Ses cartes sont intactes, mais les noms qui reliaient autrefois ses lieux ont disparu.",
    "art": "unfinished"
  },
  {
    "en": "Hidden within its pages are fragments of a story told by Elias Vale, a brilliant cartographer, and Inès Varenne, a passionate historian. Together, they had set out on an extraordinary journey to chart the world, each seeing it in a very different way.",
    "fr": "Ses pages renferment les fragments d’une histoire racontée par Elias Vale, un brillant cartographe, et Inès Varenne, une historienne passionnée. Ensemble, ils s’étaient lancés dans une aventure extraordinaire : cartographier le monde, chacun le voyant d’une manière très différente.",
    "art": "authors"
  },
  {
    "en": "Elias believed that understanding the world meant understanding its borders and geographical connections. Inès believed its true meaning lay in the people, places and remarkable things those borders contained.",
    "fr": "Pour Elias, comprendre le monde, c’était en comprendre les frontières et les liens géographiques. Pour Inès, son véritable sens résidait dans les êtres, les lieux et les merveilles que ces frontières renfermaient.",
    "art": "perspectives"
  },
  {
    "en": "Something happened between them, and their final work was never completed. Decades passed. Elias and Inès were gone, and the mystery remained unsolved.",
    "fr": "Quelque chose s’était passé entre eux, et leur dernière œuvre n’avait jamais été achevée. Les décennies avaient passé. Elias et Inès n’étaient plus là, et le mystère demeurait entier.",
    "art": "decades"
  },
  {
    "en": "Now the Atlas has found its way into your hands. Across its pages lie ten unfinished expeditions and sixty unfinished charts.",
    "fr": "Aujourd’hui, l’Atlas est arrivé entre vos mains. Au fil de ses pages vous attendent dix expéditions et soixante cartes inachevées.",
    "art": "inheritance"
  },
  {
    "en": "The journey Elias and Inès began is yours to continue. But the world had not stood still.",
    "fr": "À vous de poursuivre le voyage commencé par Elias et Inès. Mais le monde, lui, ne s’était pas arrêté.",
    "art": "continuation"
  },
  {
    "en": "Borders had shifted, new nations had emerged, and places had changed their names.",
    "fr": "Des frontières avaient changé, de nouvelles nations étaient nées, des lieux avaient changé de nom.",
    "art": "borders"
  },
  {
    "en": "Completing the Atlas would mean more than picking up where its creators left off. It would mean charting the world as it is today.",
    "fr": "Achever l’Atlas ne consisterait pas simplement à reprendre le travail là où ses créateurs l’avaient laissé. Il faudrait cartographier le monde tel qu’il est aujourd’hui.",
    "art": "today"
  },
  {
    "en": "But why did Elias and Inès abandon the Atlas after giving so much of their lives to it?",
    "fr": "Mais pourquoi Elias et Inès avaient-ils abandonné l’Atlas après y avoir consacré tant d’années de leur vie ?",
    "art": "question"
  }
];
/** Existing journeys and deep links never acquire an automatic interruption. */
export function shouldStartIntroduction(records,{persistent=true,hasLegacy=false,hasRoute=false}={}){
 if(!persistent||hasLegacy||hasRoute)return false;
 return !records.some(r=>/^(draft:|draft-history:|completion:|round:|token:|milestone:|outcome:|legacy:|preference:|presentation:|journey:|challenge:|exposure:|first-attempt:|discovery-|historical-access:)/.test(r.id)||r.id.startsWith('region:')&&r.source!=='opening');
}
