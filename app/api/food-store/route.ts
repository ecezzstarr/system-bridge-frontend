import { NextRequest,NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureFoodBridgeSchema } from '@/lib/food-bridge'
import { ensureCarrierFoodSchema } from '@/lib/carrier-food'
import { WEAVE_HOUSEHOLD_FOOD_GROUPS,WEAVE_HOUSEHOLD_BASKET_TEMPLATES } from '@/lib/weave-household-food-store'
import { DAISY_PASTRIES_PRICE_BANDS } from '@/lib/cake-catalog'
import { AGILITY_RETAIL_UNIT_PRICE_NGN } from '@/lib/agility-catalog'
import { ELECTROLYTE_VARIANTS } from '@/lib/electrolyte-catalog'
import { EMBER_VARIANTS } from '@/lib/ember-catalog'
export const dynamic='force-dynamic'

/** Public catalogue: real approved Nigerian supplier inventory only.
 * Family basket discounts are supplier-backed price comparisons at listing time.
 * Actual checkout, transport quotes, and held payments happen at the Agent Door. */
export async function GET(_request:NextRequest){
  try{
    await Promise.all([ensureFoodBridgeSchema(),ensureCarrierFoodSchema()])
    const {rows}=await getPool().query(`
      SELECT l.id,l.produce,l.unit,l.unit_price_ngn,l.available_quantity,l.minimum_quantity,
        l.details,f.farm_name,f.state,f.community,u.name AS agent_name,u.username,u.referral_code,
        b.components AS basket_components,b.template_id AS basket_template_id,
        b.separate_listed_ngn AS basket_individual_total_ngn,
        b.listing_saving_ngn AS basket_listed_saving_ngn
      FROM weave_food_surplus l
      JOIN weave_food_farmers f ON f.id=l.farmer_id
      JOIN users u ON u.id=f.agent_id
      LEFT JOIN weave_food_household_bundles b ON b.listing_id=l.id
      WHERE f.status='approved' AND l.status='active'
        AND l.available_quantity>=l.minimum_quantity
        AND u.role='agent' AND u.is_active=true AND u.referral_code IS NOT NULL
      ORDER BY b.listing_id IS NOT NULL DESC,l.created_at DESC
      LIMIT 180
    `)
    const {rows:agents}=await getPool().query(`
      SELECT u.id,u.name,u.username,u.referral_code
      FROM carrier_food_agent_payment_accounts a
      JOIN users u ON u.id=a.agent_id
      WHERE u.role='agent' AND u.is_active=true AND u.referral_code IS NOT NULL
      ORDER BY a.updated_at DESC LIMIT 40
    `)
        return NextResponse.json({
      success:true,brand:'WEAVE Family Food Store',
      groups:WEAVE_HOUSEHOLD_FOOD_GROUPS,templates:WEAVE_HOUSEHOLD_BASKET_TEMPLATES,
      carrierAgents:agents.map(agent=>({
        name:agent.name||agent.username||'WEAVE Agent',
        carrierPath:'/carrier/food/'+encodeURIComponent(agent.referral_code)+'?checkout=1',
        daisyPath:'/carrier/food/'+encodeURIComponent(agent.referral_code)+'?checkout=1#agent-daisy-pastries',
      })),
      offers:rows.map(row=>({
        id:row.id,name:row.produce,unit:row.unit,
        priceNgn:Number(row.unit_price_ngn),availableQuantity:Number(row.available_quantity),
        details:row.details,farmName:row.farm_name,state:row.state,community:row.community,
        agentName:row.agent_name||row.username,carrierPath:'/carrier/food/'+encodeURIComponent(row.referral_code)+'?checkout=1#agent-farm-produce',
        isBasket:Boolean(row.basket_template_id),basketComponents:row.basket_components||[],
        basketReferenceAtListingNgn:row.basket_individual_total_ngn===null?null:Number(row.basket_individual_total_ngn),
        basketSavingsAtListingNgn:row.basket_listed_saving_ngn===null?null:Number(row.basket_listed_saving_ngn),
      })),
      prepared:{agilityNgn:AGILITY_RETAIL_UNIT_PRICE_NGN,
        electrolyte:ELECTROLYTE_VARIANTS.map(v=>({name:v.name,priceNgn:Number(v.agentSellingUnitPriceNgn)})),
        ember:EMBER_VARIANTS.map(v=>({name:v.name,priceNgn:Number(v.agentSellingUnitPriceNgn)}))},
      daisy:DAISY_PASTRIES_PRICE_BANDS.map(v=>({name:v.name,label:v.label})),
      checkout:'Use the named Agent Carrier Door. Household produce uses verified WEAVE farm escrow and one ₦1,000 seller fee per completed order. Daisy cake orders and prepared meal packages retain their own pricing and payment flows.',
    },{headers:{'Cache-Control':'public, max-age=0, must-revalidate'}})
  }catch(error){
    console.error('[weave family store] GET',error)
    return NextResponse.json({success:false,error:'The verified household food catalogue is temporarily unavailable.'},{status:503})
  }
}
