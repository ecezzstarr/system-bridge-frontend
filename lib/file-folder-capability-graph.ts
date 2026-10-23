export type Capability = 'work_queue' | 'record_search' | 'customer_door' | 'system_routes'
export type BuiltRuntimeSystem = { id: string; system_type: string; status?: string; entries?: any[] }

// Pure projection of the existing authenticated snapshot; never grants server authority.
export const SYSTEM_CAPABILITIES: Record<string, readonly Capability[]> = {
  operations_board: ['work_queue'], service_workflow: ['work_queue'], operations_suite: ['work_queue'],
  operations_command: ['work_queue'], enterprise_operating_system: ['work_queue','system_routes'],
  research_room: ['record_search'], data_room: ['record_search'], intelligence_lab: ['record_search'],
  ai_service_desk: ['work_queue','record_search'], learning_lab: ['work_queue','record_search'],
  customer_door: ['customer_door'], commerce_storefront: ['customer_door'], marketplace_network: ['customer_door'],
  enterprise_door: ['customer_door'], integration_network: ['system_routes'], route_station: ['system_routes'],
  distribution_network: ['system_routes'], media_network: ['system_routes','work_queue'],
  creator_booth: ['work_queue'], broadcast_studio: ['work_queue'], animation_studio: ['work_queue'], music_studio: ['work_queue'], streaming_gate: ['work_queue'],
  campaign_system: ['work_queue'], mobile_service_app: ['work_queue'], enterprise_shell: ['work_queue'],
  enterprise_hall: ['work_queue'], legion_quarters: ['work_queue'], enterprise_treasury: ['record_search'],
  payments_gateway: ['record_search'], crypto_exchange_workshop: ['record_search'],
  // Institutional capabilities are record/queue projections only. They do not
  // enable medical treatment, official government authority or live dispatch.
  clinic_operations: ['work_queue','record_search'],
  hospital_operations_hub: ['work_queue','record_search'],
  public_health_coordination: ['work_queue','record_search'],
  medicine_supply_planning: ['work_queue','record_search'],
  public_services_portal: ['work_queue','record_search'],
  municipal_operations: ['work_queue','record_search'],
  national_systems_architecture: ['work_queue','record_search'],
  public_audit_office: ['work_queue','record_search'],
  municipal_market_hall: ['work_queue','record_search'],
  agriculture_supply_network: ['work_queue','record_search'],
  transport_coordination: ['work_queue','record_search'],
  education_campus_system: ['work_queue','record_search'],
  utility_service_operations: ['work_queue','record_search'],
  emergency_preparedness_centre: ['work_queue','record_search'],
  civic_identity_architecture: ['work_queue','record_search'],
}

export function capabilityGraph(systems: BuiltRuntimeSystem[], routes: any[] = []) {
  const nodes = systems.filter(s => s.status === 'active').map(s => ({
    systemId: s.id, capabilities: Object.hasOwn(SYSTEM_CAPABILITIES,s.system_type) ? SYSTEM_CAPABILITIES[s.system_type] : [],
  }))
  const ids = new Set(nodes.map(n => n.systemId))
  return { nodes, edges: routes.filter(r => ids.has(r.source_system_id) && ids.has(r.target_system_id) && r.authority_state === 'client_authorized') }
}

export function searchRuntimeEntries(entries: any[], query: string) {
  const needle = query.trim().toLocaleLowerCase()
  return entries.filter(e => `${e.title || ''} ${e.body || ''}`.toLocaleLowerCase().includes(needle))
}

export function workQueue(entries: any[]) {
  return { open: entries.filter(e => e.status !== 'done'), done: entries.filter(e => e.status === 'done') }
}
