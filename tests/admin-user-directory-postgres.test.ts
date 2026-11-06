import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Pool} from 'pg'

async function main(){
  const origin=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
  if(!origin)throw new Error('WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL is required')
  const schema='admin_user_directory_'+process.pid
  const root=new Pool({connectionString:origin})
  let local:Pool|null=null
  let service:Pool|null=null
  let created=false
  try{
    await root.query('CREATE SCHEMA "'+schema+'"')
    created=true
    const url=new URL(origin)
    url.searchParams.set('options','-c search_path='+schema)
    process.env.DATABASE_URL=url.toString()
    local=new Pool({connectionString:url.toString()})
    await local.query(
      'CREATE TABLE users (id uuid PRIMARY KEY, email text,username text,name text,role text,'+
      'departmental_code text,assigned_agent_id uuid,is_active boolean DEFAULT true,'+
      'created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now())'
    )
    await local.query(
      'CREATE TABLE wallets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,'+
      'balance_trx numeric(20,6),is_primary boolean,created_at timestamptz DEFAULT now())'
    )
    await local.query(
      'CREATE TABLE escrow (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,'+
      'amount numeric(20,6),status text,currency text)'
    )
    const {getAdminUserDirectory}=await import('../lib/admin-user-directory')
    const {getPool}=await import('../lib/db')
    service=getPool()
    const added:Array<{id:string;role:string;dept:string|null}>=[]
    const add=async(role:string,dept:string|null,assigned:string|null=null,active=true)=>{
      const id=randomUUID()
      await local!.query(
        'INSERT INTO users(id,email,username,name,role,departmental_code,assigned_agent_id,is_active) '+
        'VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [id,role+id.slice(0,4)+'@example.invalid','member'+id.slice(0,4),
          'Directory '+role,role,dept,assigned,active])
      added.push({id,role,dept})
      return id
    }
    const admin=await add('admin',null)
    const agent=await add('agent','STABILITY')
    const bridger=await add('bridger','HOPE')
    const client=await add('client','MOVEMENT')
    const inactive=await add('bridger','HOPE',null,false)
    const assigned=await add('bridger','HOPE',agent)
    const newUser=await add('user',null)
    await local.query(
      'INSERT INTO wallets(user_id,balance_trx,is_primary) VALUES($1,23.456789,true)',
      [agent])
    await local.query(
      'INSERT INTO wallets(user_id,balance_trx,is_primary) VALUES($1,7.654321,false)',
      [bridger])
    await local.query(
      'INSERT INTO wallets(user_id,balance_trx,is_primary) VALUES($1,2,false),($1,5,false)',
      [client])
    await local.query(
      "INSERT INTO escrow(user_id,amount,status,currency) VALUES($1,1.5,'locked','Flame Coin')",
      [agent])

    const options={filter:'all' as const,search:'',offset:0,limit:100}
    const full=await getAdminUserDirectory(options)
    assert.equal(full.total,7,'All registered users includes all roles')
    assert.equal(full.users.length,7)
    assert.equal(full.warnings.length,0)
    assert.equal(full.users.some(u=>u.id===admin),true,'Admin users visible for read-only oversight')
    assert.equal(full.users.some(u=>u.id===inactive&&u.is_active===false),true,
      'Deactivated users remain in the accountable directory')
    const agentRecord=full.users.find(u=>u.id===agent)!
    assert.equal(agentRecord.platform_wallet_balance,23.456789)
    assert.equal(agentRecord.escrow_balance,1.5)
    const legacy=full.users.find(u=>u.id===bridger)!
    assert.equal(legacy.wallet_status,'legacy')
    assert.equal(legacy.platform_wallet_balance,7.654321)
    const ambiguous=full.users.find(u=>u.id===client)!
    assert.equal(ambiguous.wallet_status,'ambiguous')
    assert.equal(ambiguous.platform_wallet_balance,null)
    const empty=full.users.find(u=>u.id===newUser)!
    assert.equal(empty.wallet_status,'missing')
    assert.equal(empty.platform_wallet_balance,null)
    assert.equal(empty.escrow_balance,0,'Verified no escrow is different from unavailable escrow')

    const needs=await getAdminUserDirectory({...options,filter:'unassigned'})
    assert.equal(needs.users.some(u=>u.id===admin),false,'Admin is not in assignment queue')
    assert.equal(needs.users.some(u=>u.id===assigned),false,'Assigned Bridgers omitted')
    assert.equal(needs.users.some(u=>u.id===bridger),true,'Unassigned Bridgers visible')
    assert.equal(needs.users.some(u=>u.id===newUser),true)
    assert.equal(needs.users.some(u=>u.id===agent),false,'Agent does not require bridger assignment')

    const search=await getAdminUserDirectory({...options,search:'directory client'})
    assert.equal(search.total,1)
    assert.equal(search.users[0].id,client)
    const first=await getAdminUserDirectory({...options,limit:3})
    const second=await getAdminUserDirectory({...options,limit:3,offset:3})
    assert.equal(first.users.length,3)
    assert.equal(first.hasMore,true)
    assert.equal(second.users.length,3)
    const identities=new Set([...first.users,...second.users].map(u=>u.id))
    assert.equal(identities.size,6,'Pages do not re-render duplicate users')

    // The exact production regression: escrow was added as a mandatory JOIN
    // and its absence returned HTTP 500 for every user.
    await local.query('ALTER TABLE escrow RENAME TO hidden_escrow')
    const withoutEscrow=await getAdminUserDirectory(options)
    assert.equal(withoutEscrow.total,7)
    assert.equal(withoutEscrow.users.length,7)
    assert.equal(withoutEscrow.users.find(u=>u.id===agent)!.platform_wallet_balance,23.456789)
    assert.equal(withoutEscrow.users.every(u=>u.escrow_balance===null),true)
    assert.equal(withoutEscrow.warnings.some(w=>w.includes('Escrow')),true)
    await local.query('ALTER TABLE hidden_escrow RENAME TO escrow')

    await local.query('ALTER TABLE wallets RENAME TO hidden_wallets')
    const withoutWallets=await getAdminUserDirectory(options)
    assert.equal(withoutWallets.users.length,7)
    assert.equal(withoutWallets.users.every(u=>u.platform_wallet_balance===null),true)
    assert.equal(withoutWallets.users.find(u=>u.id===agent)!.escrow_balance,1.5)
    assert.equal(withoutWallets.warnings.some(w=>w.includes('Wallet')),true)
    await local.query('ALTER TABLE hidden_wallets RENAME TO wallets')

    await local.query('ALTER TABLE users RENAME TO hidden_users')
    await assert.rejects(getAdminUserDirectory(options),
      /relation "users" does not exist/,'Mandatory users table outage fails visibly')
    await local.query('ALTER TABLE hidden_users RENAME TO users')

    const again=await getAdminUserDirectory(options)
    assert.equal(again.total,7)
    console.log('PASS: registered users across roles, search, pagination, missing escrow/wallets, legacy and active states')
  }finally{
    if(service)await service.end().catch(()=>{})
    if(local)await local.end().catch(()=>{})
    if(created)await root.query('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE').catch(()=>{})
    await root.end()
  }
}
void main().catch(error=>{console.error(error);process.exitCode=1})
