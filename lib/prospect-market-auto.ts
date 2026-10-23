import { randomInt } from 'node:crypto'
import type { PoolClient } from 'pg'
import { getPool } from '@/lib/db'
import { ensureMarketTables } from '@/lib/market'

export const PROSPECT_MARKET_MINIMUM = 120
export const PROSPECT_AUTO_PACKAGE_SIZE = 5
export const PROSPECT_COUNTRY_SPACING = 2

// A country is a source classification, not proof that a phone number exists.
export const PROSPECT_COUNTRIES = [
  { code: 'NG', name: 'Nigeria', dial: '234' },
  { code: 'GH', name: 'Ghana', dial: '233' },
  { code: 'KE', name: 'Kenya', dial: '254' },
  { code: 'ZA', name: 'South Africa', dial: '27' },
  { code: 'UG', name: 'Uganda', dial: '256' },
  { code: 'TZ', name: 'Tanzania', dial: '255' },
  { code: 'RW', name: 'Rwanda', dial: '250' },
  { code: 'CM', name: 'Cameroon', dial: '237' },
  { code: 'GB', name: 'United Kingdom', dial: '44' },
  { code: 'US', name: 'United States', dial: '1' },
  { code: 'CA', name: 'Canada', dial: '1' },
  { code: 'DE', name: 'Germany', dial: '49' },
  { code: 'IN', name: 'India', dial: '91' },
  { code: 'AE', name: 'United Arab Emirates', dial: '971' },
  { code: 'BR', name: 'Brazil', dial: '55' },
  { code: 'PH', name: 'Philippines', dial: '63' },
] as const

type CountrySource = {
  country_code: string
  seed_phone: string
  next_offset: number
  enabled: boolean
}

let schemaPromise: Promise<void> | null = null

export function ensureProspectAutoSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      if (!await ensureMarketTables()) throw new Error('Prospect Market database unavailable')
      const pool = getPool()
      await pool.query('ALTER TABLE market_prospect_contacts ADD COLUMN IF NOT EXISTS country varchar(3)')
      await pool.query(
        'CREATE TABLE IF NOT EXISTS prospect_auto_country_sources (' +
        'country_code varchar(3) PRIMARY KEY, seed_phone varchar(24) NOT NULL, ' +
        'next_offset integer NOT NULL DEFAULT 0, enabled boolean NOT NULL DEFAULT true, ' +
        'updated_by uuid REFERENCES users(id), updated_at timestamptz NOT NULL DEFAULT now())',
      )
      await pool.query(
        'CREATE TABLE IF NOT EXISTS prospect_auto_settings (' +
        'singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton), ' +
        'enabled boolean NOT NULL DEFAULT false, updated_by uuid REFERENCES users(id), ' +
        'updated_at timestamptz NOT NULL DEFAULT now())',
      )
      await pool.query('INSERT INTO prospect_auto_settings(singleton,enabled) VALUES (true,false) ON CONFLICT DO NOTHING')
      await pool.query(
        'CREATE TABLE IF NOT EXISTS prospect_auto_publications (' +
        'seq bigserial PRIMARY KEY, contact_id uuid UNIQUE NOT NULL REFERENCES market_prospect_contacts(id), ' +
        'package_id uuid NOT NULL REFERENCES market_prospect_packages(id), ' +
        'country_code varchar(3) NOT NULL, created_at timestamptz NOT NULL DEFAULT now())',
      )
      await pool.query(
        'CREATE TABLE IF NOT EXISTS prospect_auto_runs (' +
        'id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_status varchar(32) NOT NULL, ' +
        'reason text, market_before integer NOT NULL, market_after integer NOT NULL, ' +
        'added integer NOT NULL DEFAULT 0, package_count integer NOT NULL DEFAULT 0, ' +
        'created_at timestamptz NOT NULL DEFAULT now())',
      )
    })().catch(error => { schemaPromise = null; throw error })
  }
  return schemaPromise
}

export function validateCountrySeed(countryCode: string, rawSeed: string) {
  const country = PROSPECT_COUNTRIES.find(row => row.code === countryCode.toUpperCase())
  if (!country) throw new Error('Select a supported country')
  const digits = String(rawSeed || '').replace(/[\s()+-]/g, '')
  const national = digits.slice(country.dial.length)
  if (!digits.startsWith(country.dial) || digits.length > 15 || national.length < 8 || national.length > 11 || !/^\d+$/.test(digits)) {
    throw new Error('Enter a country-matching international source number, including its dialing prefix')
  }
  return { country, seed: '+' + digits }
}

// Sources must be explicitly supplied by Administration. No website or external contact
// provider is implied, and generated candidates must never be called verified.
export async function saveProspectAutoSource(adminId: string, countryCode: string, seed: string, enabled: boolean) {
  await ensureProspectAutoSchema()
  const validated = validateCountrySeed(countryCode, seed)
  await getPool().query(
    'INSERT INTO prospect_auto_country_sources(country_code,seed_phone,next_offset,enabled,updated_by) ' +
    'VALUES ($1,$2,0,$3,$4::uuid) ON CONFLICT (country_code) DO UPDATE SET ' +
    'seed_phone=EXCLUDED.seed_phone, ' +
    'next_offset=CASE WHEN prospect_auto_country_sources.seed_phone=EXCLUDED.seed_phone THEN prospect_auto_country_sources.next_offset ELSE 0 END, ' +
    'enabled=EXCLUDED.enabled,updated_by=EXCLUDED.updated_by,updated_at=now()',
    [validated.country.code, validated.seed, enabled, adminId],
  )
}

export async function setProspectAutoEnabled(adminId: string, enabled: boolean) {
  await ensureProspectAutoSchema()
  await getPool().query(
    'UPDATE prospect_auto_settings SET enabled=$1,updated_by=$2::uuid,updated_at=now() WHERE singleton=true',
    [enabled,adminId],
  )
}

async function publishedCount(client: PoolClient) {
  const result = await client.query(
    "SELECT COUNT(*)::int AS total FROM market_prospect_contacts c " +
    "JOIN market_prospect_packages p ON p.id=c.package_id " +
    "WHERE p.status='published' AND p.purchased_by IS NULL AND c.status='packaged'",
  )
  return Number(result.rows[0]?.total || 0)
}

export async function getProspectAutoStatus() {
  await ensureProspectAutoSchema()
  const pool=getPool()
  const [settings,sources,inventory,lastRun] = await Promise.all([
    pool.query('SELECT enabled,updated_at FROM prospect_auto_settings WHERE singleton=true'),
    pool.query('SELECT country_code,seed_phone,next_offset,enabled,updated_at FROM prospect_auto_country_sources ORDER BY country_code'),
    pool.query(
      "SELECT COUNT(*)::int AS total FROM market_prospect_contacts c " +
      "JOIN market_prospect_packages p ON p.id=c.package_id " +
      "WHERE p.status='published' AND p.purchased_by IS NULL AND c.status='packaged'",
    ),
    pool.query('SELECT * FROM prospect_auto_runs ORDER BY created_at DESC LIMIT 1'),
  ])
  return {
    enabled: Boolean(settings.rows[0]?.enabled),
    marketCandidates: Number(inventory.rows[0]?.total || 0),
    threshold: PROSPECT_MARKET_MINIMUM,
    countrySpacing: PROSPECT_COUNTRY_SPACING,
    countries: PROSPECT_COUNTRIES,
    sources: sources.rows,
    lastRun: lastRun.rows[0] || null,
  }
}

export function countrySequenceChoice(codes: string[], recent: string[], index?: number) {
  const blocked = new Set(recent.slice(0, PROSPECT_COUNTRY_SPACING))
  const possible = codes.filter(code => !blocked.has(code))
  if (possible.length === 0) return null
  return possible[(index === undefined ? randomInt(possible.length) : index % possible.length + possible.length) % possible.length]
}

function candidateFor(source: CountrySource) {
  const config = PROSPECT_COUNTRIES.find(row => row.code === source.country_code)
  if (!config) return null
  const digits=source.seed_phone.replace(/\D/g,'')
  const national=digits.slice(config.dial.length)
  const next=(BigInt(national)+BigInt(source.next_offset)).toString()
  if (next.length !== national.length) return null
  return '+' + config.dial + next.padStart(national.length,'0')
}

async function recordRun(client: PoolClient, runStatus: string, reason: string, before: number, after: number, added: number, packages: number) {
  await client.query(
    'INSERT INTO prospect_auto_runs(run_status,reason,market_before,market_after,added,package_count) VALUES ($1,$2,$3,$4,$5,$6)',
    [runStatus,reason,before,after,added,packages],
  )
  return { status:runStatus, reason, before, after, added, packages }
}

export async function runProspectMarketAuto() {
  await ensureProspectAutoSchema()
  const client=await getPool().connect()
  try {
    await client.query('BEGIN')
    // All invocations, manual and scheduler, use the same transaction-scoped lock.
    await client.query('SELECT pg_advisory_xact_lock($1)',[12012026])
    const before=await publishedCount(client)
    const setting=(await client.query('SELECT enabled FROM prospect_auto_settings WHERE singleton=true')).rows[0]
    if (!setting?.enabled) {
      const result=await recordRun(client,'paused','Administration has not enabled automatic publishing.',before,before,0,0)
      await client.query('COMMIT')
      return result
    }
    if (before >= PROSPECT_MARKET_MINIMUM) {
      const result=await recordRun(client,'stocked','Published marketplace inventory is at or above 120.',before,before,0,0)
      await client.query('COMMIT')
      return result
    }
    const admin=(await client.query(
      "SELECT id FROM users WHERE role='admin' AND COALESCE(is_active,true)=true ORDER BY created_at ASC LIMIT 1",
    )).rows[0]
    if (!admin) {
      const result=await recordRun(client,'blocked','No active Administration account owns new packages.',before,before,0,0)
      await client.query('COMMIT')
      return result
    }
    const rows=await client.query('SELECT country_code,seed_phone,next_offset,enabled FROM prospect_auto_country_sources WHERE enabled=true ORDER BY country_code FOR UPDATE')
    const sources=rows.rows.map(row=>({ ...row, next_offset:Number(row.next_offset) })) as CountrySource[]
    if (sources.length < PROSPECT_COUNTRY_SPACING+1) {
      const result=await recordRun(client,'blocked','At least three active country sources are needed to keep countries apart.',before,before,0,0)
      await client.query('COMMIT')
      return result
    }
    const recentResult=await client.query(
      'SELECT country_code FROM prospect_auto_publications ORDER BY seq DESC LIMIT $1',
      [PROSPECT_COUNTRY_SPACING],
    )
    const recent:string[]=recentResult.rows.map(row=>String(row.country_code))
    const available=sources.slice()
    let added=0
    let packageCount=0
    const limit=PROSPECT_MARKET_MINIMUM-before

    while (added < limit && available.length >= PROSPECT_COUNTRY_SPACING+1) {
      const pkg=(await client.query(
        "INSERT INTO market_prospect_packages(created_by,title,description,price_trx,status) " +
        "VALUES ($1::uuid,'Country-Mixed Prospect Candidates','Unverified candidate numbers; reachability is not confirmed.',1.1,'draft') RETURNING id",
        [admin.id],
      )).rows[0]
      let count=0
      const countries:string[]=[]
      while (count < PROSPECT_AUTO_PACKAGE_SIZE && added < limit && available.length >= PROSPECT_COUNTRY_SPACING+1) {
        const country=countrySequenceChoice(available.map(row=>row.country_code),recent)
        if (!country) break
        const source=available.find(row=>row.country_code===country)!
        let inserted=false
        for (let attempt=0;attempt<40;attempt++) {
          const number=candidateFor(source)
          source.next_offset++
          if (!number) break
          const exists=await client.query('SELECT 1 FROM market_prospect_contacts WHERE phone=$1 LIMIT 1',[number])
          if (exists.rowCount) continue
          const contact=(await client.query(
            'INSERT INTO market_prospect_contacts(package_id,phone,whatsapp_number,country,source_platform,status,notes) ' +
            "VALUES ($1::uuid,$2,$2,$3,'auto_country_number_series','packaged',$4) RETURNING id",
            [pkg.id,number,country,'Unverified candidate generated from an Administration-supplied country series. Number ownership, WhatsApp availability and permission to contact are not established.'],
          )).rows[0]
          await client.query(
            'INSERT INTO prospect_auto_publications(contact_id,package_id,country_code) VALUES ($1::uuid,$2::uuid,$3)',
            [contact.id,pkg.id,country],
          )
          inserted=true
          added++
          count++
          countries.push(country)
          recent.unshift(country)
          if (recent.length>PROSPECT_COUNTRY_SPACING) recent.pop()
          break
        }
        if (!inserted) {
          available.splice(available.indexOf(source),1)
        }
      }
      if (count===0) {
        await client.query('DELETE FROM market_prospect_packages WHERE id=$1::uuid',[pkg.id])
        break
      }
      const names=countries.map(code=>PROSPECT_COUNTRIES.find(row=>row.code===code)?.name||code)
      await client.query(
        "UPDATE market_prospect_packages SET title=$2,description=$3,price_trx=$4,status='published',updated_at=now() WHERE id=$1::uuid",
        [pkg.id,'Global Prospect Mix · '+count+' candidates',names.join(' · ')+'. These are unverified candidate numbers. Reachability is established only through real responses.',count*1.1],
      )
      await client.query(
        'INSERT INTO market_prospect_audit(package_id,actor_id,action,details) VALUES ($1::uuid,$2::uuid,$3,$4::jsonb)',
        [pkg.id,admin.id,'auto_country_publish',JSON.stringify({ countries, count, threshold:PROSPECT_MARKET_MINIMUM })],
      )
      packageCount++
    }
    for(const source of sources){
      await client.query('UPDATE prospect_auto_country_sources SET next_offset=$2,updated_at=now() WHERE country_code=$1',[source.country_code,source.next_offset])
    }
    const after=await publishedCount(client)
    const result=await recordRun(
      client,added?'published':'blocked',
      added ? 'Published country-rotated packages up to available capacity.' : 'Country sources are exhausted or cannot generate new unique candidates.',
      before,after,added,packageCount,
    )
    await client.query('COMMIT')
    return result
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  } finally {
    client.release()
  }
}
