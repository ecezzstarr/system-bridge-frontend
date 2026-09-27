import type { PoolClient } from 'pg'

export const DAILY_PROSPECT_RESERVE = 3

export async function ensureDailyProspectClaimSchema(client:PoolClient|any){
  await client.query(`
    CREATE TABLE IF NOT EXISTS bridger_daily_prospect_claims (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bridger_id uuid NOT NULL,
      prospect_id uuid NOT NULL,
      outreach_id uuid,
      claim_date date NOT NULL DEFAULT CURRENT_DATE,
      claim_type varchar(32) NOT NULL DEFAULT 'daily_bonus',
      claimed_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (bridger_id, claim_date),
      UNIQUE (prospect_id)
    )
  `)
  await client.query(`
    ALTER TABLE bridger_daily_prospect_claims
    ADD COLUMN IF NOT EXISTS outreach_id uuid
  `)
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_daily_prospect_claims_bridger_date
    ON bridger_daily_prospect_claims(bridger_id, claim_date)
  `)
}

export async function countDailyProspectReserve(client:PoolClient|any){
  const row=(await client.query(`
    SELECT COUNT(*)::int AS count
    FROM market_prospect_contacts m
    WHERE m.status='available'
      AND m.package_id IS NULL
      AND COALESCE(NULLIF(TRIM(m.whatsapp_number),''),NULLIF(TRIM(m.phone),'')) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=m.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM bridger_daily_prospect_claims c WHERE c.prospect_id=m.id
      )
  `)).rows[0]
  return Number(row?.count||0)
}

async function reclaimFromUnsoldPublishedPackage(client:PoolClient|any){
  const pkg=(await client.query(`
    SELECT p.id,p.price_trx,p.title
    FROM market_prospect_packages p
    WHERE p.status='published'
      AND p.purchased_by IS NULL
      AND (
        SELECT COUNT(*)
        FROM market_prospect_contacts c
        WHERE c.package_id=p.id
          AND NOT EXISTS (SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=c.id)
          AND NOT EXISTS (SELECT 1 FROM bridger_daily_prospect_claims d WHERE d.prospect_id=c.id)
      ) >= 2
    ORDER BY p.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `)).rows[0]

  if(!pkg)return null

  const beforeRow=(await client.query(
    `SELECT COUNT(*)::int AS count FROM market_prospect_contacts WHERE package_id=$1::uuid`,
    [pkg.id],
  )).rows[0]
  const beforeCount=Number(beforeRow?.count||0)
  if(beforeCount<2)return null

  const contact=(await client.query(`
    SELECT c.id
    FROM market_prospect_contacts c
    WHERE c.package_id=$1::uuid
      AND NOT EXISTS (SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=c.id)
      AND NOT EXISTS (SELECT 1 FROM bridger_daily_prospect_claims d WHERE d.prospect_id=c.id)
    ORDER BY c.created_at DESC NULLS LAST,c.id DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `,[pkg.id])).rows[0]

  if(!contact)return null

  await client.query(`
    UPDATE market_prospect_contacts
    SET package_id=NULL,status='available'
    WHERE id=$1::uuid
  `,[contact.id])

  const remaining=Math.max(0,beforeCount-1)
  const oldPrice=Number(pkg.price_trx)||0
  const adjustedPrice=remaining>0&&oldPrice>0
    ? Math.max(.000001,Math.round((oldPrice*(remaining/beforeCount))*1e6)/1e6)
    : oldPrice

  if(remaining>0){
    await client.query(`
      UPDATE market_prospect_packages
      SET
        price_trx=$2,
        description=$3,
        updated_at=NOW()
      WHERE id=$1::uuid
    `,[
      pkg.id,
      adjustedPrice,
      `${remaining} Prospect candidates organized through the WEAVE Prospect Engine. Contact reachability is confirmed only through real outreach.`,
    ])
  }else{
    await client.query(`
      UPDATE market_prospect_packages
      SET status='archived',updated_at=NOW()
      WHERE id=$1::uuid
    `,[pkg.id])
  }

  await client.query(`
    INSERT INTO market_prospect_audit(package_id,actor_id,action,details)
    VALUES(
      $1::uuid,
      NULL,
      'daily_reserve_rebalance',
      jsonb_build_object(
        'contact_id',$2::uuid,
        'previous_contact_count',$3::int,
        'remaining_contact_count',$4::int,
        'previous_price',$5::numeric,
        'adjusted_price',$6::numeric
      )
    )
  `,[pkg.id,contact.id,beforeCount,remaining,oldPrice,adjustedPrice])

  return {contactId:contact.id,packageId:pkg.id,beforeCount,remaining,oldPrice,adjustedPrice}
}

export async function repairDailyProspectState(
  client:PoolClient|any,
  options:{reserveTarget?:number;rebalancePackages?:boolean}={},
){
  await ensureDailyProspectClaimSchema(client)

  const orphanClaims=(await client.query(`
    DELETE FROM bridger_daily_prospect_claims c
    WHERE NOT EXISTS (
      SELECT 1 FROM market_prospect_contacts m WHERE m.id=c.prospect_id
    )
    RETURNING c.id
  `)).rowCount||0

  const strandedContacts=(await client.query(`
    UPDATE market_prospect_contacts m
    SET status='available'
    WHERE m.package_id IS NULL
      AND m.status IN ('packaged','contacted')
      AND NOT EXISTS (
        SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=m.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM bridger_daily_prospect_claims c WHERE c.prospect_id=m.id
      )
    RETURNING m.id
  `)).rowCount||0

  const archivedContacts=(await client.query(`
    UPDATE market_prospect_contacts m
    SET package_id=NULL,status='available'
    FROM market_prospect_packages p
    WHERE m.package_id=p.id
      AND p.status='archived'
      AND NOT EXISTS (
        SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=m.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM bridger_daily_prospect_claims c WHERE c.prospect_id=m.id
      )
    RETURNING m.id
  `)).rowCount||0

  const reserveTarget=Math.max(0,Math.min(25,Math.trunc(options.reserveTarget??DAILY_PROSPECT_RESERVE)))
  const rebalanced:any[]=[]

  let reserve=await countDailyProspectReserve(client)
  if(options.rebalancePackages!==false){
    while(reserve<reserveTarget){
      const moved=await reclaimFromUnsoldPublishedPackage(client)
      if(!moved)break
      rebalanced.push(moved)
      reserve=await countDailyProspectReserve(client)
    }
  }

  return {
    orphanClaims,
    strandedContacts,
    archivedContacts,
    rebalanced,
    reserve,
    reserveTarget,
  }
}
