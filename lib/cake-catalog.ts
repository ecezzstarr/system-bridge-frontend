export type WeaveCakeType={
  id:string
  name:string
  occasion:string
  description:string
  suggestions:string[]
}

export const DAISY_PASTRIES_BRAND='Daisy Pastries'
export const DAISY_CAKE_SLICE_PRICE_NGN=5000
export const DAISY_CAKE_SLICE_MAX_NGN=DAISY_CAKE_SLICE_PRICE_NGN
export const DAISY_AGENT_COMMISSION_NGN=1000
export const DAISY_BENTO_PRICE_NGN=10000
export const DAISY_CELEBRATION_MIN_NGN=15000
export const DAISY_CELEBRATION_MAX_NGN=60000

export const DAISY_PASTRIES_PRICE_BANDS=[
  {id:'slice',name:'Cake Slice',label:'₦5,000',minNgn:DAISY_CAKE_SLICE_PRICE_NGN,maxNgn:DAISY_CAKE_SLICE_PRICE_NGN},
  {id:'bento',name:'Bento Cake',label:'₦10,000',minNgn:DAISY_BENTO_PRICE_NGN,maxNgn:DAISY_BENTO_PRICE_NGN},
  {id:'celebration',name:'Daisy Pastries Celebration Cakes',label:'₦15,000 to ₦60,000',minNgn:DAISY_CELEBRATION_MIN_NGN,maxNgn:DAISY_CELEBRATION_MAX_NGN},
] as const

export const WEAVE_CAKE_TYPES:WeaveCakeType[]=[
  {id:'birthday',name:'Birthday Cake',occasion:'Birthdays',description:'Daisy Pastries celebration cakes for children, adults and milestone birthdays.',suggestions:['Single tier','Character / theme','Number cake','Photo / message finish']},
  {id:'wedding',name:'Wedding Cake',occasion:'Weddings',description:'Daisy Pastries wedding cakes from simple finishes to ceremony cakes.',suggestions:['Single tier','Two tier','Three tier','Custom wedding formation']},
  {id:'anniversary',name:'Anniversary Cake',occasion:'Anniversaries',description:'Cakes for wedding anniversaries, relationship milestones and family celebrations.',suggestions:['Elegant finish','Heart finish','Photo / message','Custom milestone']},
  {id:'traditional',name:'Traditional / Introduction Cake',occasion:'Traditional marriage & introductions',description:'Event cakes formed for introductions, traditional marriage and family ceremonies.',suggestions:['Traditional colours','Couple theme','Family inscription','Tiered event cake']},
  {id:'baby',name:'Baby Shower / Naming Cake',occasion:'Baby showers & naming ceremonies',description:'Soft celebration cakes for baby showers, naming ceremonies and new-child events.',suggestions:['Baby shower','Naming ceremony','Gender theme','Family message']},
  {id:'graduation',name:'Graduation Cake',occasion:'Graduations',description:'Graduation and achievement cakes for school, university, training and professional milestones.',suggestions:['Graduation cap','School colours','Certificate theme','Achievement message']},
  {id:'corporate',name:'Corporate / Event Cake',occasion:'Company & public events',description:'Cakes for launches, company events, meetings, openings and organized celebrations.',suggestions:['Company logo','Product launch','Opening event','Team celebration']},
  {id:'custom',name:'Custom Occasion Cake',occasion:'Any other occasion',description:'A Daisy Pastries request for an occasion that does not fit the standard event groups.',suggestions:['Custom shape','Custom colours','Custom inscription','Reference-led design']},
]

export const WEAVE_CAKE_FLAVORS=['Vanilla','Chocolate','Red Velvet','Marble','Fruit','Coconut','Carrot','Custom / discuss with Agent'] as const
export const WEAVE_CAKE_SIZES=['Cake Slice · ₦5,000','Bento Cake · ₦10,000','6 inch','8 inch','10 inch','12 inch','Two tier','Three tier','Custom event size'] as const

export type DaisyPastriesPricePolicy={kind:'slice'|'bento'|'celebration';label:string;minNgn:number;maxNgn:number;fixed:boolean}

export function getDaisyPastriesPricePolicy(sizeOption:string):DaisyPastriesPricePolicy{
  if(String(sizeOption).startsWith('Cake Slice'))return {kind:'slice',label:'₦5,000',minNgn:DAISY_CAKE_SLICE_PRICE_NGN,maxNgn:DAISY_CAKE_SLICE_PRICE_NGN,fixed:true}
  if(String(sizeOption).startsWith('Bento Cake'))return {kind:'bento',label:'₦10,000',minNgn:DAISY_BENTO_PRICE_NGN,maxNgn:DAISY_BENTO_PRICE_NGN,fixed:true}
  return {kind:'celebration',label:'₦15,000 to ₦60,000',minNgn:DAISY_CELEBRATION_MIN_NGN,maxNgn:DAISY_CELEBRATION_MAX_NGN,fixed:false}
}

export function getDaisyPastriesAgentEarnings(cakePriceNgn:number){
  if(!Number.isFinite(cakePriceNgn)||cakePriceNgn<DAISY_AGENT_COMMISSION_NGN){
    throw new Error('Official cake selling price must cover the Agent commission')
  }
  return {customerPriceNgn:cakePriceNgn,agentCommissionNgn:DAISY_AGENT_COMMISSION_NGN,
    weaveShareNgn:cakePriceNgn-DAISY_AGENT_COMMISSION_NGN}
}

export function getWeaveCakeType(id:string){return WEAVE_CAKE_TYPES.find(item=>item.id===id)||null}
