import {createHash,randomUUID} from 'node:crypto'
import {getPool} from '@/lib/db'
import {ensureWeaveReceiptSchema} from '@/lib/weave-receipts'
import {
  findImageSample,normalizeSampleEdits,renderWeaveSampleSvg,
  type SampleEdits,
} from '@/lib/weave-image-sample-art'

export const IMAGE_SAMPLE_PRODUCER_ROLES=new Set(['agent','bridger','client','admin'])
export const WEAVE_IMAGE_SAMPLE_DEFAULT_FEE=1
export type SampleLicense={
  id:string;sample_id:string;edits:SampleEdits;fee_system_switch:number;
  receipt_number:string|null;service_order_id:string|null;created_at:string
}
let schemaPromise:Promise<void>|null=null

export async function ensureSampleCommerceSchema(){
  if(!schemaPromise){
    schemaPromise=(async()=>{
      const pool=getPool()
      await ensureWeaveReceiptSchema()
      await pool.query("CREATE TABLE IF NOT EXISTS weave_image_sample_settings (key varchar(30) PRIMARY KEY, export_fee numeric(20,8) NOT NULL CHECK (export_fee>=0 AND export_fee<=1000), updated_at timestamptz NOT NULL DEFAULT now())")
      await pool.query("INSERT INTO weave_image_sample_settings(key,export_fee) VALUES('company',1) ON CONFLICT(key) DO NOTHING")
      await pool.query("CREATE TABLE IF NOT EXISTS weave_image_sample_licenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,sample_id varchar(80) NOT NULL,edits jsonb NOT NULL,content_hash varchar(64) NOT NULL,svg_snapshot text NOT NULL,fee_system_switch numeric(20,8) NOT NULL,receipt_number varchar(80),service_order_id uuid,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,content_hash))")
      await pool.query("CREATE INDEX IF NOT EXISTS weave_image_samples_user_idx ON weave_image_sample_licenses(user_id,created_at DESC)")
      await pool.query("CREATE TABLE IF NOT EXISTS weave_image_sample_providers (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,public_code varchar(32) NOT NULL UNIQUE,display_name varchar(160) NOT NULL,description varchar(350) NOT NULL DEFAULT '',example_price_ngn numeric(20,2) CHECK (example_price_ngn>=0 AND example_price_ngn<=100000000),active boolean NOT NULL DEFAULT true,updated_at timestamptz NOT NULL DEFAULT now())")
      await pool.query("CREATE TABLE IF NOT EXISTS weave_image_sample_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,sample_id varchar(80),customer_name varchar(140) NOT NULL,customer_contact varchar(180) NOT NULL,customer_brief text NOT NULL,quoted_price_ngn numeric(20,2),status varchar(24) NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','accepted','completed','rejected')),customer_payment_status varchar(24) NOT NULL DEFAULT 'unverified' CHECK(customer_payment_status IN ('unverified','reported_received')),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())")
      await pool.query("CREATE INDEX IF NOT EXISTS weave_image_sample_requests_provider_idx ON weave_image_sample_requests(provider_user_id,created_at DESC)")
    })().catch(error=>{schemaPromise=null;throw error})
  }
  await schemaPromise
}
export function sampleFingerprint(sampleId:string,edits:SampleEdits,serviceOrderId:string|null=null){
  // The same graphic licensed for a different customer commission is a separate commercial delivery.
  return createHash('sha256').update(JSON.stringify({sampleId,edits,serviceOrderId})).digest('hex')
}
export async function getSampleFee(){
  await ensureSampleCommerceSchema()
  const row=(await getPool().query("SELECT export_fee FROM weave_image_sample_settings WHERE key='company'")).rows[0]
  return Number(row?.export_fee??WEAVE_IMAGE_SAMPLE_DEFAULT_FEE)
}
export async function sampleProviderProfile(userId:string,defaultName:string){
  await ensureSampleCommerceSchema()
  const pool=getPool()
  const row=(await pool.query("INSERT INTO weave_image_sample_providers(user_id,public_code,display_name) VALUES($1::uuid,$2,$3) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING public_code,display_name,description,example_price_ngn,active",
    [userId,randomUUID().replace(/-/g,'').slice(0,16),defaultName.slice(0,160)])).rows[0]
  return row
}
export async function readSampleStudio(userId:string,defaultName:string,role:string){
  await ensureSampleCommerceSchema()
  const pool=getPool()
  const [fee,licenses,requests,wallet,profile]=await Promise.all([
    getSampleFee(),
    pool.query("SELECT id,sample_id,edits,fee_system_switch,receipt_number,service_order_id,created_at FROM weave_image_sample_licenses WHERE user_id=$1::uuid ORDER BY created_at DESC LIMIT 80",[userId]),
    pool.query("SELECT id,sample_id,customer_name,customer_contact,customer_brief,quoted_price_ngn,status,customer_payment_status,created_at FROM weave_image_sample_requests WHERE provider_user_id=$1::uuid ORDER BY created_at DESC LIMIT 60",[userId]),
    pool.query("SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1",[userId]),
    role==='admin'?Promise.resolve(null):sampleProviderProfile(userId,defaultName),
  ])
  const result:Record<string,unknown>={
    fee,licenses:licenses.rows,requests:requests.rows,
    walletBalance:Number(wallet.rows[0]?.balance_trx||0),profile,
  }
  if(role==='admin'){
    const daily=(await pool.query("SELECT date_trunc('day',created_at) AS day,count(*)::int AS sales,COALESCE(SUM(fee_system_switch),0)::numeric AS company_earned FROM weave_image_sample_licenses WHERE fee_system_switch>0 AND created_at>=now()-interval '14 days' GROUP BY 1 ORDER BY 1 DESC")).rows
    result.companyDaily=daily.map((row:any)=>({day:row.day,sales:Number(row.sales),companyEarned:Number(row.company_earned)}))
  }
  return result
}
export type SampleCheckoutResult={
  existing:boolean;license:SampleLicense;paid:number;balance:number|null
}
export class SampleBusinessError extends Error{
  constructor(public code:string,message:string,public status=400){super(message)}
}

export async function purchaseSampleLicense(userId:string,role:string,sampleId:string,rawEdits:unknown,serviceOrderId:string|null=null):Promise<SampleCheckoutResult>{
  const sample=findImageSample(sampleId)
  if(!sample)throw new SampleBusinessError('NOT_FOUND','Select an available WEAVE original sample.',404)
  await ensureSampleCommerceSchema()
  const edits=normalizeSampleEdits(sample,rawEdits)
  if(!edits.brand||!edits.headline||!edits.action)throw new SampleBusinessError('INVALID','Provide a business name, headline and customer action.')
  const hash=sampleFingerprint(sampleId,edits,serviceOrderId)
  const svg=renderWeaveSampleSvg(sample,edits,false)
  const pool=getPool()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    // Lock the primary wallet even for duplicate purchases, preventing double charges.
    const walletRow=(await client.query('SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',[userId])).rows[0]
    const existing=(await client.query("SELECT id,sample_id,edits,fee_system_switch,receipt_number,service_order_id,created_at FROM weave_image_sample_licenses WHERE user_id=$1::uuid AND content_hash=$2 LIMIT 1",[userId,hash])).rows[0]
    if(existing){
      await client.query('COMMIT')
      return {existing:true,license:existing,paid:0,balance:walletRow?Number(walletRow.balance_trx):null}
    }
    if(serviceOrderId){
      const order=(await client.query("SELECT id FROM weave_image_sample_requests WHERE id=$1::uuid AND provider_user_id=$2::uuid AND status IN ('accepted','completed') FOR UPDATE",
        [serviceOrderId,userId])).rows[0]
      if(!order)throw new SampleBusinessError('INVALID_ORDER','Select an accepted customer request.',404)
    }
    const feeRow=(await client.query("SELECT export_fee FROM weave_image_sample_settings WHERE key='company' FOR SHARE")).rows[0]
    const fee=role==='admin'?0:Number(feeRow?.export_fee??WEAVE_IMAGE_SAMPLE_DEFAULT_FEE)
    const balance=walletRow?Number(walletRow.balance_trx):0
    if(fee>0&&(!walletRow||balance<fee))throw new SampleBusinessError('INSUFFICIENT_SYSTEM_SWITCH',
      'Not enough System Switch to license and export this finished design. Deposit or choose the free classic layout maker.',402)
    if(fee>0){
      await client.query('UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=now() WHERE id=$2::uuid',[fee,walletRow.id])
    }
    const receipt=fee>0?'WEAVE-PUR-'+Date.now()+'-'+randomUUID().slice(0,8).toUpperCase():null
    const license=(await client.query("INSERT INTO weave_image_sample_licenses (user_id,sample_id,edits,content_hash,svg_snapshot,fee_system_switch,receipt_number,service_order_id) VALUES($1::uuid,$2,$3::jsonb,$4,$5,$6,$7,$8::uuid) RETURNING id,sample_id,edits,fee_system_switch,receipt_number,service_order_id,created_at",
      [userId,sampleId,JSON.stringify(edits),hash,svg,fee,receipt,serviceOrderId])).rows[0]
    if(receipt){
      await client.query("INSERT INTO weave_receipts (receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata) VALUES($1,$2::uuid,'purchase','image_sample_workshop',$3,$4,'SYSTEM_SWITCH','paid',$5,$6::jsonb)",
        [receipt,userId,license.id,fee,'WEAVE original image template · commercial production license',
         JSON.stringify({sampleId,format:edits.format,serviceOrderId,companyEarning:true})])
    }
    await client.query('COMMIT')
    return {existing:false,license,paid:fee,balance:walletRow?balance-fee:null}
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{client.release()}
}
