import { sql } from '@/lib/db'

export async function ensureAgentDistributionSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS agent_distribution_outlets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id uuid NOT NULL REFERENCES users(id),
      name varchar(180) NOT NULL,
      contact_name varchar(180),
      phone varchar(50),
      address text NOT NULL,
      notes text,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_distribution_outlets_agent ON agent_distribution_outlets(agent_id, active, created_at DESC)`

  await sql`
    CREATE TABLE IF NOT EXISTS agility_outlet_placements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id uuid NOT NULL REFERENCES users(id),
      outlet_id uuid NOT NULL REFERENCES agent_distribution_outlets(id),
      order_id uuid NOT NULL REFERENCES agility_stock_orders(id),
      variant_id varchar(80) NOT NULL,
      carton_count integer NOT NULL,
      package_count integer NOT NULL,
      supply_mode varchar(40) NOT NULL,
      agreed_amount_ngn numeric(14,2) NOT NULL,
      packages_reported_sold integer NOT NULL DEFAULT 0,
      amount_collected_ngn numeric(14,2) NOT NULL DEFAULT 0,
      status varchar(50) NOT NULL DEFAULT 'with_outlet',
      agent_note text,
      supplied_at timestamptz NOT NULL DEFAULT NOW(),
      settled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      CHECK (carton_count > 0),
      CHECK (package_count > 0),
      CHECK (agreed_amount_ngn > 0),
      CHECK (packages_reported_sold >= 0),
      CHECK (amount_collected_ngn >= 0),
      CHECK (supply_mode IN ('paid_now','pay_after_sale')),
      CHECK (status IN ('with_outlet','sold_out_awaiting_settlement','settled'))
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_outlet_placements_agent ON agility_outlet_placements(agent_id, supplied_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_outlet_placements_outlet ON agility_outlet_placements(outlet_id, supplied_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_outlet_placements_order ON agility_outlet_placements(order_id)`

  await sql`
    CREATE TABLE IF NOT EXISTS agility_outlet_collections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      placement_id uuid NOT NULL REFERENCES agility_outlet_placements(id),
      agent_id uuid NOT NULL REFERENCES users(id),
      amount_ngn numeric(14,2) NOT NULL,
      note text,
      collected_at timestamptz NOT NULL DEFAULT NOW(),
      created_at timestamptz NOT NULL DEFAULT NOW(),
      CHECK (amount_ngn > 0)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_outlet_collections_agent ON agility_outlet_collections(agent_id, collected_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_outlet_collections_placement ON agility_outlet_collections(placement_id, collected_at DESC)`
}
