import { getPool } from '@/lib/db'

/** Demand stays private until Administrations verifies a real request; it is not an order. */
export const DOOR_CATEGORIES = ['food', 'retail', 'services', 'agriculture', 'digital', 'creative', 'other'] as const
export type DoorCategory = (typeof DOOR_CATEGORIES)[number]
export const DOOR_CATEGORY_NAMES: Record<DoorCategory, string> = {
  food: 'Food & hospitality', retail: 'Retail & fashion',
  services: 'Personal & professional services', agriculture: 'Agriculture & supply',
  digital: 'Digital services', creative: 'Creative production', other: 'Other industries',
}
export function cleanDoorText(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''
}
export function validDoorCategory(input: unknown): input is DoorCategory {
  return typeof input === 'string' && DOOR_CATEGORIES.includes(input as DoorCategory)
}
export async function ensureUnbuiltDoorSchema() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS weave_unbuilt_door_demands (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      category varchar(32) NOT NULL,
      location varchar(90) NOT NULL,
      title varchar(120) NOT NULL,
      description text NOT NULL,
      contact_email varchar(255) NOT NULL,
      consent_at timestamptz NOT NULL,
      status varchar(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','verified','rejected','closed')),
      verification_basis text,
      reviewed_by uuid,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_unbuilt_door_status_time
    ON weave_unbuilt_door_demands(status, reviewed_at DESC, created_at DESC)
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_unbuilt_door_email_time
    ON weave_unbuilt_door_demands(lower(contact_email), created_at DESC)
  `)
}
export async function submitDoorDemand(input: {
  category: unknown; location: unknown; title: unknown
  description: unknown; email: unknown; consent: unknown
}) {
  const category = input.category
  const location = cleanDoorText(input.location, 90)
  const title = cleanDoorText(input.title, 120)
  const description = cleanDoorText(input.description, 600)
  const email = cleanDoorText(input.email, 255).toLowerCase()
  if (!validDoorCategory(category) || location.length < 2 || title.length < 8 || description.length < 20 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || input.consent !== true) {
    throw new Error('Provide your industry, location, specific request, contact email and permission for Weave to review it.')
  }
  await ensureUnbuiltDoorSchema()
  const pool = getPool()
  const count = await pool.query(
    `SELECT COUNT(*)::int AS n FROM weave_unbuilt_door_demands
     WHERE lower(contact_email) = $1 AND created_at >= now() - interval '7 days'`,
    [email],
  )
  if (Number(count.rows[0]?.n || 0) >= 2) {
    throw new Error('This address has already submitted two requests this week.')
  }
  const result = await pool.query(
    `INSERT INTO weave_unbuilt_door_demands
      (category, location, title, description, contact_email, consent_at)
     VALUES ($1,$2,$3,$4,$5,now()) RETURNING id,status,created_at`,
    [category, location, title, description, email],
  )
  return result.rows[0]
}
export async function getPublicDoorDemands() {
  await ensureUnbuiltDoorSchema()
  const result = await getPool().query(
    `SELECT id,category,location,title,description,reviewed_at AS verified_at
     FROM weave_unbuilt_door_demands WHERE status = 'verified'
     ORDER BY reviewed_at DESC NULLS LAST LIMIT 36`,
  )
  // Second privacy boundary: never disclose contact details from public fields.
  const redact = (value: string) => value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contact withheld]')
    .replace(/(?:\+?\d[\s().-]?){8,}/g, '[phone withheld]')
    .replace(/https?:\/\/\S+/gi, '[link withheld]')
  return result.rows.map(row => ({
    ...row,
    title: redact(String(row.title)),
    location: redact(String(row.location)),
    description: redact(String(row.description)),
  }))
}
export async function getAdminDoorDemands() {
  await ensureUnbuiltDoorSchema()
  const result = await getPool().query(
    `SELECT id,category,location,title,description,contact_email,status,
            verification_basis,reviewed_by,reviewed_at,created_at
     FROM weave_unbuilt_door_demands ORDER BY
      CASE status WHEN 'pending' THEN 0 WHEN 'verified' THEN 1 ELSE 2 END,
      created_at DESC LIMIT 120`,
  )
  return result.rows
}
export async function reviewDoorDemand(input: {
  id: string; action: 'verify' | 'reject' | 'close'
  basis: string; adminId: string
}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id)) {
    throw new Error('Invalid demand reference.')
  }
  const basis = cleanDoorText(input.basis, 400)
  if (input.action === 'verify' && basis.length < 10) {
    throw new Error('Record how this real customer request was independently confirmed.')
  }
  await ensureUnbuiltDoorSchema()
  const status = input.action === 'verify' ? 'verified' : input.action === 'reject' ? 'rejected' : 'closed'
  const fromStatus = input.action === 'close' ? 'verified' : 'pending'
  const result = await getPool().query(
    `UPDATE weave_unbuilt_door_demands
       SET status=$1,verification_basis=$2,reviewed_by=$3::uuid,reviewed_at=now()
     WHERE id=$4::uuid AND status=$5 RETURNING id,status,reviewed_at`,
    [status, basis || null, input.adminId, input.id, fromStatus],
  )
  if (!result.rows[0]) throw new Error('Request not found or already moved to a different stage.')
  return result.rows[0]
}

export async function ensureDoorInterestsSchema() {
  await ensureUnbuiltDoorSchema()
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS weave_unbuilt_door_interests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      demand_id uuid NOT NULL REFERENCES weave_unbuilt_door_demands(id),
      business_name varchar(140) NOT NULL,
      contact_email varchar(255) NOT NULL,
      proposed_service varchar(600) NOT NULL,
      movement_code varchar(40),
      consent_at timestamptz NOT NULL DEFAULT now(),
      status varchar(20) NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested','contacted','qualified','converted','closed')),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await getPool().query(`
    CREATE INDEX IF NOT EXISTS idx_unbuilt_door_interests_time
    ON weave_unbuilt_door_interests(created_at DESC)
  `)
}
export async function submitDoorInterest(input: {
  demandId: unknown; businessName: unknown; email: unknown
  service: unknown; movement: unknown; consent: unknown
}) {
  const demandId = cleanDoorText(input.demandId, 60)
  const businessName = cleanDoorText(input.businessName, 140)
  const email = cleanDoorText(input.email, 255).toLowerCase()
  const service = cleanDoorText(input.service, 600)
  const movement = cleanDoorText(input.movement, 40).toUpperCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(demandId) ||
      businessName.length < 2 || service.length < 20 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || input.consent !== true ||
      (movement && !/^[A-Z0-9-]+$/.test(movement))) {
    throw new Error('Provide your business, proposal, valid contact email and permission for Weave to respond.')
  }
  await ensureDoorInterestsSchema()
  const pool = getPool()
  const verified = await pool.query(
    `SELECT id FROM weave_unbuilt_door_demands WHERE id=$1::uuid AND status='verified'`,
    [demandId],
  )
  if (!verified.rows[0]) throw new Error('This opportunity is no longer publicly available.')
  const prior = await pool.query(
    `SELECT COUNT(*)::int AS n FROM weave_unbuilt_door_interests
     WHERE lower(contact_email)=$1 AND created_at >= now()-interval '7 days'`,
    [email],
  )
  if (Number(prior.rows[0]?.n || 0) >= 3) throw new Error('This address has reached its weekly interest limit.')
  const result = await pool.query(
    `INSERT INTO weave_unbuilt_door_interests
        (demand_id,business_name,contact_email,proposed_service,movement_code)
     VALUES ($1::uuid,$2,$3,$4,$5) RETURNING id,status,created_at`,
    [demandId, businessName, email, service, movement || null],
  )
  return result.rows[0]
}
export async function getAdminDoorInterests() {
  await ensureDoorInterestsSchema()
  const result = await getPool().query(
    `SELECT i.id,i.demand_id,i.business_name,i.contact_email,i.proposed_service,
            i.movement_code,i.status,i.created_at,d.title AS demand_title,d.category
     FROM weave_unbuilt_door_interests i
     JOIN weave_unbuilt_door_demands d ON d.id=i.demand_id
     ORDER BY i.created_at DESC LIMIT 120`,
  )
  return result.rows
}
