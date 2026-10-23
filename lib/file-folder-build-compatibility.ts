/**
 * Shared installation rules. A part offered to a Client for an active system
 * must pass the same rule that the authenticated build API enforces.
 */
export const FILE_FOLDER_PART_COMPATIBILITY: Record<string, readonly string[]> = {
  route_capacity:['route_station','integration_network','distribution_network','enterprise_operating_system'],
  legion_capacity:['legion_quarters','enterprise_hall','enterprise_operating_system'],
  stream_capacity:['animation_studio','broadcast_studio','streaming_gate','media_network'],
  audience_capacity:['streaming_gate','media_network'],
  ai_node:['ai_service_desk','intelligence_lab','operations_command','media_network','enterprise_operating_system'],
  automation:['service_workflow','operations_suite','operations_command','distribution_network','enterprise_operating_system'],
  verification:['payments_gateway','crypto_exchange_workshop','operations_command','enterprise_treasury','enterprise_operating_system'],
  clinical_safety_review:['clinic_operations','hospital_operations_hub','public_health_coordination','medicine_supply_planning'],
  civic_oversight:['public_services_portal','municipal_operations','national_systems_architecture','public_audit_office','emergency_preparedness_centre','civic_identity_architecture'],
  supply_planning:['medicine_supply_planning','hospital_operations_hub','municipal_market_hall','agriculture_supply_network','transport_coordination','commerce_storefront','marketplace_network'],
  mapping:['public_services_portal','municipal_operations','national_systems_architecture','agriculture_supply_network','transport_coordination','utility_service_operations','emergency_preparedness_centre'],
  // General-purpose architecture parts intentionally work in any sector.
  // No visual module is itself a certified clinical, governmental or security service.

}

export function allowedBuildPartSystems(effectType: string): readonly string[] | undefined {
  return FILE_FOLDER_PART_COMPATIBILITY[effectType]
}

export function isBuildPartCompatible(effectType: string, systemType: string): boolean {
  const allowed=allowedBuildPartSystems(effectType)
  return !allowed || allowed.includes(systemType)
}
