import {randomBytes,createHash} from 'node:crypto'
import {sql,getPool} from '@/lib/db'
import {CJ_DORADO_FILE_NUMBER} from '@/lib/client-file-folder'
import {getPaystackConfig} from '@/lib/paystack-config'
import {createPaystackReference,initializePaystackTransaction,verifyPaystackTransaction} from '@/lib/paystack'
export const CJ_EMPLOYEE_LOAN_USDT=680
type User={id:string;role?:string;name?:string;file_number?:string}
export const isCjDoradoAccount=(user:User)=>user.role==='client'&&user.file_number===CJ_DORADO_FILE_NUMBER
export async function getCjLoanGate(user:User){
 if(!isCjDoradoAccount(user))return null
 const [table]=await sql`SELECT to_regclass('public.client_folder_upgrades') AS name`
 if(!table?.name)return {status:'setup_pending' as const,remainingUSDT:CJ_EMPLOYEE_LOAN_USDT}
 const [row]=await sql`SELECT loan_principal_usdt,repayment_verified_usdt,loan_agreed_at,loan_funded_at,status
 FROM client_folder_upgrades WHERE client_id=${user.id}::uuid AND file_number=${CJ_DORADO_FILE_NUMBER} AND tier='pro' LIMIT 1`
 const verified=Number(row?.repayment_verified_usdt||0)
 const remaining=Math.max(0,Math.round((CJ_EMPLOYEE_LOAN_USDT-verified)*100)/100)
 if(!/\bcj\s+dorado\b/i.test(String(user.name||''))||!row||
 Number(row.loan_principal_usdt)!==CJ_EMPLOYEE_LOAN_USDT||!row.loan_agreed_at||!row.loan_funded_at||
 !['repayment_required','ready'].includes(String(row.status)))
  return {status:'setup_pending' as const,remainingUSDT:remaining}
 return {status:(remaining===0?'cleared':'payment_required') as 'cleared'|'payment_required',remainingUSDT:remaining}
}
async function ensureCheckoutSchema(){
 await sql`CREATE TABLE IF NOT EXISTS cj_loan_access_grants
 (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid NOT NULL REFERENCES users(id),
 token_hash char(64) NOT NULL UNIQUE,expires_at timestamptz NOT NULL)`
 await sql`CREATE TABLE IF NOT EXISTS cj_loan_paystack_payments
 (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid NOT NULL REFERENCES users(id),
 reference varchar(100) UNIQUE NOT NULL,amount_usdt numeric(16,2) NOT NULL,
 amount_ngn numeric(18,2) NOT NULL,rate_ngn_per_usdt numeric(18,4) NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'pending',verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now())`
}
const digest=(s:string)=>createHash('sha256').update(s).digest('hex')
export async function issueCjLoanGrant(id:string){
 await ensureCheckoutSchema()
 const token=randomBytes(32).toString('hex')
 await sql`INSERT INTO cj_loan_access_grants(client_id,token_hash,expires_at)
 VALUES(${id}::uuid,${digest(token)},now()+interval '30 minutes')`
 return token
}
async function grantUser(token:string){
 if(!/^[a-f0-9]{64}$/.test(token))return null
 await ensureCheckoutSchema()
 const [u]=await sql`SELECT u.id,u.name,u.role,u.file_number,u.email FROM cj_loan_access_grants g
 JOIN users u ON u.id=g.client_id WHERE g.token_hash=${digest(token)}
 AND g.expires_at>now() AND u.role='client' AND u.is_active=true LIMIT 1`
 return u||null
}
export async function checkoutCjLoan(grant:string){
 const user=await grantUser(grant)
 if(!user||!isCjDoradoAccount(user))throw new Error('Sign in with your File Number and password first.')
 const gate=await getCjLoanGate(user)
 if(!gate||gate.status!=='payment_required')throw new Error('Administration must confirm the signed and funded loan before checkout.')
 const rate=Number(process.env.CJ_LOAN_NGN_PER_USDT)
 if(!Number.isFinite(rate)||rate<=0||Math.round(rate*10000)!==rate*10000)
  throw new Error('Administration must configure the NGN-per-USDT settlement rate.')
 const kobo=Math.round(gate.remainingUSDT*rate*100)
 if(!Number.isSafeInteger(kobo)||kobo<100)throw new Error('Invalid Paystack settlement quote.')
 const config=await getPaystackConfig()
 const origin=(config.publicOrigin||process.env.WEAVE_PUBLIC_ORIGIN||'').replace(/\/$/,'')
 if(!origin.startsWith('https://'))throw new Error('Canonical HTTPS Paystack origin is required.')
 const reference=createPaystackReference('CJLOAN')
 const [p]=await sql`INSERT INTO cj_loan_paystack_payments
 (client_id,reference,amount_usdt,amount_ngn,rate_ngn_per_usdt)
 VALUES(${user.id}::uuid,${reference},${gate.remainingUSDT},${kobo/100},${rate}) RETURNING id`
 try{
  const checkout=await initializePaystackTransaction({
   email:user.email,amountKobo:kobo,reference,
   callbackUrl:origin+'/client/login?cjLoanReference='+encodeURIComponent(reference),
   metadata:{payment_type:'cj_employee_loan',loan_payment_id:p.id,user_id:user.id,
    file_number:CJ_DORADO_FILE_NUMBER,amount_usdt:gate.remainingUSDT},
  })
  return {paymentLink:checkout.authorizationUrl,reference,amountNGN:kobo/100,
   amountUSDT:gate.remainingUSDT,rateNGNPerUSDT:rate}
 }catch(error){
  await sql`UPDATE cj_loan_paystack_payments SET status='failed' WHERE id=${p.id}::uuid AND status='pending'`
  throw error
 }
}
export async function settleCjLoan(reference:string){
 if(!/^CJLOAN-[a-zA-Z0-9.=-]{1,90}$/.test(reference))return {matched:false,settled:false}
 await ensureCheckoutSchema()
 const [p]=await sql`SELECT * FROM cj_loan_paystack_payments WHERE reference=${reference} LIMIT 1`
 if(!p)return {matched:false,settled:false}
 if(p.status==='verified')return {matched:true,settled:true}
 if(p.status!=='pending')return {matched:true,settled:false}
 const tx=await verifyPaystackTransaction(reference)
 const meta=tx.metadata&&typeof tx.metadata==='object'&&!Array.isArray(tx.metadata)
  ?tx.metadata as Record<string,unknown>:{}
 const [account]=await sql`SELECT email FROM users WHERE id=${p.client_id}::uuid LIMIT 1`
 if(tx.status!=='success'||tx.reference!==reference||tx.currency!=='NGN'||
  tx.amount!==Math.round(Number(p.amount_ngn)*100)||!account?.email||
  String(tx.customer?.email||'').toLowerCase()!==String(account.email).toLowerCase()||
  String(meta.payment_type)!=='cj_employee_loan'||String(meta.loan_payment_id)!==String(p.id)||
  String(meta.user_id)!==String(p.client_id)||String(meta.file_number)!==CJ_DORADO_FILE_NUMBER)
  throw new Error('Paystack identity, currency, amount or reference mismatch.')
 const connection=await getPool().connect()
 try{
  await connection.query('BEGIN')
  const a=await connection.query('SELECT status FROM cj_loan_paystack_payments WHERE id=$1 FOR UPDATE',[p.id])
  if(a.rows[0]?.status==='verified'){await connection.query('COMMIT');return {matched:true,settled:true}}
  if(a.rows[0]?.status!=='pending')throw new Error('Checkout is no longer pending.')
  const b=await connection.query(`SELECT * FROM client_folder_upgrades WHERE client_id=$1::uuid
  AND file_number=$2 AND tier='pro' FOR UPDATE`,[p.client_id,CJ_DORADO_FILE_NUMBER])
  const up=b.rows[0]
  if(!up||up.status!=='repayment_required'||!up.loan_agreed_at||!up.loan_funded_at||
   Number(up.loan_principal_usdt)!==CJ_EMPLOYEE_LOAN_USDT||
   Math.round((Number(up.loan_principal_usdt)-Number(up.repayment_verified_usdt))*100)!==Math.round(Number(p.amount_usdt)*100))
   throw new Error('Loan ledger changed. Administration must reconcile this payment.')
  await connection.query(`INSERT INTO client_folder_loan_repayments
  (upgrade_id,amount_usdt,network,reference,verified_by,verification_method)
  VALUES($1,$2,'Paystack NGN',$3,NULL,'paystack_provider')`,[up.id,p.amount_usdt,reference])
  await connection.query('UPDATE client_folder_upgrades SET repayment_verified_usdt=repayment_verified_usdt+$1,updated_at=now() WHERE id=$2',[p.amount_usdt,up.id])
  await connection.query("UPDATE cj_loan_paystack_payments SET status='verified',verified_at=now() WHERE id=$1",[p.id])
  await connection.query('COMMIT')
  return {matched:true,settled:true}
 }catch(e){await connection.query('ROLLBACK').catch(()=>{});throw e}
 finally{connection.release()}
}
export async function verifyCjLoanForGrant(reference:string,grant:string){
 const user=await grantUser(grant)
 if(!user||!isCjDoradoAccount(user))throw new Error('Sign in again to verify payment.')
 const [p]=await sql`SELECT id FROM cj_loan_paystack_payments WHERE reference=${reference}
 AND client_id=${user.id}::uuid LIMIT 1`
 if(!p)throw new Error('Checkout is not attached to this Client.')
 return settleCjLoan(reference)
}
