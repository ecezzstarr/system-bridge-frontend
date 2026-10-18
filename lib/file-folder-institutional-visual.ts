export type InstitutionalArchetype='health'|'civic'|'market'|'agriculture'|'transport'|'education'|'utility'|'emergency'|'identity'

const INSTITUTIONAL_SYSTEM_ARCHETYPES:Record<string,InstitutionalArchetype>={
  clinic_operations:'health',
  hospital_operations_hub:'health',
  public_health_coordination:'health',
  medicine_supply_planning:'health',
  public_services_portal:'civic',
  municipal_operations:'civic',
  national_systems_architecture:'civic',
  public_audit_office:'civic',
  municipal_market_hall:'market',
  agriculture_supply_network:'agriculture',
  transport_coordination:'transport',
  education_campus_system:'education',
  utility_service_operations:'utility',
  emergency_preparedness_centre:'emergency',
  civic_identity_architecture:'identity',
}
export function institutionalArchetype(systemType:string):InstitutionalArchetype|null{
  return Object.hasOwn(INSTITUTIONAL_SYSTEM_ARCHETYPES,systemType)?INSTITUTIONAL_SYSTEM_ARCHETYPES[systemType]:null
}
export const INSTITUTIONAL_VISUAL_THEME:Record<InstitutionalArchetype,{base:string;glow:string;label:string}>={
  health:{base:'#2a555f',glow:'#68dfea',label:'HEALTH'},
  civic:{base:'#46546d',glow:'#c7d5fb',label:'CIVIC'},
  market:{base:'#62513a',glow:'#ffc67e',label:'MARKET'},
  agriculture:{base:'#3c6149',glow:'#91eca2',label:'AGRICULTURE'},
  transport:{base:'#3b566e',glow:'#70d7ff',label:'TRANSPORT'},
  education:{base:'#4c4a70',glow:'#d9c4fc',label:'EDUCATION'},
  utility:{base:'#355660',glow:'#80d5d7',label:'UTILITY'},
  emergency:{base:'#704b37',glow:'#ffb47e',label:'PREPAREDNESS'},
  identity:{base:'#4a526b',glow:'#abc7ff',label:'IDENTITY DESIGN'},
}
