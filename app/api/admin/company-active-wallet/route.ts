import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'
import {WORLD_RULES} from '@/lib/world/constants'
import {configureProReceivingWallet,ensureProActivationSchema,getReceivingWallet} from '@/lib/pro-file-folder-activation'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}

async function authorize(request:NextRequest){
 const user=await getAuthUser(request)
 return user?.role==='admin'?user:null
}

/**
 * Company Wallet Settings are internal Administrations control.
 * The Pro USDT (TRC-20) receiving address is shared by both Pro onboarding
 * entrances. We deliberately do not rewrite the independent company TRX
 * Flame Coin funding rail or prior payment evidence.
 */
export async function GET(request:NextRequest){
 const user=await authorize(request)
 if(!user)return NextResponse.json({error:'Administrations access required'},{status:403,headers})
 try{
  await ensureProActivationSchema()
  const [config]=await sql`SELECT wallet_address,updated_at FROM pro_activation_wallet_config WHERE id=1 LIMIT 1`
  const history=await sql`SELECT previous_wallet,new_wallet,change_reason,changed_at
    FROM pro_activation_wallet_change_audit ORDER BY changed_at DESC LIMIT 12`
  const activeWallet=await getReceivingWallet()
  return NextResponse.json({
    success:true,rail:'pro_usdt_trc20',network:'TRON (TRC-20)',asset:'USDT',
    activeWallet,configuredInAdministration:Boolean(config?.wallet_address),
    lastUpdatedAt:config?.updated_at||null,history,
    companyTrxFundingWallet:WORLD_RULES.COMPANY_TRX_WALLET,
    notice:'The company TRX funding address and the Pro USDT receiving address serve distinct payment records. This setting changes only the Pro USDT destination; prior payment evidence remains tied to its original wallet.'
  },{headers})
 }catch(error){
  console.error('[Company wallet Administrations GET]',error)
  return NextResponse.json({error:'Company wallet settings unavailable'},{status:500,headers})
 }
}

export async function POST(request:NextRequest){
 const user=await authorize(request)
 if(!user)return NextResponse.json({error:'Administrations access required'},{status:403,headers})
 const body=await request.json().catch(()=>({}))
 if(body.action!=='configure_pro_wallet'||body.confirmation!=='SET COMPANY PRO WALLET'||
   body.controlVerified!==true)
  return NextResponse.json({error:'Confirm the official Pro USDT wallet setting and independently check company control of the receiving address.'},
   {status:400,headers})
 if(!Object.prototype.hasOwnProperty.call(body,'expectedCurrentWallet'))
  return NextResponse.json({error:'Reload the current company wallet before changing it.'},{status:409,headers})
 try{
  const result=await configureProReceivingWallet({
   actorId:user.id,address:String(body.walletAddress||''),
   reason:String(body.changeReason||''),
   expectedCurrent:body.expectedCurrentWallet===null?null:String(body.expectedCurrentWallet),
  })
  return NextResponse.json({success:true,...result,notice:result.changed
   ?'Official Pro USDT receiving address saved and change audited. New, eligible payment stages will use it; existing submitted receipts retain their original destination.'
   :'No address change was required.'},{headers})
 }catch(error){
  console.error('[Company wallet Administrations POST]',error)
  return NextResponse.json({error:error instanceof Error?error.message:'Unable to save company Pro receiving address'},
    {status:409,headers})
 }
}
