import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { settleCustomerDoorPayment, validDoorUuid } from '@/lib/customer-door-settlement'
import { notifyAdminOrder } from '@/lib/admin-order-notifications'

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Sign in to WEAVE to pay from your Main Wallet. Visitors may also use the external payment instructions.'},{status:401})
  const role=String(user.baseRole || user.role || '').toLowerCase()
  if(!['agent','bridger','client'].includes(role)){
    return NextResponse.json({success:false,error:'An active WEAVE wallet is required to pay from the platform'},{status:403})
  }
  const {id}=await params
  if(!validDoorUuid(id))return NextResponse.json({error:'Invalid Customer Door order'},{status:400})
  const result=await settleCustomerDoorPayment({orderId:id,fundingUserId:String(user.id),source:'weave_wallet'})
  if(!result.success)return NextResponse.json(result,{status:result.status||500})
  if(!result.alreadyPaid){
    try{
      await notifyAdminOrder({orderId:id,event:'paid',department:'client',subject:'Customer Door wallet payment',
        detail:`${result.amountFlameCoin} Flame Coin transferred from a customer to the Client Main Wallet. Receipt ${result.receiptNumber}.`,
        adminPath:'/admin/orders',actorId:String(user.id),actorName:String(user.name||'Customer')})
    }catch(e){console.error('[Customer Door notification]',e)}
  }
  return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}})
}
