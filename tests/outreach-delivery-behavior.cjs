const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')

// In-memory transactional boundary for engine behavior. SMTP and SQL failures
// are injected; no real recipients, balances or production records are touched.
function engine(options={}) {
  const leads=Array.from({length:options.leads||1},(_,i)=>({id:`lead-${i}`,lead_code:`EML-${i}`,name:'Prospect',email:`p${i}@example.com`,contactable:true,status:'available',owned_by:options.owner||null}))
  const records=[]
  const rowLocks=new Map()
  const dailyLocks=new Set()
  let deliveries=0
  let transportError=options.transportError
  let heldResolve
  let held=options.hold?new Promise(resolve=>heldResolve=resolve):null
  let failedUpdate=false
  class GoogleMailError extends Error { constructor(message,code,uncertain=false){super(message);this.code=code;this.deliveryUncertain=uncertain} }
  const blocked=lead=>records.some(o=>o.lead_id===lead.id&&['pending','sent','replied','uncertain'].includes(o.status))
  async function query(sql,args=[],client={}) {
    sql=sql.replace(/\s+/g,' ').trim()
    if(sql==='COMMIT'||sql==='ROLLBACK') {client.unlock?.();client.unlock=null;return {rows:[]}}
    if(sql.includes('pg_try_advisory_lock')){
      const locked=!dailyLocks.has(args[0]);if(locked)dailyLocks.add(args[0]);return {rows:[{locked}]}
    }
    if(sql.includes('pg_advisory_unlock')){dailyLocks.delete(args[0]);return {rows:[]}}
    if(sql.startsWith('SELECT * FROM weave_email_senders'))return {rows:[{id:'sender',reply_email:'sender@gmail.com'}]}
    if(sql.startsWith('SELECT * FROM weave_email_outreach_automation'))return {rows:[{enabled:true,daily_limit:options.limit||2,subject_template:'Hello',message_template:'Hello {{name}}'}]}
    if(sql.startsWith('SELECT COUNT(*)::int AS count FROM weave_email_outreach'))return {rows:[{count:records.filter(o=>o.mode==='automatic').length}]}
    if(sql.startsWith('SELECT l.* FROM weave_email_prospect_leads'))return {rows:leads.filter(l=>l.status==='available'&&!l.owned_by&&l.contactable&&!blocked(l)).slice(0,args[1])}
    if(sql.startsWith('SELECT * FROM weave_email_prospect_leads WHERE id=')){
      const previous=rowLocks.get(args[0])||Promise.resolve()
      let unlock;const lock=new Promise(resolve=>unlock=resolve)
      rowLocks.set(args[0],previous.then(()=>lock));await previous;client.unlock=unlock
      return {rows:leads.filter(l=>l.id===args[0])}
    }
    if(sql.startsWith('SELECT id FROM weave_email_outreach WHERE lead_id='))return {rows:records.filter(o=>o.lead_id===args[0]&&['pending','sent','replied','uncertain'].includes(o.status))}
    if(sql.startsWith('INSERT INTO weave_email_outreach ')){records.push({id:args[0],lead_id:args[1],actor_id:args[2],mode:args[4],status:'pending'});return {rows:[]}}
    if(sql.startsWith('UPDATE weave_email_outreach SET status=\'sent\'')){
      if(options.failPersistence&&!failedUpdate){failedUpdate=true;throw new Error('database unavailable after acceptance')}
      records.find(o=>o.id===args[1]).status='sent';return {rows:[]}
    }
    if(sql.startsWith('UPDATE weave_email_outreach SET status=$3')){
      const o=records.find(o=>o.id===args[1]);if(o.status==='pending')o.status=args[2];return {rows:[]}
    }
    if(sql.startsWith('UPDATE weave_email_prospect_leads')){leads.find(l=>l.id===args[0]).status='contacted';return {rows:[]}}
    if(sql==='BEGIN'||sql.startsWith('CREATE ')||sql.includes('pg_advisory_lock'))return {rows:[]}
    throw new Error('Unhandled test database operation: '+sql)
  }
  const pool={query:(sql,args)=>query(sql,args),connect:async()=>{
    const c={query:(sql,args)=>query(sql,args,c),release:()=>c.unlock?.()};return c
  }}
  const module={exports:{}}
  const imports={
    '@/lib/db':{getPool:()=>pool},
    '@/lib/weave-mailbox':{getConnectedMailboxCredential:async()=>options.disconnected?null:{id:'mailbox',email:'sender@gmail.com',appPassword:'abcdefghijklmnop'},markMailboxSent:async()=>{}},
    '@/lib/weave-mail':{GoogleMailError,sendAuthenticatedGoogleMail:async()=>{
      deliveries++;if(held)await held;if(transportError)throw transportError;return {messageId:'message-'+deliveries}
    }},
    '@/lib/weave-origin':{getWeaveBridgeOrigin:()=> 'https://weavingsystem.online'},
  }
  const code=ts.transpileModule(fs.readFileSync('lib/email-outreach.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code,{module,exports:module.exports,require:name=>imports[name]||require(name),process:{env:{}},console:{error:()=>{}},AbortSignal})
  return {api:module.exports,leads,records,deliveries:()=>deliveries,release:()=>{heldResolve?.();held=null},setError:e=>transportError=e,GoogleMailError}
}
function input(e,role='admin',actor='admin'){return {actorId:actor,actorRole:role,lead:e.leads[0],subject:'Hello',message:'Hello {{name}}',mode:'manual'}}
;(async()=>{
  const parallel=engine()
  const results=await Promise.allSettled([parallel.api.deliverOutreachEmail(input(parallel)),parallel.api.deliverOutreachEmail(input(parallel))])
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
  assert.equal(parallel.deliveries(),1,'Concurrent requests deliver only once')
  const wrongOwner=engine({owner:'other-bridger'})
  await assert.rejects(wrongOwner.api.deliverOutreachEmail(input(wrongOwner,'bridger','bridger')))
  await assert.rejects(wrongOwner.api.deliverOutreachEmail(input(wrongOwner)))
  assert.equal(wrongOwner.deliveries(),0,'Admin automation cannot consume a purchased Bridger lead')
  const blocked=engine();blocked.leads[0].contactable=false
  await assert.rejects(blocked.api.deliverOutreachEmail(input(blocked)))
  assert.equal(blocked.deliveries(),0)
  const disconnected=engine({disconnected:true})
  assert.equal(await disconnected.api.emailOutreachProviderConfiguredForUser('bridger'),false)
  await assert.rejects(disconnected.api.deliverOutreachEmail(input(disconnected)))
  assert.equal(disconnected.records.length,0)
  const retry=engine();retry.setError(new retry.GoogleMailError('Google refused auth','MAIL_AUTH_REJECTED'))
  await assert.rejects(retry.api.deliverOutreachEmail(input(retry)))
  assert.equal(retry.records[0].status,'failed')
  retry.setError(null);await retry.api.deliverOutreachEmail(input(retry))
  assert.equal(retry.deliveries(),2,'A known rejection allows a deliberate retry')
  const unknown=engine();unknown.setError(new unknown.GoogleMailError('connection lost','MAIL_CONNECTION_FAILED',true))
  await assert.rejects(unknown.api.deliverOutreachEmail(input(unknown)))
  assert.equal(unknown.records[0].status,'uncertain')
  unknown.setError(null);await assert.rejects(unknown.api.deliverOutreachEmail(input(unknown)))
  assert.equal(unknown.deliveries(),1,'An uncertain provider result cannot be resent automatically')
  const persistence=engine({failPersistence:true})
  await assert.rejects(persistence.api.deliverOutreachEmail(input(persistence)))
  assert.equal(persistence.records[0].status,'uncertain')
  await assert.rejects(persistence.api.deliverOutreachEmail(input(persistence)))
  assert.equal(persistence.deliveries(),1,'Persistence failure after acceptance cannot duplicate mail')
  const daily=engine({leads:3,limit:2})
  assert.equal((await daily.api.runAdminEmailOutreach('admin')).sent,2)
  assert.equal((await daily.api.runAdminEmailOutreach('admin')).reason,'daily_limit')
  assert.equal(daily.deliveries(),2)
  const concurrentRun=engine({leads:3,limit:2,hold:true})
  const run=concurrentRun.api.runAdminEmailOutreach('admin')
  while(!concurrentRun.deliveries())await new Promise(resolve=>setImmediate(resolve))
  assert.equal((await concurrentRun.api.runAdminEmailOutreach('admin')).reason,'already_running')
  concurrentRun.release();await run
  assert.equal(concurrentRun.deliveries(),2)
  console.log('Outreach engine behavior passed: ownership, contactability, duplicate requests, uncertain delivery, daily budget and concurrent runs')
})().catch(e=>{console.error(e);process.exitCode=1})
