/**
 * WEAVE original vector sample collection.
 * Works entirely offline: no remote image hosts, image-generation keys, or AI calls.
 * Templates are graphic illustrations, not AI photos.
 */
export const WEAVE_SAMPLE_FORMATS = {
  portrait: {width:1080,height:1350,label:'Portrait · 4:5'},
  story: {width:1080,height:1920,label:'Story · 9:16'},
  square: {width:1080,height:1080,label:'Square · 1:1'},
  wide: {width:1600,height:900,label:'Wide · 16:9'},
} as const
export type SampleFormat=keyof typeof WEAVE_SAMPLE_FORMATS

export type SampleMotif='architecture'|'product'|'landscape'|'cinema'|'portrait'|'fashion'|'poster'|'botanical'|'castle'|'chrome'|'commerce'|'storybook'|'tshirt'|'hoodie'|'tote'|'cap'|'mug'|'packaging'|'record'|'canvas'|'phonecase'
export type SampleDesign={
  id:string;name:string;category:string;sector:string;motif:SampleMotif;
  brand:string;headline:string;description:string;action:string;
  palette:readonly [string,string,string,string]
}
const blue=['#071b2a','#2d718b','#d7f9fa','#b9a36f'] as const
const gold=['#24170e','#9e5933','#ffdf9e','#f3b466'] as const
const forest=['#092921','#368b6b','#efffcd','#a9db82'] as const
const plum=['#281a35','#864e83','#ffe2ed','#f1aec5'] as const
const royal=['#0e1837','#4f73ca','#eaf2ff','#94bafc'] as const
const dusk=['#201527','#a65d79','#ffedda','#ffd2a5'] as const

export const WEAVE_IMAGE_SAMPLES:ReadonlyArray<SampleDesign>=[
  {id:'brand-tee-classic',name:'Designer T-Shirt · Front',category:'Merch Branding',sector:'Apparel',motif:'tshirt',brand:'YOUR CLOTHING BRAND',headline:'Wear the story you make',description:'Custom apparel artwork and premium print direction.',action:'ORDER YOUR CUSTOM SHIRT',palette:blue},
  {id:'brand-tee-limited',name:'Artist Tee · Limited Drop',category:'Merch Branding',sector:'Artist merchandise',motif:'tshirt',brand:'THE ARTIST COLLECTION',headline:'Every edition has a story',description:'Personalized designs for independent artist collections.',action:'REQUEST A LIMITED DROP',palette:plum},
  {id:'brand-hoodie-studio',name:'Signature Hoodie',category:'Merch Branding',sector:'Fashion brand',motif:'hoodie',brand:'STUDIO EDITION',headline:'Create your own collection',description:'Show your design on a premium hoodie concept.',action:'CUSTOMIZE YOUR HOODIE',palette:gold},
  {id:'brand-tote-atelier',name:'Canvas Tote',category:'Merch Branding',sector:'Merchandise',motif:'tote',brand:'MADE FOR EVERYDAY',headline:'Carry your identity',description:'Branded tote concepts for shops and artists.',action:'ORDER CUSTOM BAGS',palette:forest},
  {id:'brand-cap-original',name:'Signature Cap',category:'Merch Branding',sector:'Headwear',motif:'cap',brand:'CAP COLLECTION',headline:'A mark of your own',description:'Customer-ready cap branding and presentation.',action:'ENQUIRE FOR PRINTS',palette:blue},
  {id:'brand-mug-personal',name:'Brand Mug',category:'Product Mockups',sector:'Drinkware',motif:'mug',brand:'THE MAKERS CLUB',headline:'Make their daily favorite',description:'Corporate gifts, artist collections and merchandise.',action:'ORDER BRANDED MUGS',palette:plum},
  {id:'brand-package-box',name:'Luxury Product Box',category:'Product Mockups',sector:'Product packaging',motif:'packaging',brand:'ORIGINAL GOODS',headline:'Every package tells a story',description:'Professional product identity for emerging businesses.',action:'REQUEST PACKAGE DESIGN',palette:forest},
  {id:'brand-package-label',name:'Signature Bottle Label',category:'Product Mockups',sector:'Bottle labels',motif:'product',brand:'YOUR PRODUCT',headline:'Designed to be remembered',description:'Premium brand presentation for a commercial label.',action:'BUILD YOUR LABEL',palette:gold},
  {id:'brand-record-release',name:'Artist Release Cover',category:'Artist Studio',sector:'Music and releases',motif:'record',brand:'ARTIST STUDIO',headline:'The new release starts here',description:'Cover concepts and promotions for independent artists.',action:'LISTEN TO THE RELEASE',palette:dusk},
  {id:'brand-canvas-art',name:'Gallery Canvas',category:'Artist Studio',sector:'Art prints',motif:'canvas',brand:'ARTIST EDITIONS',headline:'Artwork ready for your wall',description:'Create contemporary display concepts and art editions.',action:'ORDER ART PRINTS',palette:gold},
  {id:'brand-phonecase-studio',name:'Designer Phone Case',category:'Product Mockups',sector:'Device accessories',motif:'phonecase',brand:'STUDIO OBJECTS',headline:'Design in every detail',description:'A premium look for personalized tech accessories.',action:'CUSTOMIZE YOUR CASE',palette:royal},

  {id:'citadel-office',name:'Citadel Office',category:'Architecture',sector:'Property',motif:'architecture',brand:'WEAVE PROPERTIES',headline:'A new address for ambition',description:'Spaces built for ideas to grow into businesses.',action:'EXPLORE THE SPACE',palette:blue},
  {id:'golden-residence',name:'Golden Residence',category:'Architecture',sector:'Real estate',motif:'architecture',brand:'RADIANT LIVING',headline:'Live a little higher',description:'Exceptional homes with every detail considered.',action:'VIEW RESIDENCES',palette:gold},
  {id:'garden-retreat',name:'Garden Retreat',category:'Architecture',sector:'Hospitality',motif:'architecture',brand:'GREENHOUSE',headline:'Space to find your calm',description:'Architecture in conversation with nature.',action:'BOOK A VISIT',palette:forest},
  {id:'essence-bottle',name:'The Essence',category:'Product',sector:'Perfume',motif:'product',brand:'WEAVE ESSENCE',headline:'A presence you remember',description:'A signature scent, composed with intention.',action:'DISCOVER THE COLLECTION',palette:plum},
  {id:'hydration-studio',name:'Refresh Campaign',category:'Product',sector:'Beverages',motif:'product',brand:'YOUR PRODUCT',headline:'A better kind of refresh',description:'Product-led campaigns with a premium finish.',action:'ORDER TODAY',palette:blue},
  {id:'artisan-collection',name:'Artisan Collection',category:'Product',sector:'Retail',motif:'product',brand:'MADE WITH CARE',headline:'Small details. Big feeling.',description:'A beautiful product deserves a beautiful story.',action:'SHOP THE COLLECTION',palette:gold},
  {id:'coastal-light',name:'Coastal Light',category:'Photography',sector:'Travel',motif:'landscape',brand:'WEAVE JOURNEYS',headline:'There is more to explore',description:'Experiences worth stepping outside for.',action:'DISCOVER PLACES',palette:blue},
  {id:'wild-greens',name:'Wild Greens',category:'Photography',sector:'Nature',motif:'landscape',brand:'NATURE EXPERIENCES',headline:'Come closer to the living world',description:'A change of pace, a different perspective.',action:'PLAN AN ESCAPE',palette:forest},
  {id:'sunset-voyage',name:'Sunset Voyage',category:'Photography',sector:'Travel',motif:'landscape',brand:'DISTANT HORIZONS',headline:'Follow the golden hour',description:'Memorable journeys begin with a single plan.',action:'SEE THE DESTINATIONS',palette:gold},
  {id:'opening-night',name:'Opening Night',category:'Cinematic',sector:'Film',motif:'cinema',brand:'WEAVE PICTURES',headline:'Every story has a beginning',description:'Original productions that stay with the audience.',action:'COMING SOON',palette:dusk},
  {id:'burning-river',name:'River of Presence',category:'Cinematic',sector:'Events',motif:'cinema',brand:'THE COMPANY OF TIME',headline:'Where the river remembers',description:'An original visual story from Weave.',action:'ENTER THE STORY',palette:royal},
  {id:'after-dark',name:'After Dark',category:'Cinematic',sector:'Entertainment',motif:'cinema',brand:'NIGHTFALL',headline:'The city has another life',description:'Make the evening one to remember.',action:'RESERVE YOUR PLACE',palette:plum},
  {id:'founder-profile',name:'Founder Profile',category:'Portrait',sector:'Personal branding',motif:'portrait',brand:'THE FOUNDER SERIES',headline:'Built with conviction',description:'Personal stories, professionally presented.',action:'TELL YOUR STORY',palette:gold},
  {id:'studio-portrait',name:'Studio Portrait',category:'Portrait',sector:'Creators',motif:'portrait',brand:'MADE OF PRESENCE',headline:'Let them see your work',description:'A compelling introduction to your creative identity.',action:'DISCOVER MORE',palette:plum},
  {id:'speaker-spotlight',name:'Speaker Spotlight',category:'Portrait',sector:'Events',motif:'portrait',brand:'THE SPEAKER ROOM',headline:'Ideas worth sharing',description:'An evening of perspective and possibility.',action:'JOIN THE SESSION',palette:royal},
  {id:'runway-atelier',name:'Atelier Runway',category:'Fashion',sector:'Fashion',motif:'fashion',brand:'ATELIER 01',headline:'The art of arriving',description:'A new season, carefully imagined.',action:'VIEW THE EDIT',palette:plum},
  {id:'silk-modern',name:'Silk Modern',category:'Fashion',sector:'Clothing',motif:'fashion',brand:'MODERN FORM',headline:'Wear your own story',description:'A refined edit for everyday expression.',action:'EXPLORE COLLECTION',palette:blue},
  {id:'gold-atelier',name:'Gold Atelier',category:'Fashion',sector:'Luxury',motif:'fashion',brand:'GOLD ATELIER',headline:'Made to be remembered',description:'Style with purpose and beautiful detail.',action:'SEE THE LOOKS',palette:gold},
  {id:'grand-opening',name:'Grand Opening',category:'Poster',sector:'Retail',motif:'poster',brand:'WEAVE CREATIONS',headline:'Something wonderful opens',description:'Your destination for distinctive finds.',action:'VISIT US',palette:royal},
  {id:'festival-form',name:'Festival Form',category:'Poster',sector:'Events',motif:'poster',brand:'NEW WAVE',headline:'A celebration of what comes next',description:'Music, culture and a room full of possibility.',action:'JOIN THE EVENT',palette:dusk},
  {id:'business-launch',name:'Business Launch',category:'Poster',sector:'Startups',motif:'poster',brand:'BUILT FOR BUSINESS',headline:'Open for opportunity',description:'A smarter way to welcome your next customer.',action:'GET IN TOUCH',palette:forest},
  {id:'garden-art',name:'Botanical Print',category:'Illustration',sector:'Art & design',motif:'botanical',brand:'WEAVE ART HOUSE',headline:'The beauty in little things',description:'Original illustration for modern collections.',action:'VIEW ORIGINALS',palette:forest},
  {id:'flower-market',name:'Flower Market',category:'Illustration',sector:'Florist',motif:'botanical',brand:'BLOOM HOUSE',headline:'Give someone a little light',description:'Beautiful flowers for the moments that matter.',action:'SHOP BLOOMS',palette:plum},
  {id:'organic-wellness',name:'Organic Wellness',category:'Illustration',sector:'Wellness',motif:'botanical',brand:'NATURAL GOOD',headline:'Make room for well-being',description:'Fresh perspectives for healthy everyday rituals.',action:'EXPLORE THE RANGE',palette:gold},
  {id:'kingdom-at-dawn',name:'Kingdom at Dawn',category:'Fantasy',sector:'Games',motif:'castle',brand:'WEAVE WORLDS',headline:'Your world is waiting',description:'Original fantasy settings and immersive stories.',action:'ENTER THE WORLD',palette:royal},
  {id:'forest-citadel',name:'Forest Citadel',category:'Fantasy',sector:'Creative worlds',motif:'castle',brand:'REALMS OF TIME',headline:'Where possibility lives',description:'Step beyond the familiar.',action:'DISCOVER THE REALM',palette:forest},
  {id:'ember-palace',name:'Ember Palace',category:'Fantasy',sector:'Entertainment',motif:'castle',brand:'PALACE OF LIGHT',headline:'The legend begins here',description:'An original imagined kingdom.',action:'EXPLORE THE WORLD',palette:gold},
  {id:'chrome-studio',name:'Chrome Studio',category:'3D',sector:'Technology',motif:'chrome',brand:'WEAVE FUTURES',headline:'Designed for tomorrow',description:'Dimensional concepts for ambitious projects.',action:'START A PROJECT',palette:blue},
  {id:'digital-objects',name:'Digital Objects',category:'3D',sector:'Product design',motif:'chrome',brand:'OBJECT STUDIO',headline:'Form meets possibility',description:'Objects with presence and personality.',action:'VIEW THE SERIES',palette:plum},
  {id:'orbital-gallery',name:'Orbital Gallery',category:'3D',sector:'Digital design',motif:'chrome',brand:'ORBITAL',headline:'A new dimension of design',description:'Ideas given dimensional form.',action:'SEE THE COLLECTION',palette:royal},
  {id:'fresh-supply',name:'Fresh Supply',category:'Social Ads',sector:'Food',motif:'commerce',brand:'DAILY SUPPLY',headline:'Your favorites, made simple',description:'Clear offers. Easy ordering. Happy customers.',action:'ORDER NOW',palette:forest},
  {id:'retail-deal',name:'Retail Launch',category:'Social Ads',sector:'Commerce',motif:'commerce',brand:'YOUR STORE',headline:'The pieces you came for',description:'Bring customers closer to what they love.',action:'SHOP TODAY',palette:gold},
  {id:'service-offer',name:'Service Offer',category:'Social Ads',sector:'Services',motif:'commerce',brand:'HERE TO HELP',headline:'Good service makes a difference',description:'Make it easy for customers to reach you.',action:'BOOK A SERVICE',palette:blue},
  {id:'quiet-little-house',name:'Little House',category:'Storybook',sector:'Children books',motif:'storybook',brand:'WEAVE STORIES',headline:'The house that held a dream',description:'An original story of wonder and becoming.',action:'READ THE STORY',palette:forest},
  {id:'moonlit-garden',name:'Moonlit Garden',category:'Storybook',sector:'Publishing',motif:'storybook',brand:'DREAMS IN WORDS',headline:'A garden for the stars',description:'An illustrated world of small surprises.',action:'OPEN THE BOOK',palette:plum},
  {id:'golden-journey',name:'Golden Journey',category:'Storybook',sector:'Learning',motif:'storybook',brand:'LITTLE JOURNEYS',headline:'Every day holds a story',description:'Beautiful beginnings for curious minds.',action:'BEGIN READING',palette:gold},
]

export type SampleEdits={brand:string;headline:string;description:string;action:string;format:SampleFormat;accent:string;artworkHash?:string;photoHash?:string;printText?:string;printColor?:string;printX?:number;printY?:number;printScale?:number;printRotation?:number}
export function findImageSample(id:string):SampleDesign|null {
  return WEAVE_IMAGE_SAMPLES.find(sample=>sample.id===id)||null
}
export function defaultSampleEdits(sample:SampleDesign):SampleEdits {
  return {brand:sample.brand,headline:sample.headline,description:sample.description,action:sample.action,format:'portrait',accent:sample.palette[3]}
}
export function normalizeSampleEdits(sample:SampleDesign,input:unknown):SampleEdits {
  const src=(input&&typeof input==='object'?input:{}) as Record<string,unknown>
  const field=(value:unknown,fallback:string,max:number)=>String(typeof value==='string'?value:fallback).trim().slice(0,max)
  const format=String(src.format||'portrait')
  const rawAccent=String(src.accent||'')
  return {
    brand:field(src.brand,sample.brand,55),
    headline:field(src.headline,sample.headline,110),
    description:field(src.description,sample.description,150),
    action:field(src.action,sample.action,55),
    format:(format in WEAVE_SAMPLE_FORMATS?format:'portrait') as SampleFormat,
    accent:/^#[a-fA-F0-9]{6}$/.test(rawAccent)?rawAccent:sample.palette[3],
    ...(/^[0-9a-f]{64}$/.test(String(src.artworkHash||''))?{artworkHash:String(src.artworkHash)}:{}),
    ...(/^[0-9a-f]{64}$/.test(String(src.photoHash||''))?{photoHash:String(src.photoHash)}:{}),
    ...(typeof src.printText==='string'&&src.printText.trim()?{printText:src.printText.trim().slice(0,85)}:{}),
    ...(/^#[0-9a-fA-F]{6}$/.test(String(src.printColor||''))?{printColor:String(src.printColor)}:{}),
    ...(typeof src.printX==='number'&&Number.isFinite(src.printX)?{printX:Math.max(-120,Math.min(120,Math.round(src.printX)))}:{}),
    ...(typeof src.printY==='number'&&Number.isFinite(src.printY)?{printY:Math.max(-120,Math.min(120,Math.round(src.printY)))}:{}),
    ...(typeof src.printScale==='number'&&Number.isFinite(src.printScale)?{printScale:Math.max(.25,Math.min(1.5,Math.round(src.printScale*100)/100))}:{}),
    ...(typeof src.printRotation==='number'&&Number.isFinite(src.printRotation)?{printRotation:Math.max(-45,Math.min(45,Math.round(src.printRotation)))}:{}),
  }
}
const esc=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')
function textLines(value:string,maxChars:number,maxRows:number){
  const words=value.trim().split(/\s+/).filter(Boolean)
  const lines:string[]=[];let line=''
  for(const word of words){
    if((line+' '+word).trim().length>maxChars&&line){lines.push(line);line=word}else line=(line+' '+word).trim()
  }
  if(line)lines.push(line)
  return lines.slice(0,maxRows)
}
const SCENES:Record<SampleMotif,string>={
tshirt:'<ellipse cx="500" cy="925" rx="345" ry="38" fill="%A%" opacity=".45"/><path d="M325 115L195 195 65 420l175 105 100-140-14 510h350l-14-510 100 140 173-105-130-225-130-80-115 75H440Z" fill="url(#fabric)" stroke="%C%" stroke-width="11" stroke-linejoin="round"/><path d="M440 190q58 95 120 0" fill="none" stroke="%C%" stroke-width="20"/><path d="M310 130q45 105 125 160m255-160q-45 105-125 160" stroke="%A%" stroke-width="7" opacity=".4"/><path d="M350 405h300v270H350Z" fill="%A%" opacity=".25" stroke="%D%" stroke-width="7" stroke-dasharray="15 10"/><path d="M335 885h340" stroke="%C%" opacity=".65" stroke-width="18"/>',
hoodie:'<ellipse cx="510" cy="938" rx="350" ry="35" fill="%A%" opacity=".35"/><path d="M410 165Q500-20 590 165l110 30 155 250-148 103-60-115 35 449H320l35-449-60 115-148-103 155-250Z" fill="url(#fabric)" stroke="%C%" stroke-width="13" stroke-linejoin="round"/><path d="M410 165q100 145 180 0l40 85q-120 95-260 0Z" fill="%A%" stroke="%C%" stroke-width="9"/><path d="M450 239l-20 190m126-190 20 190" stroke="%D%" stroke-width="8"/><path d="M395 695q105 95 210 0l70 115H330Z" fill="%A%" opacity=".28" stroke="%C%" stroke-width="9"/><rect x="371" y="396" width="258" height="215" rx="14" fill="%A%" opacity=".20" stroke="%D%" stroke-width="7" stroke-dasharray="12 9"/>',
tote:'<ellipse cx="500" cy="930" rx="345" ry="39" fill="%A%" opacity=".4"/><path d="M280 315q-15-195 90-222 140-55 260 0 105 35 90 222" fill="none" stroke="%C%" stroke-width="37"/><path d="M190 340H810L735 855H265Z" fill="url(#fabric)" stroke="%C%" stroke-width="14" stroke-linejoin="round"/><path d="M235 370h530m-480 70h430" stroke="%A%" opacity=".35" stroke-width="9"/><rect x="341" y="482" width="318" height="245" rx="18" fill="%A%" opacity=".22" stroke="%D%" stroke-width="7" stroke-dasharray="15 9"/>',
cap:'<ellipse cx="520" cy="810" rx="410" ry="57" fill="%A%" opacity=".4"/><path d="M210 500q10-325 290-325T790 500V610H210Z" fill="url(#fabric)" stroke="%C%" stroke-width="14"/><path d="M505 180v430m-285-170q280-170 560 0" fill="none" stroke="%A%" stroke-width="10" opacity=".5"/><path d="M170 605Q520 490 840 605q-85 158-355 168-205-10-315-168Z" fill="%B%" stroke="%C%" stroke-width="13"/><rect x="363" y="397" width="274" height="154" rx="28" fill="%A%" opacity=".20" stroke="%D%" stroke-width="7" stroke-dasharray="13 9"/>',
mug:'<ellipse cx="510" cy="905" rx="360" ry="53" fill="%A%" opacity=".4"/><path d="M685 355q245-90 230 135t-232 130" fill="none" stroke="%C%" stroke-width="62"/><path d="M225 255h525l-30 560q-215 90-465 0Z" fill="url(#fabric)" stroke="%C%" stroke-width="16"/><ellipse cx="488" cy="265" rx="262" ry="55" fill="%A%" stroke="%D%" stroke-width="12"/><path d="M260 370h465" stroke="%C%" opacity=".3" stroke-width="7"/><rect x="347" y="420" width="280" height="290" rx="17" fill="%A%" opacity=".18" stroke="%D%" stroke-width="8" stroke-dasharray="14 9"/>',
packaging:'<ellipse cx="540" cy="932" rx="365" ry="33" fill="%A%" opacity=".4"/><path d="M270 240L625 140 805 245 435 354Z" fill="%C%" opacity=".8" stroke="%D%" stroke-width="11"/><path d="M270 240L435 354V867L270 763Z" fill="%A%" stroke="%D%" stroke-width="12"/><path d="M435 354L805 245V762L435 867Z" fill="url(#fabric)" stroke="%C%" stroke-width="13"/><path d="M500 445L735 375V690L500 759Z" fill="%A%" opacity=".21" stroke="%D%" stroke-width="8" stroke-dasharray="12 8"/><path d="M290 335v350m20-325v310" stroke="%D%" opacity=".5" stroke-width="6"/>',
record:'<circle cx="500" cy="460" r="345" fill="%A%" stroke="%C%" stroke-width="15"/><circle cx="500" cy="460" r="273" fill="none" stroke="%B%" stroke-width="36"/><circle cx="500" cy="460" r="178" fill="%D%" opacity=".65"/><circle cx="500" cy="460" r="142" fill="%B%"/><circle cx="500" cy="460" r="18" fill="%C%"/><path d="M200 230q300 80 600 0m-620 90q300 80 640 0m-640 260q320 80 640 0m-570 95q270 60 500 0" fill="none" stroke="%C%" stroke-width="4" opacity=".23"/><rect x="230" y="810" width="540" height="65" rx="15" fill="%D%" opacity=".5"/>',
canvas:'<ellipse cx="500" cy="915" rx="410" ry="50" fill="%A%" opacity=".4"/><rect x="150" y="120" width="700" height="690" rx="8" fill="%A%" stroke="%D%" stroke-width="33"/><rect x="198" y="168" width="604" height="596" fill="%B%" stroke="%C%" stroke-width="8"/><circle cx="625" cy="366" r="156" fill="%D%" opacity=".5"/><path d="M205 660l185-235 165 172 95-105 150 185v85H205Z" fill="%A%" opacity=".55"/><path d="M390 830l-120 120m340-120 120 120M500 810v140" stroke="%C%" stroke-width="18"/>',
phonecase:'<ellipse cx="502" cy="938" rx="360" ry="36" fill="%A%" opacity=".4"/><rect x="285" y="80" width="430" height="790" rx="66" fill="url(#fabric)" stroke="%C%" stroke-width="19"/><rect x="335" y="145" width="330" height="630" rx="34" fill="%B%" opacity=".8"/><rect x="374" y="310" width="252" height="300" rx="25" fill="%A%" opacity=".22" stroke="%D%" stroke-width="8" stroke-dasharray="13 9"/><rect x="325" y="124" width="146" height="160" rx="36" fill="%A%" stroke="%D%" stroke-width="9"/><circle cx="369" cy="168" r="23" fill="%C%"/><circle cx="425" cy="229" r="26" fill="%C%"/><circle cx="376" cy="244" r="13" fill="%C%"/>',

architecture:'<ellipse cx="500" cy="906" rx="420" ry="55" fill="%D%" opacity=".28"/><g transform="translate(130 50)"><path d="M90 810V230L265 120L440 230V810Z" fill="%B%" stroke="%C%" stroke-width="9"/><path d="M255 810V135L560 33V810Z" fill="%A%" stroke="%D%" stroke-width="14"/><path d="M440 810V215L690 135V810Z" fill="%B%" stroke="%C%" stroke-width="8"/><g fill="%C%" opacity=".75"><path d="M140 286h235v25H140zm0 88h235v25H140zm0 88h235v25H140zm0 88h235v25H140zm0 88h235v25H140z"/><path d="M297 186l200-66v35l-200 66zm0 104l200-66v35l-200 66zm0 104l200-66v35l-200 66zm0 104l200-66v35l-200 66zm0 104l200-66v35l-200 66z"/></g><path d="M280 810V700h135v110" fill="%C%"/><path d="M140 810h600" stroke="%D%" stroke-width="18"/></g>',
product:'<ellipse cx="515" cy="900" rx="370" ry="65" fill="%A%" opacity=".5"/><g transform="translate(195 30)"><path d="M170 265V185c0-28 22-50 50-50h190c28 0 50 22 50 50v80" fill="%B%" stroke="%D%" stroke-width="12"/><path d="M220 135V55h190v80" fill="%D%"/><path d="M145 285q-65 20-65 115v340q0 80 80 80h335q80 0 80-80V400q0-95-65-115Z" fill="%B%" stroke="%C%" stroke-width="15"/><path d="M190 305v480" stroke="%C%" opacity=".35" stroke-width="25"/><path d="M495 305v480" stroke="%A%" opacity=".55" stroke-width="25"/><rect x="170" y="427" width="315" height="232" rx="10" fill="%A%" stroke="%D%" stroke-width="9"/><circle cx="328" cy="510" r="53" fill="none" stroke="%D%" stroke-width="8"/><path d="M245 599h170" stroke="%D%" stroke-width="8"/></g>',
landscape:'<circle cx="740" cy="250" r="160" fill="%D%" opacity=".84"/><path d="M0 660L220 270L440 630L625 180L1000 670V1000H0Z" fill="%B%"/><path d="M0 820L220 455L390 680L615 330L1000 780V1000H0Z" fill="%A%" stroke="%D%" stroke-width="8"/><path d="M0 795Q350 730 520 850T1000 800V1030H0Z" fill="%C%" opacity=".45"/><path d="M0 880Q275 835 500 910T1000 865" fill="none" stroke="%D%" stroke-width="16" opacity=".8"/><path d="M0 965q240-80 470 0t530 0" fill="none" stroke="%C%" stroke-width="12"/><g stroke="%C%" stroke-width="7" opacity=".65"><path d="M120 625l100-170 95 165M528 485l87-155 115 180M745 570l100-145 75 165"/></g>',
cinema:'<circle cx="650" cy="330" r="250" fill="%D%" opacity=".7"/><path d="M0 600Q200 340 440 500T1000 410V1050H0Z" fill="%B%"/><path d="M0 730L260 515L420 700L735 470L1000 770V1050H0Z" fill="%A%"/><path d="M0 900q250-180 470-65t530-55v260H0Z" fill="%B%" stroke="%D%" stroke-width="10"/><path d="M530 920V610L550 565L570 610V920" stroke="%C%" stroke-width="20"/><path d="M440 685q120-95 235 0" fill="none" stroke="%C%" stroke-width="12"/><path d="M0 850q310-55 580 50t420-5" fill="none" stroke="%D%" stroke-width="13"/><g fill="%C%"><circle cx="145" cy="145" r="5"/><circle cx="385" cy="250" r="7"/><circle cx="820" cy="125" r="5"/></g>',
portrait:'<circle cx="500" cy="400" r="355" fill="%D%" opacity=".4"/><path d="M175 990q10-270 145-298l110-60h140l120 60q150 45 145 298" fill="%B%" stroke="%D%" stroke-width="11"/><path d="M392 632v150l110 100 110-100V632" fill="%C%" stroke="%D%" stroke-width="9"/><path d="M310 342q0-210 190-220 190-5 190 220v160q0 180-190 205-190-25-190-205Z" fill="%C%" stroke="%A%" stroke-width="12"/><path d="M305 415q-100-240 70-305 220-100 335 85 45 80-20 230-10-160-110-175-115 100-275 80Z" fill="%A%" stroke="%D%" stroke-width="11"/><path d="M390 465h55m110 0h55" stroke="%A%" stroke-width="11" stroke-linecap="round"/><path d="M455 580q46 24 95 0" fill="none" stroke="%A%" stroke-width="10" stroke-linecap="round"/><path d="M350 735l150 155 150-155" fill="none" stroke="%D%" stroke-width="12"/>',
fashion:'<path d="M70 950h860" stroke="%D%" stroke-width="12"/><path d="M280 985l205-760 205 760" fill="%B%" opacity=".7"/><circle cx="500" cy="165" r="75" fill="%C%" stroke="%D%" stroke-width="9"/><path d="M445 238h110l65 100 125 290-145 45-75-200 40 295-75 105-75-105 40-295-75 200-145-45 125-290Z" fill="%B%" stroke="%D%" stroke-width="12"/><path d="M385 478h230M410 550h180M440 625h120" stroke="%C%" stroke-width="14" opacity=".72"/><path d="M450 865l-40 140m140-140 40 140" stroke="%C%" stroke-width="28"/><path d="M410 325l90 105 90-105" fill="none" stroke="%C%" stroke-width="13"/><g stroke="%D%" stroke-width="7" opacity=".5"><path d="M155 900l245-220m455 220L600 680"/></g>',
poster:'<circle cx="710" cy="295" r="340" fill="%D%" opacity=".8"/><circle cx="710" cy="295" r="245" fill="%B%" stroke="%C%" stroke-width="18"/><path d="M-100 735L900 50" stroke="%C%" stroke-width="90" opacity=".7"/><path d="M75 200L830 880" stroke="%A%" stroke-width="55"/><path d="M80 760l700-660" fill="none" stroke="%D%" stroke-width="15"/><path d="M170 660l130-400 170 360" fill="none" stroke="%C%" stroke-width="25"/><rect x="520" y="650" width="260" height="260" rx="18" fill="%B%" stroke="%D%" stroke-width="14" transform="rotate(-12 650 780)"/>',
botanical:'<g stroke="%D%" fill="none" stroke-width="16" stroke-linecap="round"><path d="M500 950V140M500 600Q280 490 160 270M500 750Q755 550 820 250M500 520Q650 260 720 125M500 850Q250 720 165 650"/></g><g fill="%B%" stroke="%C%" stroke-width="7"><ellipse cx="280" cy="390" rx="135" ry="58" transform="rotate(34 280 390)"/><ellipse cx="715" cy="420" rx="160" ry="58" transform="rotate(-38 715 420)"/><ellipse cx="630" cy="315" rx="125" ry="45" transform="rotate(-60 630 315)"/><ellipse cx="275" cy="725" rx="155" ry="55" transform="rotate(28 275 725)"/></g><g fill="%D%" stroke="%C%" stroke-width="9"><circle cx="500" cy="220" r="105"/><circle cx="500" cy="220" r="44" fill="%A%"/><circle cx="740" cy="175" r="65"/><circle cx="740" cy="175" r="30" fill="%A%"/><circle cx="170" cy="270" r="70"/><circle cx="170" cy="270" r="30" fill="%A%"/></g>',
castle:'<circle cx="720" cy="240" r="160" fill="%D%" opacity=".85"/><path d="M0 840l205-280 185 240 250-420 360 460V1000H0Z" fill="%B%"/><path d="M180 940V415h130v525M380 940V305h230v635M675 940V435h145v505" fill="%A%" stroke="%C%" stroke-width="14"/><path d="M160 435l85-145 85 145M360 320l135-180 135 180M655 450l95-145 95 145" fill="%D%" stroke="%C%" stroke-width="12"/><path d="M475 935V795q0-65 40-65t40 65v140" fill="%B%" stroke="%D%" stroke-width="12"/><path d="M215 535h55v100h-55zm245-60h80v150h-80zm245 65h65v110h-65z" fill="%D%"/><path d="M0 940q250-70 500 0t500 0" fill="none" stroke="%D%" stroke-width="14"/>',
chrome:'<g stroke="%C%" stroke-width="5" opacity=".6"><path d="M50 910l450-760 450 760M-100 810h1200M80 680h840M190 550h620M290 420h420M0 980h1000"/></g><circle cx="490" cy="475" r="295" fill="%B%" stroke="%D%" stroke-width="25"/><ellipse cx="410" cy="385" rx="165" ry="95" fill="%C%" opacity=".7" transform="rotate(-30 410 385)"/><circle cx="550" cy="570" r="145" fill="%A%" opacity=".7"/><circle cx="770" cy="755" r="120" fill="%D%" stroke="%C%" stroke-width="12"/><ellipse cx="730" cy="710" rx="60" ry="28" fill="%C%" opacity=".65"/><path d="M240 900l160 50m380-35 100-20" stroke="%D%" stroke-width="20"/>',
commerce:'<ellipse cx="500" cy="925" rx="350" ry="48" fill="%A%" opacity=".4"/><path d="M285 320h430l90 520H195Z" fill="%B%" stroke="%D%" stroke-width="13"/><path d="M365 325q0-210 135-210t135 210" fill="none" stroke="%C%" stroke-width="26"/><path d="M300 480h400M350 590h300M400 700h200" stroke="%C%" stroke-width="14" opacity=".55"/><circle cx="500" cy="550" r="80" fill="%D%"/><path d="M465 545l25 26 60-70" fill="none" stroke="%A%" stroke-width="18" stroke-linecap="round"/><g fill="%D%"><circle cx="200" cy="200" r="16"/><circle cx="780" cy="145" r="12"/><circle cx="850" cy="450" r="18"/></g>',
storybook:'<path d="M0 850Q300 700 530 800t470-100v330H0Z" fill="%B%"/><circle cx="770" cy="170" r="105" fill="%D%"/><path d="M255 765V410l240-195 240 195v355Z" fill="%C%" stroke="%D%" stroke-width="14"/><path d="M210 435l285-255 285 255" fill="none" stroke="%A%" stroke-width="25" stroke-linejoin="round"/><path d="M440 765V590q0-60 55-60t55 60v175" fill="%B%" stroke="%D%" stroke-width="11"/><path d="M315 480h70v100h-70zm290 0h70v100h-70z" fill="%D%"/><g fill="%D%" stroke="%A%" stroke-width="8"><circle cx="130" cy="600" r="105"/><circle cx="880" cy="560" r="120"/></g><g stroke="%A%" stroke-width="17"><path d="M130 950V650m750 290V610"/></g>',
}
const group=(x:string)=>'<g>'+x+'</g>'

export function renderWeaveSampleSvg(sample:SampleDesign,editsInput:unknown,preview=true):string{
  const e=normalizeSampleEdits(sample,editsInput)
  const format=WEAVE_SAMPLE_FORMATS[e.format]
  const h=Math.round(1000*format.height/format.width)
  const [dark,mid,light]=sample.palette
  const accent=e.accent
  const artTop=h<900?-140:h>1550?160:Math.floor((h-1250)/5)
  const overlayTop=Math.round(h*.57)
  const bottomText=h-205
  const headText=h-325
  const mainLines=textLines(e.headline,h<900?28:23,h<900?2:3)
  const mainSize=h<900?47:54
  const firstY=headText-Math.max(0,mainLines.length-2)*52
  const brand=esc(e.brand||sample.brand)
  const description=textLines(e.description,49,h<900?1:2).map((line,i)=>'<text x="76" y="'+(bottomText+i*35)+'" fill="'+light+'" opacity=".92" font-family="Arial,Helvetica,sans-serif" font-size="25">'+esc(line)+'</text>').join('')
  const lines=mainLines.map((line,i)=>'<text x="76" y="'+(firstY+i*(mainSize+8))+'" fill="'+light+'" font-family="Georgia,serif" font-weight="700" font-size="'+mainSize+'">'+esc(line)+'</text>').join('')
  const motif=SCENES[sample.motif].replace(/%A%/g,dark).replace(/%B%/g,mid).replace(/%C%/g,light).replace(/%D%/g,accent)
  const watermark=preview?'<g transform="rotate(-24 500 500)"><rect x="-80" y="444" width="1160" height="100" fill="#050913" opacity=".72"/><text x="500" y="510" text-anchor="middle" font-size="38" font-family="Arial,sans-serif" font-weight="700" fill="#ffffff" letter-spacing="7">WEAVE SAMPLE · PREVIEW</text></g>':''
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+format.width+'" height="'+format.height+'" viewBox="0 0 1000 '+h+'" role="img" aria-label="'+esc(sample.name)+'">'
  +'<defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="'+dark+'"/><stop offset=".6" stop-color="'+mid+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient>'
  +'<linearGradient id="fabric" x1="0" y1="0" x2="1" y2="0"><stop stop-color="'+dark+'"/><stop offset=".22" stop-color="'+light+'"/><stop offset=".52" stop-color="'+mid+'"/><stop offset=".78" stop-color="'+light+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient><linearGradient id="shade" x1="0" x2="0" y1="0" y2="1"><stop stop-color="'+dark+'" stop-opacity="0"/><stop offset=".1" stop-color="'+dark+'" stop-opacity=".3"/><stop offset=".5" stop-color="'+dark+'" stop-opacity=".92"/><stop offset="1" stop-color="'+dark+'"/></linearGradient></defs>'
  +'<rect width="1000" height="'+h+'" fill="url(#bg)"/><circle cx="810" cy="125" r="300" fill="'+accent+'" opacity=".12"/>'
  +'<g transform="translate(0 '+artTop+')">'+group(motif)+'</g>'
  +'<rect x="0" y="'+overlayTop+'" width="1000" height="'+(h-overlayTop)+'" fill="url(#shade)"/>'
  +'<text x="76" y="96" font-family="Arial,sans-serif" font-size="28" font-weight="700" letter-spacing="5" fill="'+light+'">'+brand+'</text>'
  +'<rect x="76" y="123" width="94" height="7" fill="'+accent+'"/>'
  +lines+description
  +'<path d="M76 '+(h-118)+'H924" stroke="'+accent+'" stroke-width="5"/>'
  +'<text x="76" y="'+(h-66)+'" font-size="23" font-family="Arial,sans-serif" letter-spacing="3" font-weight="700" fill="'+accent+'">'+esc(e.action||sample.action)+'</text>'
  +'<text x="924" y="'+(h-66)+'" font-size="15" font-family="Arial,sans-serif" text-anchor="end" fill="'+light+'" opacity=".65">MADE WITH WEAVE</text>'
  +watermark+'</svg>'
}
