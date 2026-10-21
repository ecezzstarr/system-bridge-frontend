/** Nigerian household food essentials. This is a catalogue of categories,
 * not an assertion that a seller has stock or that any price is live. */
export const WEAVE_HOUSEHOLD_FOOD_GROUPS=[
  {id:'grains',label:'Rice, Beans & Grains',items:['Local rice','Parboiled rice','Ofada rice','Brown beans','White beans','Honey beans','Garri (white)','Garri (yellow)','Maize','Pap / ogi','Millet','Sorghum','Wheat','Semovita','Semolina','Pounded yam flour','Cassava flour','Fufu','Tuwo rice']},
  {id:'tubers',label:'Tubers & Plantain',items:['Yam','Irish potatoes','Sweet potatoes','Cassava','Plantain (ripe)','Plantain (unripe)','Cocoyam']},
  {id:'vegetables',label:'Vegetables & Soup',items:['Fresh tomatoes','Tinned tomatoes','Fresh pepper','Scotch bonnet / ata rodo','Bell pepper / tatashe','Onions','Okra','Ugu leaves','Ewedu','Bitterleaf','Waterleaf','Scent leaf','Spinach','Egusi','Ogbono','Afang leaves','Oha leaves','Garden egg']},
  {id:'proteins',label:'Proteins & Fish',items:['Fresh fish','Dried fish','Stockfish','Crayfish','Chicken','Beef','Goat meat','Turkey','Eggs','Pomo','Cow tripe','Snails','Groundnuts']},
  {id:'cooking',label:'Cooking Essentials',items:['Palm oil','Vegetable oil','Groundnut oil','Salt','Sugar','Seasoning cubes','Dry pepper','Curry','Thyme','Ginger','Garlic','Locust beans / iru','Coconut']},
  {id:'pantry',label:'Daily Pantry & Breakfast',items:['Spaghetti','Macaroni','Noodles','Bread','Flour','Custard','Oats','Milk','Tea','Cocoa','Butter','Akara beans']},
  {id:'fruit',label:'Fruit & Fresh Produce',items:['Banana','Orange','Pineapple','Watermelon','Avocado / pear','Mango','Cucumber','Carrots','Cabbage']},
] as const
export type HouseholdGroup=(typeof WEAVE_HOUSEHOLD_FOOD_GROUPS)[number]['id']
export const WEAVE_HOUSEHOLD_BASKET_TEMPLATES=[
  {id:'family-starter',name:'Family Starter Basket',description:'Everyday rice, beans, garri and basic cooking ingredients.',suggested:['Rice','Beans','Garri','Palm oil','Salt','Onions']},
  {id:'soup-kitchen',name:'Nigerian Soup Basket',description:'Soup vegetables, egusi or ogbono, pepper, oil and protein.',suggested:['Egusi','Ogbono','Ugu','Pepper','Palm oil','Crayfish']},
  {id:'weekly-provisions',name:'Weekly Provisions Basket',description:'Core family grains, cooking essentials and a protein source.',suggested:['Rice','Beans','Yam','Tomatoes','Pepper','Fish','Cooking oil']},
  {id:'breakfast-pantry',name:'Breakfast & Pantry Basket',description:'Morning staples and useful pantry ingredients.',suggested:['Bread','Pap','Milk','Oats','Eggs','Tea']},
] as const
export type HouseholdBasketTemplate=(typeof WEAVE_HOUSEHOLD_BASKET_TEMPLATES)[number]['id']
export const isHouseholdBasketTemplate=(value:unknown):value is HouseholdBasketTemplate=>
  WEAVE_HOUSEHOLD_BASKET_TEMPLATES.some(t=>t.id===value)
export function householdBasketTemplate(id:HouseholdBasketTemplate){
  return WEAVE_HOUSEHOLD_BASKET_TEMPLATES.find(t=>t.id===id)!
}

export type HouseholdBasketItem={offerId:string;quantity:number}
export type HouseholdSourceOffer={
  id:string;produce:string;unit:string;unit_price_ngn:number|string;
  available_quantity:number|string;status?:string
}
export function quoteHouseholdBasket(
  items:HouseholdBasketItem[],offers:HouseholdSourceOffer[],basketPriceNgn:number
){
  if(!Array.isArray(items)||items.length<3||items.length>15||
    new Set(items.map(x=>x.offerId)).size!==items.length ||
    !Number.isFinite(basketPriceNgn)||basketPriceNgn<=1000||
    !Number.isInteger(Math.round(basketPriceNgn*100))||
    Math.abs(Math.round(basketPriceNgn*100)-basketPriceNgn*100)>.001)
    throw new Error('Choose three to fifteen different foods and a valid basket price greater than ₦1,000.')
  const byId=new Map(offers.map(offer=>[offer.id,offer]))
  let separateNgn=0
  const components=items.map(item=>{
    const offer=byId.get(item.offerId)
    if(!offer||offer.status!=='active'||
      !Number.isFinite(item.quantity)||item.quantity<=0||
      Math.abs(Math.round(item.quantity*100)-item.quantity*100)>.001||
      item.quantity>Number(offer.available_quantity)||
      !Number.isFinite(Number(offer.unit_price_ngn))||Number(offer.unit_price_ngn)<=0)
      throw new Error('Every basket ingredient must match available, active supplier stock and a valid quantity.')
    const part=Math.round(Number(offer.unit_price_ngn)*item.quantity*100)/100
    separateNgn+=part
    return {offerId:offer.id,name:offer.produce,unit:offer.unit,quantity:item.quantity,listedUnitPriceNgn:Number(offer.unit_price_ngn),referencePartNgn:part}
  })
  separateNgn=Math.round(separateNgn*100)/100
  const saveNgn=Math.round((separateNgn-basketPriceNgn)*100)/100
  if(saveNgn<=0)throw new Error('The prepacked basket must cost less than these same items listed individually by this supplier.')
  return {components,separateNgn,basketPriceNgn,saveNgn}
}
