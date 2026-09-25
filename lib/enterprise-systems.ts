import { sql } from '@/lib/db'

export type EnterpriseSystemCatalogItem = {
  system_key: string
  name: string
  category: string
  summary: string
  includes: string[]
  delivery_model: string
  price_gbp: number
  published: boolean
  sort_order: number
}

export async function ensureEnterpriseSystemsSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS enterprise_system_catalog (
      system_key varchar(100) PRIMARY KEY,
      name varchar(220) NOT NULL,
      category varchar(100) NOT NULL,
      summary text NOT NULL,
      includes jsonb NOT NULL DEFAULT '[]'::jsonb,
      delivery_model varchar(160) NOT NULL,
      price_gbp numeric(18,2) NOT NULL CHECK (price_gbp >= 1000000),
      published boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS enterprise_system_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      system_key varchar(100) NOT NULL REFERENCES enterprise_system_catalog(system_key),
      buyer_user_id uuid NOT NULL,
      buyer_role varchar(40) NOT NULL,
      buyer_name varchar(220),
      buyer_email varchar(255),
      quoted_price_gbp numeric(18,2) NOT NULL CHECK (quoted_price_gbp >= 1000000),
      quoted_flame_coin numeric(30,8),
      gbp_per_flame_coin numeric(30,12),
      rate_source varchar(32),
      status varchar(40) NOT NULL DEFAULT 'requested',
      acquisition_note text,
      admin_note text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`ALTER TABLE enterprise_system_orders ADD COLUMN IF NOT EXISTS quoted_flame_coin numeric(30,8)`
  await sql`ALTER TABLE enterprise_system_orders ADD COLUMN IF NOT EXISTS gbp_per_flame_coin numeric(30,12)`
  await sql`ALTER TABLE enterprise_system_orders ADD COLUMN IF NOT EXISTS rate_source varchar(32)`

  await sql`
    CREATE INDEX IF NOT EXISTS idx_enterprise_system_orders_buyer
    ON enterprise_system_orders(buyer_user_id, created_at DESC)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_enterprise_system_orders_status
    ON enterprise_system_orders(status, created_at DESC)
  `

  const systems = [
    ['enterprise_ai_command','Enterprise AI Command System','AI & Operations','An enterprise-wide intelligence and operations environment that connects people, workflows, records, AI assistance and executive command into one operating layer.',
      ['Private AI orchestration','Executive command center','Workflow automation','Department workspaces','Audit and records layer','API and data integrations','On-premise or cloud deployment'],
      'Software + private infrastructure', 2800000, 10],
    ['private_cloud_stack','Private Cloud & Data Sovereignty Stack','Cloud & Infrastructure','A private enterprise cloud for organizations that need their applications, data, identity, AI workloads and backups under a controlled infrastructure boundary.',
      ['Private cloud control plane','Identity and access system','Encrypted storage','Backup and disaster recovery','Container platform','Observability','Secure administration hardware'],
      'Software + server infrastructure', 6500000, 20],
    ['smart_factory_os','Smart Factory Operating System','Industrial Technology','A connected factory environment joining production planning, machines, sensors, inventory, quality, maintenance and management into one operating system.',
      ['Production control software','Industrial IoT gateway network','Machine telemetry','Inventory and quality systems','Predictive maintenance layer','Plant command screens','Edge compute hardware'],
      'Industrial software + edge hardware', 9200000, 30],
    ['logistics_command_network','Logistics Command Network','Mobility & Logistics','A national or multi-region logistics system for fleets, warehouses, routes, drivers, inventory, dispatch, tracking and customer delivery operations.',
      ['Fleet command software','Warehouse operating system','Routing intelligence','Driver applications','Tracking hardware integration','Customer delivery portal','Analytics and control center'],
      'Software + fleet/warehouse integration', 4200000, 40],
    ['enterprise_payment_rail','Enterprise Payment & Settlement Rail','Financial Technology','A private payment and settlement infrastructure for organizations coordinating collections, internal ledgers, treasury movement, reconciliation and multi-rail payment operations.',
      ['Ledger infrastructure','Collections orchestration','Treasury controls','Reconciliation engine','Payment-provider integrations','Settlement reporting','Administrative approval controls'],
      'Financial software infrastructure', 7800000, 50],
    ['cyber_defense_fabric','Cyber Defense Fabric','Security Infrastructure','A defensive enterprise security environment that joins identity, device posture, logs, detection, incident response and infrastructure protection into one security operating layer.',
      ['Zero-trust identity controls','Endpoint posture integration','Security event collection','Detection and alerting','Incident command workspace','Recovery playbooks','Security operations dashboards'],
      'Defensive software + security infrastructure', 5400000, 60],
    ['hospital_operations_grid','Hospital Operations Grid','Health Operations Technology','A large hospital or hospital-network operations system focused on patient flow, staffing, facilities, inventory, scheduling, records coordination and operational command.',
      ['Patient flow coordination','Staff and shift operations','Facility command board','Inventory and supply movement','Scheduling systems','Records interoperability','Operational analytics'],
      'Healthcare operations software + infrastructure', 6100000, 70],
    ['energy_microgrid_command','Energy Microgrid Command System','Energy Technology','A control and intelligence environment for distributed power assets, meters, storage, maintenance, billing interfaces and operating teams.',
      ['Asset monitoring','Meter and telemetry integration','Battery/storage coordination','Maintenance workflows','Operations command center','Billing/export interfaces','Edge control hardware integration'],
      'Energy software + control hardware integration', 11800000, 80],
    ['telecom_edge_network','Telecom Edge & Service Network','Connectivity Infrastructure','A distributed software and edge-compute system for service providers that need regional service nodes, subscriber operations, observability and application delivery.',
      ['Edge compute nodes','Subscriber/service control','Network observability','Regional deployment automation','Identity and entitlement','Service APIs','Operations command layer'],
      'Telecom software + edge hardware', 14500000, 90],
    ['robotic_fulfillment_cell','Robotic Fulfillment System','Robotics & Commerce','A warehouse automation system combining fulfillment software, scanning, conveyor/robot interfaces, picking workflows and centralized operations.',
      ['Warehouse execution software','Robot/conveyor integration','Scanning and vision integration','Order orchestration','Inventory synchronization','Safety and exception workflows','Operations command screens'],
      'Software + robotics integration', 8600000, 100],
    ['digital_twin_command','Enterprise Digital Twin Command Environment','Simulation & Infrastructure','A high-capacity digital twin environment for infrastructure, industrial estates, campuses or complex enterprises where physical assets and operations need one live model.',
      ['Asset digital twin','Live telemetry integration','Simulation environment','Incident and maintenance workflows','Command center visualization','Historical records','AI-assisted operational analysis'],
      'Software + sensor/data infrastructure', 17500000, 110],
    ['national_service_platform','National-Scale Service Delivery Platform','Institutional Technology','A large institutional service platform for identity-linked applications, case movement, payments, notifications, records, regional operations and high-volume public or member access.',
      ['High-scale service portal','Case/workflow engine','Identity integration','Payment integration','Notification infrastructure','Regional administration','Audit and reporting','High-availability deployment'],
      'Large-scale software + infrastructure', 24000000, 120],
  ] as const

  for (const system of systems) {
    await sql`
      INSERT INTO enterprise_system_catalog (
        system_key,name,category,summary,includes,delivery_model,price_gbp,published,sort_order
      )
      VALUES (
        ${system[0]},${system[1]},${system[2]},${system[3]},
        ${JSON.stringify(system[4])}::jsonb,${system[5]},${system[6]},true,${system[7]}
      )
      ON CONFLICT (system_key) DO NOTHING
    `
  }
}
