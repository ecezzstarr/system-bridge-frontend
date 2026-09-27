import { getPool,getSql } from '@/lib/db'
import { ensureMarketTables } from '@/lib/market'
import { ensureBridgerNumberEngineSchema } from '@/lib/bridger-number-engine'
import {
  DAILY_PROSPECT_RESERVE,
  countDailyProspectReserve,
  repairDailyProspectState,
} from '@/lib/bridger-daily-prospect-engine'

export type IntegrityCheck={
  key:string
  label:string
  status:'healthy'|'warning'|'repaired'
  count:number
  detail:string
}

export type IntegrityReport={
  success:boolean
  mode:'scan'|'repair'
  checkedAt:string
  checks:IntegrityCheck[]
  repairs:string[]
  summary:{
    healthy:number
    warning:number
    repaired:number
  }
}

async function scanWithClient(client:any):Promise<IntegrityCheck[]>{
  const [
    reserve,
    orphanClaims,
    strandedProspects,
    invalidNumberPrices,
    numberCountryDrift,
    missingNumberOffers,
    missingBridgerProfiles,
    missingBridgerWallets,
    overdueNumberOrders,
  ]=await Promise.all([
    countDailyProspectReserve(client),
    client.query(`
      SELECT COUNT(*)::int AS count
      FROM bridger_daily_prospect_claims c
      WHERE NOT EXISTS (SELECT 1 FROM market_prospect_contacts m WHERE m.id=c.prospect_id)
    `),
    client.query(`
      SELECT COUNT(*)::int AS count
      FROM market_prospect_contacts m
      WHERE m.package_id IS NULL
        AND m.status IN ('packaged','contacted')
        AND NOT EXISTS (SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=m.id)
        AND NOT EXISTS (SELECT 1 FROM bridger_daily_prospect_claims c WHERE c.prospect_id=m.id)
    `),
    client.query(`
      SELECT COUNT(*)::int AS count
      FROM bridger_whatsapp_numbers n
      WHERE n.status='available'
        AND n.assigned_to IS NULL
        AND COALESCE(n.price_flame_coin,0)<=0
    `),
    client.query(`
      SELECT COUNT(*)::int AS count
      FROM bridger_whatsapp_numbers n
      WHERE n.country<>TRIM(n.country)
    `),
    client.query(`
      SELECT COUNT(DISTINCT TRIM(n.country))::int AS count
      FROM bridger_whatsapp_numbers n
      WHERE n.status='available'
        AND n.assigned_to IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM bridger_number_country_offers o
          WHERE LOWER(TRIM(o.country))=LOWER(TRIM(n.country))
        )
    `),
    client.query(`
      SELECT COUNT(*)::int AS count
      FROM users u
      WHERE u.role='bridger'
        AND COALESCE(u.is_active,true)=true
        AND NOT EXISTS (
          SELECT 1 FROM bridger_profiles bp WHERE bp.user_id=u.id
        )
    `),
    client.query(`
      SELECT COUNT(*)::int AS count
      FROM users u
      WHERE u.role='bridger'
        AND COALESCE(u.is_active,true)=true
        AND NOT EXISTS (
          SELECT 1 FROM wallets w WHERE w.user_id=u.id AND w.is_primary=true
        )
    `),
    client.query(`
      SELECT COUNT(*)::int AS count
      FROM bridger_number_orders
      WHERE status IN ('requested','fulfilling')
        AND deadline_at<NOW()
    `),
  ])

  const n=(result:any)=>Number(result?.rows?.[0]?.count||0)

  return [
    {
      key:'daily_prospect_reserve',
      label:'Daily Prospect reserve',
      status:reserve>=DAILY_PROSPECT_RESERVE?'healthy':'warning',
      count:reserve,
      detail:reserve>=DAILY_PROSPECT_RESERVE
        ? `${reserve} unused Prospects are protected for free daily claims.`
        : `Only ${reserve} unused Prospects are protected; target is ${DAILY_PROSPECT_RESERVE}.`,
    },
    {
      key:'orphan_daily_claims',
      label:'Orphan Daily Prospect claims',
      status:n(orphanClaims)===0?'healthy':'warning',
      count:n(orphanClaims),
      detail:n(orphanClaims)===0?'No claim points to a missing Prospect.':'Claims exist whose Prospect record no longer exists.',
    },
    {
      key:'stranded_prospects',
      label:'Stranded Prospect inventory',
      status:n(strandedProspects)===0?'healthy':'warning',
      count:n(strandedProspects),
      detail:n(strandedProspects)===0?'No unowned Prospect is trapped in a non-available state.':'Unowned Prospects can be returned safely to available inventory.',
    },
    {
      key:'number_prices',
      label:'Invalid available Number Bay prices',
      status:n(invalidNumberPrices)===0?'healthy':'warning',
      count:n(invalidNumberPrices),
      detail:n(invalidNumberPrices)===0?'All available number stock has a valid Bridger price.':'Available number stock has a zero or invalid price.',
    },
    {
      key:'number_country_drift',
      label:'Number Bay country formatting drift',
      status:n(numberCountryDrift)===0?'healthy':'warning',
      count:n(numberCountryDrift),
      detail:n(numberCountryDrift)===0?'Number countries are normalized.':'Country whitespace can break offer-to-stock matching.',
    },
    {
      key:'number_offer_coverage',
      label:'Number Bay offer coverage',
      status:n(missingNumberOffers)===0?'healthy':'warning',
      count:n(missingNumberOffers),
      detail:n(missingNumberOffers)===0?'Every stocked country has a country offer.':'Stock exists for countries without a matching offer.',
    },
    {
      key:'bridger_profiles',
      label:'Bridger position profiles',
      status:n(missingBridgerProfiles)===0?'healthy':'warning',
      count:n(missingBridgerProfiles),
      detail:n(missingBridgerProfiles)===0?'Every active Bridger has a position profile.':'Active Bridger users exist without a Bridger profile.',
    },
    {
      key:'bridger_wallets',
      label:'Bridger primary wallets',
      status:n(missingBridgerWallets)===0?'healthy':'warning',
      count:n(missingBridgerWallets),
      detail:n(missingBridgerWallets)===0?'Every active Bridger has a primary wallet.':'Active Bridgers exist without a primary wallet.',
    },
    {
      key:'overdue_number_orders',
      label:'Overdue Number Bay orders',
      status:n(overdueNumberOrders)===0?'healthy':'warning',
      count:n(overdueNumberOrders),
      detail:n(overdueNumberOrders)===0?'No open number order has crossed its delivery deadline.':'Administration still owes delivery on open orders. This is reported but never auto-cancelled.',
    },
  ]
}

export async function runWeaveIntegrityEngine(mode:'scan'|'repair'='scan'):Promise<IntegrityReport>{
  await ensureMarketTables()
  await ensureBridgerNumberEngineSchema(getSql())

  const pool=getPool()
  const client=await pool.connect()
  const repairs:string[]=[]

  try{
    if(mode==='repair'){
      await client.query('BEGIN')

      const daily=await repairDailyProspectState(client,{
        reserveTarget:DAILY_PROSPECT_RESERVE,
        rebalancePackages:true,
      })
      if(daily.orphanClaims)repairs.push(`Removed ${daily.orphanClaims} orphan Daily Prospect claim(s).`)
      if(daily.strandedContacts)repairs.push(`Returned ${daily.strandedContacts} stranded Prospect contact(s) to available inventory.`)
      if(daily.archivedContacts)repairs.push(`Released ${daily.archivedContacts} contact(s) from archived Prospect packages.`)
      if(daily.rebalanced.length)repairs.push(`Moved ${daily.rebalanced.length} unused Prospect(s) from unsold packages into the Daily Prospect reserve and adjusted those package prices proportionally.`)

      const trimmed=await client.query(`
        UPDATE bridger_whatsapp_numbers
        SET country=TRIM(country),updated_at=NOW()
        WHERE country<>TRIM(country)
        RETURNING id
      `)
      if(trimmed.rowCount)repairs.push(`Normalized country formatting on ${trimmed.rowCount} Number Bay stock row(s).`)

      const repairedPrices=await client.query(`
        UPDATE bridger_whatsapp_numbers n
        SET price_flame_coin=o.price_flame_coin,updated_at=NOW()
        FROM bridger_number_country_offers o
        WHERE n.status='available'
          AND n.assigned_to IS NULL
          AND COALESCE(n.price_flame_coin,0)<=0
          AND o.enabled=true
          AND o.price_flame_coin>0
          AND LOWER(TRIM(o.country))=LOWER(TRIM(n.country))
        RETURNING n.id
      `)
      if(repairedPrices.rowCount)repairs.push(`Restored valid Bridger prices on ${repairedPrices.rowCount} available Number Bay row(s).`)

      const insertedOffers=await client.query(`
        INSERT INTO bridger_number_country_offers(
          country,price_flame_coin,enabled,delivery_minutes,created_at,updated_at
        )
        SELECT
          TRIM(n.country),
          MAX(n.price_flame_coin),
          true,
          30,
          NOW(),
          NOW()
        FROM bridger_whatsapp_numbers n
        WHERE n.status='available'
          AND n.assigned_to IS NULL
          AND n.price_flame_coin>0
          AND NOT EXISTS (
            SELECT 1 FROM bridger_number_country_offers o
            WHERE LOWER(TRIM(o.country))=LOWER(TRIM(n.country))
          )
        GROUP BY TRIM(n.country)
        ON CONFLICT(country) DO NOTHING
        RETURNING country
      `)
      if(insertedOffers.rowCount)repairs.push(`Published ${insertedOffers.rowCount} missing country offer(s) from valid available number stock.`)

      const fixedAssigned=await client.query(`
        UPDATE bridger_whatsapp_numbers
        SET status='assigned',assigned_at=COALESCE(assigned_at,NOW()),updated_at=NOW()
        WHERE assigned_to IS NOT NULL
          AND status='available'
        RETURNING id
      `)
      if(fixedAssigned.rowCount)repairs.push(`Corrected ${fixedAssigned.rowCount} assigned Number Bay row(s) that were still marked available.`)

      const profiles=await client.query(`
        INSERT INTO bridger_profiles(user_id,commission_rate,status,created_at,updated_at)
        SELECT u.id,0.50,'active',NOW(),NOW()
        FROM users u
        WHERE u.role='bridger'
          AND COALESCE(u.is_active,true)=true
          AND NOT EXISTS (
            SELECT 1 FROM bridger_profiles bp WHERE bp.user_id=u.id
          )
        RETURNING user_id
      `)
      if(profiles.rowCount)repairs.push(`Created ${profiles.rowCount} missing active Bridger profile(s).`)

      const wallets=await client.query(`
        INSERT INTO wallets(
          id,user_id,balance_trx,balance_usdt,is_primary,is_eight_engine_controlled,created_at,updated_at
        )
        SELECT gen_random_uuid(),u.id,0,0,true,true,NOW(),NOW()
        FROM users u
        WHERE u.role='bridger'
          AND COALESCE(u.is_active,true)=true
          AND NOT EXISTS (
            SELECT 1 FROM wallets w WHERE w.user_id=u.id AND w.is_primary=true
          )
        RETURNING user_id
      `)
      if(wallets.rowCount)repairs.push(`Created ${wallets.rowCount} missing primary Bridger wallet(s) with zero balance.`)

      await client.query('COMMIT')
    }

    const checks=await scanWithClient(client)
    const repairedKeys=new Set<string>()
    if(mode==='repair'&&repairs.length){
      for(const check of checks){
        if(check.status==='healthy'){
          if([
            'daily_prospect_reserve','orphan_daily_claims','stranded_prospects',
            'number_prices','number_country_drift','number_offer_coverage',
            'bridger_profiles','bridger_wallets',
          ].includes(check.key))repairedKeys.add(check.key)
        }
      }
    }

    const normalizedChecks=checks.map(check=>repairedKeys.has(check.key)
      ? {...check,status:'repaired' as const}
      : check)

    return {
      success:true,
      mode,
      checkedAt:new Date().toISOString(),
      checks:normalizedChecks,
      repairs,
      summary:{
        healthy:normalizedChecks.filter(check=>check.status==='healthy').length,
        warning:normalizedChecks.filter(check=>check.status==='warning').length,
        repaired:normalizedChecks.filter(check=>check.status==='repaired').length,
      },
    }
  }catch(error){
    if(mode==='repair')await client.query('ROLLBACK').catch(()=>null)
    throw error
  }finally{
    client.release()
  }
}
