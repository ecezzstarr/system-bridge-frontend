import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'
import type { WeaveFoodVariant } from '@/lib/weave-food-types'

export const EMBER_PACKAGES_PER_CARTON=10
export const EMBER_OPAY_ACCOUNT_NUMBER=WEAVE_OPAY_ACCOUNT_NUMBER
export const EMBER_AGENT_EARNING_PER_PACK_NGN=1000
export const EMBER_ADMIN_ALLOCATION_PER_PACKAGE_NGN=800
export const EMBER_FAMILY_SUPPORT_PER_PACKAGE_NGN=200
export const EMBER_VARIANTS:WeaveFoodVariant[]=[
 {id:'ember-small',family:'ember',name:'Ember · Small Box',accent:'Evening · Small',foods:['Roasted plantain','Seasoned yam','Pepper sauce'],protein:'Suya beef or chicken',fruit:'',drink:'',water:'',
  packagesPerBox:10,agentBuyUnitPriceNgn:5000,agentSellingUnitPriceNgn:6000,customerPriceLocked:true,
  note:'A rich hot evening combination. Customer ₦6,000, selling Agent ₦1,000; WEAVE ₦5,000 for preparation and Administration.'},
 {id:'ember-large',family:'ember',name:'Ember · Large Box',accent:'Evening · Large',foods:['Roasted plantain','Seasoned yam','Pepper sauce'],protein:'Suya beef or chicken',fruit:'',drink:'',water:'',
  packagesPerBox:10,agentBuyUnitPriceNgn:11000,agentSellingUnitPriceNgn:12000,customerPriceLocked:true,
  note:'A generous hot evening combination. Customer ₦12,000, selling Agent ₦1,000; WEAVE ₦11,000 for preparation and Administration.'},
]
export const EMBER_PROCESS=[
 {stage:'Order',detail:'Agent orders a Small or Large carton of 10 boxes from WEAVE.'},
 {stage:'Pay',detail:'Agent pays the official WEAVE OPay stock amount and submits the bank reference.'},
 {stage:'Verify',detail:'Administration independently verifies received funds before production is authorized.'},
 {stage:'Prepare',detail:'The approved food-preparation Lead Agent prepares fresh suya beef or chicken, roasted plantain, seasoned yam and pepper sauce.'},
 {stage:'Pack',detail:'Check selected portion size, safe hot-food handling, clean sealed packaging and correct count.'},
 {stage:'Dispatch',detail:'Record dispatch, delivery, and Agent physical receipt.'},
 {stage:'Sell',detail:'Agent sells by individual box at their Customer Carrier Door; customer payment is verified before handoff.'},
] as const
export function getEmberVariant(id:string){return EMBER_VARIANTS.find(v=>v.id===id)||null}
export function isEmberVariant(id:string){return Boolean(getEmberVariant(id))}
export function nextEmberAdminStage(stage:string){
 const steps=['paid','preparing','packed','dispatched','delivered']
 const i=steps.indexOf(stage)
 return i<0||i===steps.length-1?null:steps[i+1]
}
export function emberMoneySplit(id:string){
 const variant=getEmberVariant(id)
 if(!variant)return null
 const retail=Number(variant.agentSellingUnitPriceNgn),agent=EMBER_AGENT_EARNING_PER_PACK_NGN,admin=EMBER_ADMIN_ALLOCATION_PER_PACKAGE_NGN
 return {retailNgn:retail,agentNgn:agent,administrationNgn:admin,familySupportNgn:EMBER_FAMILY_SUPPORT_PER_PACKAGE_NGN,preparationBudgetNgn:retail-agent-admin-EMBER_FAMILY_SUPPORT_PER_PACKAGE_NGN}
}
