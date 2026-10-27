/**
 * Typed contracts for connecting existing File Folder systems.
 * A configured edge records an authorized, compatible route; it does not
 * claim that data is flowing until a real adapter is implemented and verified.
 */
export type ModuleContract = {
  inputs: readonly string[]
  outputs: readonly string[]
  requiredPermission: 'client_owner'
}

export const FILE_FOLDER_MODULE_CONTRACTS: Readonly<Record<string, ModuleContract>> = {
  customer_door: { inputs: ['public_catalog', 'public_service'], outputs: ['customer_request'], requiredPermission: 'client_owner' },
  commerce_storefront: { inputs: ['customer_request'], outputs: ['catalog', 'order'], requiredPermission: 'client_owner' },
  marketplace_network: { inputs: ['catalog', 'order'], outputs: ['seller_order'], requiredPermission: 'client_owner' },
  payments_gateway: { inputs: ['order'], outputs: ['payment_instruction'], requiredPermission: 'client_owner' },
  route_station: { inputs: ['order', 'seller_order', 'dispatch_request'], outputs: ['dispatch_request', 'delivery_status'], requiredPermission: 'client_owner' },
  operations_board: { inputs: ['customer_request', 'work_request'], outputs: ['work_request', 'completion_record'], requiredPermission: 'client_owner' },
  mobile_service_app: { inputs: ['public_service', 'delivery_status'], outputs: ['customer_request', 'work_request'], requiredPermission: 'client_owner' },
  education_campus_system: { inputs: ['public_service'], outputs: ['learning_activity'], requiredPermission: 'client_owner' },
  learning_lab: { inputs: ['learning_activity'], outputs: ['learning_evidence'], requiredPermission: 'client_owner' },
  transport_coordination: { inputs: ['dispatch_request'], outputs: ['dispatch_request', 'delivery_status'], requiredPermission: 'client_owner' },
  creator_booth: { inputs: ['work_request'], outputs: ['media_asset'], requiredPermission: 'client_owner' },
  broadcast_studio: { inputs: ['media_asset'], outputs: ['published_media'], requiredPermission: 'client_owner' },
  streaming_gate: { inputs: ['published_media'], outputs: ['audience_event'], requiredPermission: 'client_owner' },
  media_network: { inputs: ['published_media', 'audience_event'], outputs: ['audience_event'], requiredPermission: 'client_owner' },
  data_room: { inputs: ['completion_record', 'learning_evidence', 'delivery_status', 'audience_event'], outputs: ['evidence_record'], requiredPermission: 'client_owner' },
  operations_suite: { inputs: ['work_request', 'completion_record'], outputs: ['completion_record'], requiredPermission: 'client_owner' },
  integration_network: { inputs: ['evidence_record', 'delivery_status', 'order'], outputs: ['evidence_record'], requiredPermission: 'client_owner' },
}

export type ModuleConnectionValidation =
  | { ok: true; contract: string; state: 'configured_pending_runtime_adapter' }
  | { ok: false; reason: string }

export function validateFileFolderModuleConnection(input: {
  sourceType: string
  targetType: string
  actorIsClientOwner: boolean
  sourceIsActive: boolean
  targetIsActive: boolean
}): ModuleConnectionValidation {
  if (!input.actorIsClientOwner) return { ok: false, reason: 'Only the owning Client can configure File Folder system connections.' }
  if (!input.sourceIsActive || !input.targetIsActive) return { ok: false, reason: 'Both systems must be active in the same Client File Folder before connecting them.' }
  const source = FILE_FOLDER_MODULE_CONTRACTS[input.sourceType]
  const target = FILE_FOLDER_MODULE_CONTRACTS[input.targetType]
  if (!source || !target) return { ok: false, reason: 'One or both systems do not have a registered, reviewed module contract.' }
  const shared = source.outputs.filter(output => target.inputs.includes(output))
  if (!shared.length) return { ok: false, reason: 'The source output does not match any input accepted by the destination system.' }
  return { ok: true, contract: shared[0], state: 'configured_pending_runtime_adapter' }
}
