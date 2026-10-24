/** Existing WEAVE product imagery, already checked into public/weave-food.
 * Never substitute generated stock photography or treat the branded grocery
 * artwork as proof of an Agent's live stock. */
export const BURNING_RIVER_FOOD_PRODUCTS=[
  {id:'electrolyte',label:'Electrolyte',image:'/weave-food/electrolyte.jpeg',anchor:'agent-electrolyte',kind:'product-photo'},
  {id:'agility',label:'Agility',image:'/weave-food/agility.jpeg',anchor:'agent-agility',kind:'product-photo'},
  {id:'ember',label:'Ember',image:'/weave-food/ember.jpg',anchor:'agent-ember',kind:'product-photo'},
  {id:'daisy',label:'Daisy Pastries',image:'/weave-food/daisy-pastries-original.png',anchor:'agent-daisy-pastries',kind:'product-photo'},
  {id:'household',label:'Household Food',image:'/weave-food/weave-family-products.avif',anchor:'agent-farm-produce',kind:'branded-illustration'},
] as const

export const BURNING_RIVER_FARM={id:'farm',label:'Farm Produce',anchor:'agent-farm-produce'} as const

/** The existing Agent Carrier checkout remains authoritative for stock,
 * price, and payment. No Agent code => the public food directory. */
export function burningRiverFoodHref(carrierCode:string|null|undefined,anchor:string){
  return carrierCode&&/^[a-zA-Z0-9-]{1,40}$/.test(carrierCode)
    ?'/carrier/food/'+encodeURIComponent(carrierCode)+'?checkout=1#'+anchor
    :'/food-store'
}
