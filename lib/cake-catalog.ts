export type WeaveCakeType={
  id:string
  name:string
  occasion:string
  description:string
  suggestions:string[]
}

export const WEAVE_CAKE_TYPES:WeaveCakeType[]=[
  {id:'birthday',name:'Birthday Cake',occasion:'Birthdays',description:'Celebration cakes for children, adults and milestone birthdays.',suggestions:['Single tier','Character / theme','Number cake','Photo / message finish']},
  {id:'wedding',name:'Wedding Cake',occasion:'Weddings',description:'Wedding cakes from simple single-tier finishes to multi-tier ceremony cakes.',suggestions:['Single tier','Two tier','Three tier','Custom wedding formation']},
  {id:'anniversary',name:'Anniversary Cake',occasion:'Anniversaries',description:'Cakes for wedding anniversaries, relationship milestones and family celebrations.',suggestions:['Elegant finish','Heart finish','Photo / message','Custom milestone']},
  {id:'traditional',name:'Traditional / Introduction Cake',occasion:'Traditional marriage & introductions',description:'Event cakes formed for introductions, traditional marriage and family ceremonies.',suggestions:['Traditional colours','Couple theme','Family inscription','Tiered event cake']},
  {id:'baby',name:'Baby Shower / Naming Cake',occasion:'Baby showers & naming ceremonies',description:'Soft celebration cakes for baby showers, naming ceremonies and new-child events.',suggestions:['Baby shower','Naming ceremony','Gender theme','Family message']},
  {id:'graduation',name:'Graduation Cake',occasion:'Graduations',description:'Graduation and achievement cakes for school, university, training and professional milestones.',suggestions:['Graduation cap','School colours','Certificate theme','Achievement message']},
  {id:'corporate',name:'Corporate / Event Cake',occasion:'Company & public events',description:'Cakes for launches, company events, meetings, openings and organized celebrations.',suggestions:['Company logo','Product launch','Opening event','Team celebration']},
  {id:'custom',name:'Custom Occasion Cake',occasion:'Any other occasion',description:'A custom cake request for an occasion that does not fit the standard event groups.',suggestions:['Custom shape','Custom colours','Custom inscription','Reference-led design']},
]

export const WEAVE_CAKE_FLAVORS=['Vanilla','Chocolate','Red Velvet','Marble','Fruit','Coconut','Carrot','Custom / discuss with Agent'] as const
export const WEAVE_CAKE_SIZES=['6 inch','8 inch','10 inch','12 inch','Two tier','Three tier','Custom event size'] as const

export function getWeaveCakeType(id:string){return WEAVE_CAKE_TYPES.find(item=>item.id===id)||null}
