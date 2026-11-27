import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {buyFlamePack,flamePackQuote,flameUsageStatus} from '@/lib/flame-usage'
export const dynamic='force-dynamic'
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}})
export async function GET(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return reply({error:'Active WEAVE login required'},401)
 try{
  const subscription=await flameUsageStatus(user.id,user.role)
  const quote=user.role==='admin'?null:await flamePackQuote().catch(()=>null)
  return reply({subscription,quote})
 }catch{return reply({error:'Flame subscription is unavailable'},503)}
}
export async function POST(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return reply({error:'Active WEAVE login required'},401)
 if(user.role==='admin')return reply({error:'Administrations is exempt'},403)
 const body=await request.json().catch(()=>null)
 if(body?.confirmation!=='BUY FLAME USAGE')return reply({error:'Explicit purchase confirmation required'},400)
 try{
  const result=await buyFlamePack(user.id,user.role,String(body.requestId||''),Number(body.expectedUsdCents),Number(body.maxAmountTrx))
  return reply({...result,subscription:await flameUsageStatus(user.id,user.role)})
 }catch(e){return reply({error:e instanceof Error&&/^(Price or exchange|Insufficient|Subscription settlement|Company settlement|Live USD|Valid purchase)/.test(e.message)?e.message:'Purchase not confirmed. Refresh before retrying.'},409)}
}
