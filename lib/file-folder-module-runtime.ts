import type { ModuleContract } from '@/lib/file-folder-module-connections'

type Sql = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>

export async function ensureFileFolderModuleRuntimeSchema(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS client_file_folder_system_connections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,
      source_system_id uuid NOT NULL,
      target_system_id uuid NOT NULL,
      contract_key varchar(80) NOT NULL,
      status varchar(48) NOT NULL DEFAULT 'configured_pending_runtime_adapter',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE(client_id,file_number,source_system_id,target_system_id)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS client_file_folder_module_inbox (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,
      connection_id uuid NOT NULL,
      source_system_id uuid NOT NULL,
      target_system_id uuid NOT NULL,
      source_event_key varchar(180) NOT NULL,
      contract_key varchar(80) NOT NULL,
      event_type varchar(80) NOT NULL,
      title varchar(220) NOT NULL,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      status varchar(32) NOT NULL DEFAULT 'received',
      received_at timestamptz NOT NULL DEFAULT NOW(),
      processed_at timestamptz,
      UNIQUE(connection_id,source_event_key)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_file_folder_module_inbox_target ON client_file_folder_module_inbox(client_id,file_number,target_system_id,received_at DESC)`
}

export type FileFolderOrderEvent = {
  orderId: string
  clientId: string
  fileNumber: string
  itemId: string
  amount: string | number
  currency: string
  orderStatus: string
  paymentStatus: string
}

export async function dispatchFileFolderOrderEvent(sql: Sql, event: FileFolderOrderEvent) {
  await ensureFileFolderModuleRuntimeSchema(sql)
  const payload = {
    orderId: event.orderId,
    itemId: event.itemId,
    amount: String(event.amount),
    currency: event.currency,
    orderStatus: event.orderStatus,
    paymentStatus: event.paymentStatus,
  }
  // The public Customer Door order is a real source event. Only reviewed,
  // active systems owned by this Client and scoped to this File Folder receive it.
  const connections = await sql`
    SELECT c.id AS connection_id,c.contract_key,c.client_id,c.file_number,
      source.id AS source_system_id,source.system_type AS source_type,
      target.id AS target_system_id,target.system_type AS target_type
    FROM client_file_folder_system_connections c
    JOIN client_built_systems source ON source.id=c.source_system_id
      AND source.client_id=c.client_id AND source.file_number=c.file_number AND source.status='active'
    JOIN client_built_systems target ON target.id=c.target_system_id
      AND target.client_id=c.client_id AND target.file_number=c.file_number AND target.status='active'
    WHERE c.client_id=${event.clientId}::uuid
      AND c.file_number=${event.fileNumber}
      AND c.status='active'
      AND (
        (c.contract_key='order' AND source.system_type IN ('commerce_storefront','marketplace_network')
          AND target.system_type IN ('marketplace_network','payments_gateway','route_station','integration_network'))
        OR
        (c.contract_key='customer_request' AND source.system_type='customer_door'
          AND target.system_type IN ('operations_board','mobile_service_app'))
      )
  `
  let delivered = 0
  for (const connection of connections) {
    const contractKey = String(connection.contract_key)
    const eventType = contractKey === 'customer_request' ? 'customer_request' : 'order'
    const title = eventType === 'order' ? 'Customer order received' : 'Customer request received'
    const [inboxRecord] = await sql`
      INSERT INTO client_file_folder_module_inbox(
        client_id,file_number,connection_id,source_system_id,target_system_id,
        source_event_key,contract_key,event_type,title,payload,status
      ) VALUES(
        ${event.clientId}::uuid,${event.fileNumber},${connection.connection_id}::uuid,
        ${connection.source_system_id}::uuid,${connection.target_system_id}::uuid,
        ${'customer-store-order:'+event.orderId},${contractKey},${eventType},${title},
        ${JSON.stringify(payload)}::jsonb,'received'
      )
      ON CONFLICT(connection_id,source_event_key) DO NOTHING
      RETURNING id
    `
    if (inboxRecord) delivered += 1
  }
  return { matchedConnections: connections.length, delivered }
}

export type ModuleRuntimeReadiness = {
  connectionStatus: string
  adapterAvailable: boolean
  reason: string
}

export function getModuleRuntimeReadiness(contractKey: string, sourceType: string, targetType: string): ModuleRuntimeReadiness {
  const supported = contractKey === 'order'
    ? ['commerce_storefront','marketplace_network'].includes(sourceType)
      && ['marketplace_network','payments_gateway','route_station','integration_network'].includes(targetType)
    : contractKey === 'customer_request'
      ? sourceType === 'customer_door' && ['operations_board','mobile_service_app'].includes(targetType)
      : false
  return {
    connectionStatus: supported ? 'active' : 'configured_pending_runtime_adapter',
    adapterAvailable: supported,
    reason: supported
      ? 'Customer Door order events can be delivered to the destination system inbox.'
      : 'No verified event adapter exists for this module contract yet.',
  }
}
