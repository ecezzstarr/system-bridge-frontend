import { getPool } from '@/lib/db'
import { ensureWeaveReceiptSchema } from '@/lib/weave-receipts'

export type VideoStudioPackage = {
  packageKey: string
  name: string
  description: string
  durationSeconds: number
  priceFlameCoin: number
  active: boolean
  sortOrder: number
}

export type VideoStudioOrder = {
  id: string
  userId: string
  userRole: 'agent' | 'bridger' | 'client'
  packageKey: string
  packageName: string
  durationSeconds: number
  priceFlameCoin: number
  businessName: string
  subject: string
  objective: string
  audience: string
  notes: string
  assets: string[]
  status: 'paid' | 'in_production' | 'ready' | 'delivered'
  projectId: string | null
  outputUrl: string | null
  orderSource: 'self' | 'outside_client'
  serviceOrderId: string | null
  createdAt: string
  updatedAt: string
}

export type VideoServiceProfile = {
  userId: string
  publicCode: string
  displayName: string
  tagline: string
  active: boolean
}

export type VideoServiceOrder = {
  id: string
  providerUserId: string
  providerRole: 'agent' | 'bridger' | 'client'
  customerKind: 'personal' | 'business'
  customerName: string
  customerContact: string
  customerEmail: string
  businessName: string
  packageKey: string
  packageName: string
  durationSeconds: number
  quotedAmount: number | null
  quotedCurrency: string
  subject: string
  objective: string
  audience: string
  notes: string
  assets: string[]
  customerPaymentStatus: 'pending' | 'received'
  status: 'requested' | 'accepted' | 'studio_paid' | 'in_production' | 'ready' | 'delivered' | 'rejected'
  studioOrderId: string | null
  projectId: string | null
  outputUrl: string | null
  createdAt: string
  updatedAt: string
}

export const VIDEO_STUDIO_CUSTOMER_ROLES = new Set(['agent', 'bridger', 'client'])

const DEFAULT_PACKAGES = [
  ['social-30', 'Social Cut', 'A focused 30-second vertical video for fast social movement.', 30, 30, 10],
  ['full-60', 'Full Ad', 'A complete 60-second advertisement with room for problem, reveal and proof.', 60, 50, 20],
  ['business-120', 'Business Story', 'A two-minute business story with stronger context, product proof and consequence.', 120, 90, 30],
  ['campaign-180', 'Campaign Film', 'A three-minute campaign production for deeper product or company movement.', 180, 130, 40],
  ['brand-360', 'Brand Film', 'A six-minute long-form business film for a complete narrative and multiple proof scenes.', 360, 220, 50],
] as const

export async function ensureVideoAdStudioSchema() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_ad_studio_packages (
      package_key varchar(80) PRIMARY KEY,
      name varchar(160) NOT NULL,
      description text NOT NULL,
      duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 30 AND 360),
      price_flame_coin numeric(30,8) NOT NULL CHECK (price_flame_coin >= 0),
      active boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
  for (const row of DEFAULT_PACKAGES) {
    await pool.query(
      `INSERT INTO video_ad_studio_packages(package_key,name,description,duration_seconds,price_flame_coin,active,sort_order)
       VALUES($1,$2,$3,$4,$5,true,$6)
       ON CONFLICT(package_key) DO NOTHING`,
      row as unknown as any[]
    )
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_ad_studio_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),
      user_role varchar(20) NOT NULL CHECK (user_role IN ('agent','bridger','client')),
      package_key varchar(80) NOT NULL REFERENCES video_ad_studio_packages(package_key),
      package_name varchar(160) NOT NULL,
      duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 30 AND 360),
      price_flame_coin numeric(30,8) NOT NULL CHECK (price_flame_coin >= 0),
      business_name varchar(180) NOT NULL,
      subject text NOT NULL,
      objective text NOT NULL,
      audience text NOT NULL,
      notes text NOT NULL DEFAULT '',
      assets jsonb NOT NULL DEFAULT '[]'::jsonb,
      status varchar(24) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','in_production','ready','delivered')),
      project_id uuid,
      output_url text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query("ALTER TABLE video_ad_studio_orders ADD COLUMN IF NOT EXISTS order_source varchar(24) NOT NULL DEFAULT 'self'")
  await pool.query('ALTER TABLE video_ad_studio_orders ADD COLUMN IF NOT EXISTS service_order_id uuid')
  await pool.query('CREATE INDEX IF NOT EXISTS video_ad_studio_orders_user_idx ON video_ad_studio_orders(user_id,created_at DESC)')
  await pool.query('CREATE INDEX IF NOT EXISTS video_ad_studio_orders_status_idx ON video_ad_studio_orders(status,created_at ASC)')
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS video_ad_studio_orders_service_order_idx ON video_ad_studio_orders(service_order_id) WHERE service_order_id IS NOT NULL')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_ad_service_profiles (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      public_code uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
      display_name varchar(160) NOT NULL DEFAULT '',
      tagline text NOT NULL DEFAULT '',
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_ad_service_prices (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      package_key varchar(80) NOT NULL REFERENCES video_ad_studio_packages(package_key) ON DELETE CASCADE,
      personal_price numeric(30,2),
      business_price numeric(30,2),
      currency varchar(12) NOT NULL DEFAULT 'NGN',
      active boolean NOT NULL DEFAULT true,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY(user_id,package_key),
      CHECK (personal_price IS NULL OR personal_price >= 0),
      CHECK (business_price IS NULL OR business_price >= 0)
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_ad_service_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_role varchar(20) NOT NULL CHECK (provider_role IN ('agent','bridger','client')),
      customer_kind varchar(16) NOT NULL CHECK (customer_kind IN ('personal','business')),
      customer_name varchar(160) NOT NULL,
      customer_contact varchar(180) NOT NULL,
      customer_email varchar(220) NOT NULL DEFAULT '',
      business_name varchar(180) NOT NULL DEFAULT '',
      package_key varchar(80) NOT NULL REFERENCES video_ad_studio_packages(package_key),
      package_name varchar(160) NOT NULL,
      duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 30 AND 360),
      quoted_amount numeric(30,2),
      quoted_currency varchar(12) NOT NULL DEFAULT 'NGN',
      subject text NOT NULL,
      objective text NOT NULL,
      audience text NOT NULL,
      notes text NOT NULL DEFAULT '',
      assets jsonb NOT NULL DEFAULT '[]'::jsonb,
      customer_payment_status varchar(16) NOT NULL DEFAULT 'pending' CHECK (customer_payment_status IN ('pending','received')),
      status varchar(24) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','accepted','studio_paid','in_production','ready','delivered','rejected')),
      studio_order_id uuid,
      project_id uuid,
      output_url text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS video_ad_service_orders_provider_idx ON video_ad_service_orders(provider_user_id,created_at DESC)')
  await pool.query('CREATE INDEX IF NOT EXISTS video_ad_service_orders_status_idx ON video_ad_service_orders(status,created_at ASC)')
  await ensureWeaveReceiptSchema()
}

export async function listVideoStudioPackages(includeInactive = false): Promise<VideoStudioPackage[]> {
  await ensureVideoAdStudioSchema()
  const pool = getPool()
  const result = await pool.query(
    `SELECT package_key,name,description,duration_seconds,price_flame_coin,active,sort_order
     FROM video_ad_studio_packages
     ${includeInactive ? '' : 'WHERE active=true'}
     ORDER BY sort_order,duration_seconds,name`
  )
  return result.rows.map((row:any) => ({
    packageKey: String(row.package_key),
    name: String(row.name),
    description: String(row.description),
    durationSeconds: Number(row.duration_seconds),
    priceFlameCoin: Number(row.price_flame_coin),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order),
  }))
}

export async function ensureVideoServiceProfile(userId:string, displayName:string) {
  await ensureVideoAdStudioSchema()
  const pool = getPool()
  const result = await pool.query(
    `INSERT INTO video_ad_service_profiles(user_id,display_name)
     VALUES($1::uuid,$2)
     ON CONFLICT(user_id) DO UPDATE SET display_name=CASE WHEN video_ad_service_profiles.display_name='' THEN EXCLUDED.display_name ELSE video_ad_service_profiles.display_name END,updated_at=NOW()
     RETURNING *`,
    [userId,String(displayName||'').trim().slice(0,160)]
  )
  return mapVideoServiceProfile(result.rows[0])
}

export function mapVideoServiceProfile(row:any): VideoServiceProfile {
  return {
    userId:String(row.user_id),
    publicCode:String(row.public_code),
    displayName:String(row.display_name||''),
    tagline:String(row.tagline||''),
    active:Boolean(row.active),
  }
}

export function mapVideoServiceOrder(row:any): VideoServiceOrder {
  return {
    id:String(row.id),
    providerUserId:String(row.provider_user_id),
    providerRole:row.provider_role,
    customerKind:row.customer_kind,
    customerName:String(row.customer_name||''),
    customerContact:String(row.customer_contact||''),
    customerEmail:String(row.customer_email||''),
    businessName:String(row.business_name||''),
    packageKey:String(row.package_key),
    packageName:String(row.package_name),
    durationSeconds:Number(row.duration_seconds),
    quotedAmount:row.quoted_amount===null||row.quoted_amount===undefined?null:Number(row.quoted_amount),
    quotedCurrency:String(row.quoted_currency||'NGN'),
    subject:String(row.subject||''),
    objective:String(row.objective||''),
    audience:String(row.audience||''),
    notes:String(row.notes||''),
    assets:Array.isArray(row.assets)?row.assets.map(String):[],
    customerPaymentStatus:row.customer_payment_status,
    status:row.status,
    studioOrderId:row.studio_order_id?String(row.studio_order_id):null,
    projectId:row.project_id?String(row.project_id):null,
    outputUrl:row.output_url||null,
    createdAt:row.created_at,
    updatedAt:row.updated_at,
  }
}

export function mapVideoStudioOrder(row:any): VideoStudioOrder {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userRole: row.user_role,
    packageKey: String(row.package_key),
    packageName: String(row.package_name),
    durationSeconds: Number(row.duration_seconds),
    priceFlameCoin: Number(row.price_flame_coin),
    businessName: String(row.business_name || ''),
    subject: String(row.subject || ''),
    objective: String(row.objective || ''),
    audience: String(row.audience || ''),
    notes: String(row.notes || ''),
    assets: Array.isArray(row.assets) ? row.assets.map(String) : [],
    status: row.status,
    projectId: row.project_id ? String(row.project_id) : null,
    outputUrl: row.output_url || null,
    orderSource: row.order_source === 'outside_client' ? 'outside_client' : 'self',
    serviceOrderId: row.service_order_id ? String(row.service_order_id) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
