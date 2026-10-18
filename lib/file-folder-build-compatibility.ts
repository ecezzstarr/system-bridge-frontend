/**
 * Shared installation rules. A part offered to a Client for an active system
 * must pass the same rule that the authenticated build API enforces.
 */
export const FILE_FOLDER_PART_COMPATIBILITY: Record<string, readonly string[]> = {
  route_capacity:['route_station','integration_network','distribution_network','enterprise_operating_system'],
  legion_capacity:['legion_quarters','enterprise_hall','enterprise_operating_system'],
  stream_capacity:['broadcast_studio','streaming_gate','media_network'],
  audience_capacity:['streaming_gate','media_network'],
  ai_node:['ai_service_desk','intelligence_lab','operations_command','media_network','enterprise_operating_system'],
  automation:['service_workflow','operations_suite','operations_command','distribution_network','enterprise_operating_system'],
  verification:['payments_gateway','crypto_exchange_workshop','operations_command','enterprise_treasury','enterprise_operating_system'],
}

export function allowedBuildPartSystems(effectType: string): readonly string[] | undefined {
  return FILE_FOLDER_PART_COMPATIBILITY[effectType]
}

export function isBuildPartCompatible(effectType: string, systemType: string): boolean {
  const allowed=allowedBuildPartSystems(effectType)
  return !allowed || allowed.includes(systemType)
}
