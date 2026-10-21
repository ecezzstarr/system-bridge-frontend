import { NextRequest,NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { requireFoodBridgePosition, foodBridgeError } from '@/lib/food-bridge-access'
import { ensureFoodBridgeSchema, expireFoodRequests, safeText, validPhone, validQuantity, validNaira } from '@/lib/food-bridge'
import { FOOD_BRIDGE_STATES,validFoodState,validFoodUnit } from '@/lib/food-bridge-states'
import { isHouseholdBasketTemplate,householdBasketTemplate,quoteHouseholdBasket } from '@/lib/weave-household-food-store'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest) {
  try {
    await requireFoodBridgePosition(request)
    await expireFoodRequests()
    const origin=request.nextUrl.searchParams.get('origin')||''
    const term=safeText(request.nextUrl.searchParams.get('search'),80)
    if (origin && !validFoodState(origin)) return NextResponse.json({error:'Unknown origin state'},{status:400})
    const {rows}=await getPool().query(`
      SELECT l.id,l.produce,l.unit,l.available_quantity,l.minimum_quantity,
        l.unit_price_ngn,l.details,f.farm_name,f.state,f.community,
        b.components AS basket_components,b.separate_listed_ngn AS basket_individual_total_ngn,
        b.listing_saving_ngn AS basket_listed_saving_ngn
      FROM weave_food_surplus l
      JOIN weave_food_farmers f ON f.id=l.farmer_id
      LEFT JOIN weave_food_household_bundles b ON b.listing_id=l.id
      WHERE f.status='approved' AND l.status='active' AND l.available_quantity>=l.minimum_quantity
        AND ($1::text='' OR f.state=$1)
        AND ($2::text='' OR l.produce ILIKE '%' || $2 || '%')
      ORDER BY l.created_at DESC LIMIT 100
    `,[origin,term])
    return NextResponse.json({success:true,offers:rows,states:FOOD_BRIDGE_STATES},{headers:{'Cache-Control':'no-store'}})
  } catch(error) {
    console.error('[lifestyle food] GET',error)
    return NextResponse.json({error:foodBridgeError(error)===500?'Food market unavailable':(error as Error).message},{status:foodBridgeError(error)})
  }
}

export async function POST(request:NextRequest) {
  try {
    const user=await requireFoodBridgePosition(request)
    if(user.role!=='agent')return NextResponse.json({error:'Only an Agent who farms can publish produce. Bridgers can buy.'},{status:403})
    await ensureFoodBridgeSchema()
    const body=await request.json().catch(()=>({}))
    if(body.action==='register') {
      const name=safeText(body.farmName,120)
      const phone=safeText(body.contact,60)
      const community=safeText(body.community,120)
      if (name.length<3 || !validPhone(phone) || community.length<3 || !validFoodState(body.state)) {
        return NextResponse.json({error:'Enter your farm name, contact, state and actual village'},{status:400})
      }
      const {rows}=await getPool().query(`
        INSERT INTO weave_food_farmers (agent_id,farm_name,contact_private,state,community,consent_contact_sharing)
        VALUES ($1::uuid,$2,$3,$4,$5,$6)
        ON CONFLICT (agent_id) DO UPDATE SET
          farm_name=EXCLUDED.farm_name,
          contact_private=EXCLUDED.contact_private,
          state=EXCLUDED.state,
          community=EXCLUDED.community,
          consent_contact_sharing=EXCLUDED.consent_contact_sharing,
          status='pending',reviewed_by=NULL,review_note=NULL,reviewed_at=NULL,updated_at=NOW()
        WHERE weave_food_farmers.status='rejected'
        RETURNING id,status,farm_name,state,community
      `,[user.id,name,phone,body.state,community,body.shareFarmerContact===true])
      return rows.length ? NextResponse.json({success:true,farmer:rows[0],message:'Farm registered under your Agent account for Administration verification.'},{status:201})
        : NextResponse.json({error:'Your Agent account already has a registered farm.'},{status:409})
    }
    if(body.action==='set_payout_account'){
      const bank=safeText(body.bankName,120)
      const account=safeText(body.accountNumber,30).replace(/\s/g,'')
      const name=safeText(body.accountName,150)
      if(bank.length<3||name.length<3||!/^\d{10,16}$/.test(account))
        return NextResponse.json({error:'Provide a valid bank name, account name and 10–16 digit receiving account.'},{status:400})
      const {rows}=await getPool().query(`
        UPDATE weave_food_farmers
        SET payout_bank_name=$2,payout_account_number=$3,payout_account_name=$4,updated_at=NOW()
        WHERE agent_id=$1::uuid AND status='approved' RETURNING id
      `,[user.id,bank,account,name])
      return rows.length?NextResponse.json({success:true,message:'Seller payout details saved privately for Administration; bank ownership must be checked before money is sent.'})
        :NextResponse.json({error:'Administration must approve your farm first.'},{status:403})
    }
    if(body.action==='household_bundle'){
      // A discount is shown only when this same approved supplier has real
      // individual-item listings to compare against, and packs are independently
      // physically set aside (never sold again as loose stock).
      if(!isHouseholdBasketTemplate(body.templateId))
        return NextResponse.json({error:'Choose a recognized WEAVE Family Basket.'},{status:400})
      const count=Number(body.packCount),price=Number(body.priceNgn)
      const label=safeText(body.packLabel,75)
      const attested=body.stockAttestedSeparate===true
      const items=body.components
      if(!Number.isSafeInteger(count)||count<1||count>100||!validNaira(price)||price<=1000||
          !attested||!Array.isArray(items)||items.length<3||items.length>15)
        return NextResponse.json({error:'Provide 1–100 separately packed baskets, a discounted sale price, three or more actual food items and confirm that the pack stock is independently counted.'},{status:400})
      const ids=items.map((item:{offerId?:unknown})=>item?.offerId)
      if(!ids.every((id:unknown)=>typeof id==='string' && /^[0-9a-f-]{36}$/i.test(id)))
        return NextResponse.json({error:'Select genuine items from your own approved supplier listings.'},{status:400})
      const pool=getPool(),client=await pool.connect()
      try{
        await client.query('BEGIN')
        const {rows:farms}=await client.query(`
          SELECT id FROM weave_food_farmers
          WHERE agent_id=$1::uuid AND status='approved' FOR UPDATE
        `,[user.id])
        const farmer=farms[0]
        if(!farmer){
          await client.query('ROLLBACK')
          return NextResponse.json({error:'Only approved Agent suppliers may publish branded family baskets.'},{status:403})
        }
        const {rows:sources}=await client.query(`
          SELECT l.id,l.produce,l.unit,l.unit_price_ngn,l.available_quantity,l.status
          FROM weave_food_surplus l
          LEFT JOIN weave_food_household_bundles b ON b.listing_id=l.id
          WHERE l.farmer_id=$1::uuid AND l.id=ANY($2::uuid[]) AND b.listing_id IS NULL
          ORDER BY l.id FOR SHARE OF l
        `,[farmer.id,ids])
        const priceCheck=quoteHouseholdBasket(
          items.map((item:{offerId:string;quantity:unknown})=>({offerId:item.offerId,quantity:Number(item.quantity)})),
          sources,price
        )
        const template=householdBasketTemplate(body.templateId)
        const title='WEAVE '+template.name+(label?' · '+label:'')
        if(title.length>120)throw new Error('Basket label is too long.')
        const details=priceCheck.components.map(x=>x.quantity+' '+x.unit+' '+x.name).join(' · ').slice(0,500)
        const {rows:offers}=await client.query(`
          INSERT INTO weave_food_surplus(farmer_id,produce,unit,original_quantity,
            available_quantity,minimum_quantity,unit_price_ngn,details)
          VALUES($1::uuid,$2,'pack',$3,$3,1,$4,$5)
          RETURNING id,produce,unit,available_quantity,unit_price_ngn,status
        `,[farmer.id,title,count,price,details])
        await client.query(`
          INSERT INTO weave_food_household_bundles(
            listing_id,farmer_id,template_id,components,separate_listed_ngn,
            bundle_price_ngn,listing_saving_ngn,stock_attested_separate
          ) VALUES($1::uuid,$2::uuid,$3,$4::jsonb,$5,$6,$7,true)
        `,[offers[0].id,farmer.id,body.templateId,JSON.stringify(priceCheck.components),
          priceCheck.separateNgn,price,priceCheck.saveNgn])
        await client.query('COMMIT')
        return NextResponse.json({success:true,offer:offers[0],basket:{
          template:template.name,separateListedNgn:priceCheck.separateNgn,
          bundlePriceNgn:price,listingSavingNgn:priceCheck.saveNgn,components:priceCheck.components,
        },message:'Supplier-backed WEAVE Family Basket published. Savings compare your own individual listing prices at publication.'},{status:201})
      }catch(error){
        await client.query('ROLLBACK').catch(()=>{})
        if(error instanceof Error&&/(Basket|basket|supplier stock|ingredient|listings|compare|price|listed|quantity)/i.test(error.message))
          return NextResponse.json({error:error.message},{status:400})
        throw error
      }finally{client.release()}
    }
    if(body.action==='offer') {
      const name=safeText(body.produce,120),details=safeText(body.details,500)
      const qty=Number(body.quantity),min=Number(body.minimumQuantity),price=Number(body.priceNgn)
      if(name.length<2 || body.unit==='pack' || !validFoodUnit(body.unit) || !validQuantity(qty) || !validQuantity(min) || min>qty || !validNaira(price) || price<=0) {
        return NextResponse.json({error:'Enter genuine produce, unit, stock, minimum amount and positive naira price'},{status:400})
      }
      const {rows}=await getPool().query(`
        INSERT INTO weave_food_surplus
          (farmer_id,produce,unit,original_quantity,available_quantity,minimum_quantity,unit_price_ngn,details)
        SELECT id,$2,$3,$4,$4,$5,$6,$7
        FROM weave_food_farmers WHERE agent_id=$1::uuid AND status='approved'
        RETURNING id,produce,unit,available_quantity,unit_price_ngn,status
      `,[user.id,name,body.unit,qty,min,price,details])
      return rows.length ? NextResponse.json({success:true,offer:rows[0]},{status:201})
        : NextResponse.json({error:'Administration must verify this Agent farm before its offers can go live.'},{status:403})
    }
    return NextResponse.json({error:'Unknown food action'},{status:400})
  } catch(error) {
    console.error('[lifestyle food] POST',error)
    return NextResponse.json({error:foodBridgeError(error)===500?'Unable to register food movement':(error as Error).message},{status:foodBridgeError(error)})
  }
}
