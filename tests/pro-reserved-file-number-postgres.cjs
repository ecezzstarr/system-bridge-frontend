const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {randomUUID}=require('node:crypto')
const {Client}=require('pg')
const ts=require('typescript')
const connectionString=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if(!connectionString){console.log('SKIP reserved Pro reconciliation PostgreSQL: test database not configured');process.exit(0)}
function load(file,mocks){
 const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const exports={};new Function('exports','require',source)(exports,id=>id in mocks?mocks[id]:require(id));return exports
}
async function run(){
 const db=new Client({connectionString});await db.connect()
 const schema='pro_reserved_test_'+randomUUID().replaceAll('-','')
 try{
  await db.query('CREATE SCHEMA '+schema)
  await db.query('SET search_path TO '+schema)
  await db.query(`CREATE TABLE users(id uuid PRIMARY KEY,name text,email text,role text,file_number varchar(50) UNIQUE)`)
  await db.query(`CREATE TABLE pro_file_number_verifications(id uuid PRIMARY KEY,file_number text,signed_name text,status text)`)
  const sql=async(parts,...args)=>(await db.query(parts.reduce((q,p,i)=>q+(i?'$'+i:'')+p,''),args)).rows
  const dbModule={sql,getPool:()=>({connect:async()=>({query:(...args)=>db.query(...args),release(){}})})}
  const folders=load('lib/client-file-folder.ts',{'@/lib/pg-neon':{neon:()=>sql}})
  const fne=load('lib/fne.ts',{'./db':dbModule})
  const company=load('lib/company-client-staff.ts',{'@/lib/db':dbModule})
  const {reconcileProStaffAppointment}=load('lib/pro-staff-appointment.ts',{
   '@/lib/db':dbModule,'@/lib/client-file-folder':folders,'@/lib/fne':fne,
   '@/lib/company-client-staff':company,
   '@/lib/pro-file-number-verification':{ensureProFileNumberVerificationSchema:async()=>{}}
  })
  const admin=randomUUID(),id=randomUUID(),number=folders.CJ_DORADO_FILE_NUMBER
  const input={candidateEmail:'verified@example.com',monthlySalaryUSDT:1200,
   appointmentReference:'APPROVED-AGREEMENT-TEST',independentlyVerified:true}
  await db.query(`INSERT INTO pro_file_number_verifications VALUES($1,$2,'Current Registered Name','pending_identity')`,[id,number])
  // No generic issuance row and no account exist. The canonical reserved Pro
  // entitlement is recovered inside the same transaction as the appointment.
  await reconcileProStaffAppointment(id,admin,input)
  const {rows:[issued]}=await db.query('SELECT * FROM file_folders WHERE file_number=$1',[number])
  assert.equal(issued.status,'pending');assert.equal(issued.client_id,null)
  assert.equal(issued.identity_data.name,'Current Registered Name')
  assert.equal(issued.identity_data.origin,'reserved_pro_staff_reconciliation')
  const {rows:[reserved]}=await db.query('SELECT * FROM client_file_folders WHERE file_number=$1',[number])
  assert.equal(issued.identity_data.originalFolderId,reserved.id)
  const {rows:[offer]}=await db.query('SELECT * FROM company_client_staff_offers WHERE file_number=$1',[number])
  assert.equal(offer.status,'accepted');assert.equal(offer.candidate_name,'Current Registered Name')
  assert.equal(offer.payment_reference,null);assert.equal(offer.client_id,null)
  await assert.rejects(()=>reconcileProStaffAppointment(id,admin,input),/original offer/)
  // An arbitrary submitted number cannot establish an entitlement.
  const unknown=randomUUID()
  await db.query(`INSERT INTO pro_file_number_verifications VALUES($1,'WEAVE-UNKNOWN-123456','Unissued Applicant','pending_identity')`,[unknown])
  await assert.rejects(()=>reconcileProStaffAppointment(unknown,admin,{...input,candidateEmail:'unknown@example.com'}),/No issued or company-reserved/)
  assert.equal((await db.query('SELECT count(*)::int AS total FROM file_folders')).rows[0].total,1)
  // A reserved number owned by another Client is never copied to a new person.
  const other=randomUUID(),otherNumber='WEAVE-RESERVED-OTHER'
  await db.query(`INSERT INTO client_file_folders(file_number,client_id) VALUES($1,$2)`,[otherNumber,randomUUID()])
  await db.query(`INSERT INTO pro_file_number_verifications VALUES($1,$2,'Different Applicant','pending_identity')`,[other,otherNumber])
  await assert.rejects(()=>reconcileProStaffAppointment(other,admin,{...input,candidateEmail:'other@example.com'}),/another Client/)
  assert.equal((await db.query('SELECT count(*)::int AS total FROM file_folders')).rows[0].total,1)
  console.log('PASS PostgreSQL: reserved Pro number reconciles without replacement or payment credit; duplicates, unissued numbers and conflicting owners roll back')
 }finally{await db.query('ROLLBACK');await db.query('SET search_path TO public');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await db.end()}
}
run().catch(error=>{console.error(error);process.exitCode=1})
