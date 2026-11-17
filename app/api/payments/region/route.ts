import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {getTrxPaymentNgnRate} from '@/lib/trx-payment'
import {paymentRegion,validWeaveCountry,type WeaveCheckoutPurpose} from '@/lib/weave-payment-region'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization'}
const out=(record:object,status=200)=>NextResponse.json(record,{status,headers})
async function ensureCountrySchema(){
 await getPool().query(`CREATE TABLE IF NOT EXISTS weave_payment_country_preferences(
   user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
   country_code varchar(8) NOT NULL,
   confirmed_at timestamptz NOT NULL DEFAULT NOW(),
   updated_at timestamptz NOT NULL DEFAULT NOW()
 )`)
}
function purposeOf(value:string|null):WeaveCheckoutPurpose{
 return value==='file_folder'?'file_folder':'wallet_deposit'
}
async function storedCountry(userId:string){
 await ensureCountrySchema()
 const r=await getPool().query('SELECT country_code FROM weave_payment_country_preferences WHERE user_id=$1::uuid',[userId])
 return validWeaveCountry(r.rows[0]?.country_code)
}
export async function GET(request:NextRequest){
 try{
  const user=await getAuthUser(request)
  const params=request.nextUrl.searchParams
  const purpose=purposeOf(params.get('purpose'))
  // Public purchasers may provide a selected country for quote display;
  // account users are always routed using the confirmed persisted choice.
  const requestedCountry=validWeaveCountry(params.get('country'))
  const confirmed=user?await storedCountry(user.id):null
  const selected=confirmed||(!user?requestedCountry:null)
  const routing=paymentRegion(selected,purpose)
  const amount=Number(params.get('amountSwitch')||0)
  let quote:null|{amountSwitch:number;payCurrency:string;payAmount:number;
    rateNgnPerTrx:number|null;rateSource:string;excludesProviderFees:boolean}=null
  if(Number.isFinite(amount)&&amount>0&&amount<=100_000_000){
    if(routing.defaultRail==='paystack_ngn'){
      const rate=await getTrxPaymentNgnRate()
      // Never silently use an outdated fallback for live checkout quotes.
      if(rate.source==='live'){
        const payAmount=Math.round(amount*rate.rateNgnPerTrx*100)/100
        quote={amountSwitch:amount,payCurrency:'NGN',payAmount,
          rateNgnPerTrx:rate.rateNgnPerTrx,rateSource:'live',excludesProviderFees:true}
      }
    }else if(routing.defaultRail==='tron_trx'){
      quote={amountSwitch:amount,payCurrency:'TRX',payAmount:amount,
        rateNgnPerTrx:null,rateSource:'unit-reference',excludesProviderFees:true}
    }
  }
  return out({success:true,purpose,...routing,quote,selectionSource:confirmed?'account':
    requestedCountry&&!user?'public_choice':'not_confirmed',
    paymentReady:Boolean(quote)&&routing.methods.some(x=>x.id===routing.defaultRail&&x.available),
    notice:purpose==='wallet_deposit'&&routing.defaultRail==='tron_trx'?
     'Wallet TRX deposits are currently retired. No TRX wallet deposit will be initiated until the verified funding rail is enabled.':
     routing.notice})
 }catch(error){
  console.error('[payment region GET]',error)
  return out({error:'Checkout routing is temporarily unavailable'},503)
 }
}
export async function POST(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return out({error:'Sign in to save a country preference'},401)
 try{
  const body=await request.json().catch(()=>({}))
  const country=validWeaveCountry(body.country)
  if(!country||body.confirmedByUser!==true)return out({error:'Select and confirm your payment country'},422)
  await ensureCountrySchema()
  await getPool().query(`INSERT INTO weave_payment_country_preferences(user_id,country_code)
    VALUES($1::uuid,$2) ON CONFLICT(user_id) DO UPDATE
    SET country_code=EXCLUDED.country_code,confirmed_at=NOW(),updated_at=NOW()`,[user.id,country])
  return out({success:true,...paymentRegion(country,purposeOf(String(body.purpose||''))),
    selectionSource:'account',notice:'Country preference saved for future checkout. You may change it whenever your residence or payment preference changes.'})
 }catch(error){
  console.error('[payment region POST]',error)
  return out({error:'Unable to save payment country'},503)
 }
}
