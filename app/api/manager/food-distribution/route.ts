import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  FOOD_DISTRIBUTION_PRODUCT_TYPES,
  getFoodDistributionTeamState,
  resolveFoodDistributionManagerId,
  submitFoodDistributionRecord,
} from '@/lib/food-distribution'

export const dynamic = 'force-dynamic'

export async function GET(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if(!['agent','bridger'].includes(user.role))return NextResponse.json({success:false,error:'Agent or Bridger position required'},{status:403})
  try {
    const managerId=await resolveFoodDistributionManagerId(user.id)
    if(!managerId)return NextResponse.json({success:false,error:'An approved Food Distribution Manager or Assistant Food Distribution Manager appointment is required.'},{status:403})
    const team=await getFoodDistributionTeamState(managerId)
    if(!team)return NextResponse.json({success:false,error:'The food distribution team is not active.'},{status:409})
    return NextResponse.json({success:true,team,productTypes:FOOD_DISTRIBUTION_PRODUCT_TYPES},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    console.error('[food-distribution] GET failed',error)
    return NextResponse.json({success:false,error:'Food distribution records are temporarily unavailable.'},{status:500})
  }
}

export async function POST(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if(!['agent','bridger'].includes(user.role))return NextResponse.json({success:false,error:'Agent or Bridger position required'},{status:403})
  const body=await request.json().catch(()=>({}))
  try {
    const result=await submitFoodDistributionRecord(user.id,{
      productType:String(body.productType||''),
      customerType:String(body.customerType||''),
      recipientName:String(body.recipientName||''),
      quantity:Number(body.quantity),
      evidenceReference:String(body.evidenceReference||''),
      distributionDate:String(body.distributionDate||''),
    })
    if(!result.success) {
      const errors:Record<string,string>={
        invalid_product:'Choose a listed WEAVE food product type.',
        invalid_customer_type:'Choose consumer or business.',
        invalid_record:'Provide the recipient, a positive quantity, and an order/receipt reference.',
        invalid_date:'Enter a valid distribution date that is not in the future.',
        not_appointed:'Only an appointed Food Distribution Manager or Assistant Food Distribution Manager can record team distribution.',
      }
      return NextResponse.json({success:false,error:errors[result.reason]||'Could not record food distribution.'},{status:result.reason==='not_appointed'?403:400})
    }
    return NextResponse.json({success:true,record:result.record,message:'Distribution submitted for Administration verification. It does not count toward the monthly target until verified.'},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    console.error('[food-distribution] POST failed',error)
    return NextResponse.json({success:false,error:'Food distribution could not be recorded.'},{status:500})
  }
}
