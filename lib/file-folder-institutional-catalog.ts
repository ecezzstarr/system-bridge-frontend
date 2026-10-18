/**
 * Public-service and institutional FILE FOLDER *construction scaffolds*.
 * These are paid, Client-owned blueprints and compatible visual/record modules.
 * Building one DOES NOT provision a certified hospital, national IT platform,
 * identity registry, emergency dispatch service, or financial infrastructure.
 * Real regulated operations require independent design, access governance,
 * safety review, external integration and production testing.
 */
export type InstitutionalBlueprint = readonly [
  key:string,name:string,district:string,systemType:string,
  description:string,buildHours:number,requiredKit:string,requiredQuantity:number
]
export type InstitutionalKit = readonly [key:string,name:string,category:string,description:string,price:number]
export type InstitutionalPart = readonly [
  key:string,name:string,category:string,description:string,
  price:number,effect:string,effectValue:number
]

export const INSTITUTIONAL_KITS: readonly InstitutionalKit[]=[
  ['clinic_foundation_kit','Clinic Planning Kit','health','Service areas, queues, non-clinical workflow records and administrative planning.',180],
  ['hospital_campus_kit','Hospital Operations Planning Kit','health','Constructs administrative departments and workflow architecture; no patient-care authorization.',880],
  ['health_coordination_kit','Public Health Coordination Kit','health','Program oversight, service demand summaries and controlled reporting plans.',680],
  ['medical_supply_kit','Medical Supply Planning Kit','health','Inventory and replenishment workspaces for non-dispensing supply coordination.',260],
  ['public_service_kit','Public Service Portal Kit','public_service','Resident request intake, workflow records and public-service structure.',360],
  ['civic_administration_kit','Civic Administration Kit','public_service','Offices, review desks, authorizations and work tracking for public bodies.',620],
  ['national_coordination_kit','National Systems Planning Kit','public_service','High-level agency integration and records architecture; not a sovereign operating authority.',2400],
  ['accountability_kit','Public Accountability Kit','public_service','Public reporting, review queues and audit preparation.',470],
  ['market_hall_kit','Market Operations Kit','commerce','Market management, stall assignment plans, inspection checklists and seller coordination.',330],
  ['farm_network_kit','Agricultural Network Kit','agriculture','Field records, distribution planning and agricultural operations coordination.',390],
  ['transport_network_kit','Transport Coordination Kit','transport','Route scheduling, fleet work queues and transport administration.',550],
  ['education_campus_kit','Education Institution Kit','education','Learning institution timetables, enrollment planning and staff operations.',410],
  ['utility_operations_kit','Public Utilities Planning Kit','utility','Utilities asset maintenance queues, inspection and outage-response planning.',620],
  ['emergency_preparedness_kit','Emergency Preparedness Kit','public_service','Emergency readiness plans, drill records and contacts, not a certified dispatch system.',760],
  ['civic_identity_kit','Identity Systems Planning Kit','public_service','Identity and permissions architecture without issuance or processing of official credentials.',600],
]

export const INSTITUTIONAL_BLUEPRINTS: readonly InstitutionalBlueprint[]=[
  ['clinic_operations','Clinic Operations Workspace','health_district','clinic_operations','Administrative clinic planning for appointments, rooms, referrals and service requests. No diagnosis, prescribing, treatment or medical record processing is provided.',72,'clinic_foundation_kit',1],
  ['hospital_operations_hub','Hospital Operations Hub','health_district','hospital_operations_hub','Build an administrative hospital campus and non-clinical work queues. Not an electronic health record, medical device or live clinical system.',240,'hospital_campus_kit',1],
  ['public_health_coordination','Public Health Coordination','health_district','public_health_coordination','Plan public health programs and record management actions. No epidemiological decision engine or certified health integration.',168,'health_coordination_kit',1],
  ['medicine_supply_planning','Medical Supply Planning','health_district','medicine_supply_planning','Inventory plans and supply-chain workflow for healthcare operations; not prescribing, dispensing or drug authentication.',96,'medical_supply_kit',1],
  ['public_services_portal','Public Services Portal','civic_district','public_services_portal','Client-owned public request and service tracking architecture with a Customer Door; not an official government site until separately authorized.',120,'public_service_kit',1],
  ['municipal_operations','Municipal Operations Workspace','civic_district','municipal_operations','Administrative departments, local service case queues, records and responsible work assignment.',168,'civic_administration_kit',1],
  ['national_systems_architecture','National Systems Architecture','civic_district','national_systems_architecture','A composed architecture for agencies and departments. Blueprint completion never grants public authority or launches a country-scale service.',336,'national_coordination_kit',1],
  ['public_audit_office','Public Audit and Accountability','civic_district','public_audit_office','Accountability reviews, public reporting drafts and approval trails. Not a legally certified audit system.',144,'accountability_kit',1],
  ['municipal_market_hall','Municipal Market Hall','market_district','municipal_market_hall','Plan vendor spaces, market administration, inventory movement, work requests and commercial operations.',144,'market_hall_kit',1],
  ['agriculture_supply_network','Agriculture Supply Network','agriculture_district','agriculture_supply_network','A multi-farm coordination, harvest tracking and distribution planning system.',168,'farm_network_kit',1],
  ['transport_coordination','Transport Coordination Centre','transport_district','transport_coordination','Fleet records, scheduled routes, logistics work and transport service planning.',192,'transport_network_kit',1],
  ['education_campus_system','Education Campus System','education_district','education_campus_system','School or training institution administration, enrollment planning and timetable records; not student records compliance by default.',168,'education_campus_kit',1],
  ['utility_service_operations','Utilities Service Operations','utility_district','utility_service_operations','Asset inspection queues, maintenance plans and outage response coordination; not direct control of critical infrastructure.',240,'utility_operations_kit',1],
  ['emergency_preparedness_centre','Emergency Preparedness Centre','civic_district','emergency_preparedness_centre','Training exercises, readiness checklists and response coordination plans; not an emergency call-taking or dispatch system.',168,'emergency_preparedness_kit',1],
  ['civic_identity_architecture','Identity and Access Architecture','civic_district','civic_identity_architecture','Design scoped identities, permissions and consent flows; no issuance, verification or storage of government identity credentials.',192,'civic_identity_kit',1],
]

export const INSTITUTIONAL_PARTS: readonly InstitutionalPart[]=[
  ['institution_identity_module','Institution Identity Module','institution_part','Adds a visual institution-identity facade and documented operator identity; not government accreditation.',25,'institution_identity',1],
  ['department_workspace_module','Department Workspace Module','institution_part','Adds a represented department or administrative workspace to a compatible build.',35,'department',1],
  ['scheduling_module','Scheduling Module','institution_part','Plans schedules and appointment records; no clinical booking or public availability guarantees.',45,'scheduling',1],
  ['service_queue_module','Service Queue Module','institution_part','Plans service intake and staff work queues; not live emergency triage.',40,'service_queue',1],
  ['permission_model_module','Permission Model Module','institution_part','Documents proposed access boundaries; deployment requires independently enforced permissions.',70,'access_governance',1],
  ['consent_privacy_module','Consent and Privacy Module','institution_part','Represents planned consent, retention and privacy controls; not automatically compliant.',65,'privacy_review',1],
  ['audit_evidence_module','Audit Evidence Module','institution_part','Adds an audit trail design and evidence review workspace.',75,'audit_design',1],
  ['public_reporting_module','Public Reporting Module','institution_part','Adds a public reporting design and publishing approval workflow.',45,'reporting',1],
  ['inventory_supply_module','Inventory and Supply Module','institution_part','Adds stock and procurement workflow planning; not a verified pharmaceutical inventory system.',60,'supply_planning',1],
  ['mapping_route_module','Mapping and Route Module','institution_part','Plans locations and routes; no live emergency dispatch or traffic guidance.',65,'mapping',1],
  ['interop_contract_module','Interoperability Contract Module','institution_part','Documents API contracts and data exchange requirements; connections still need implementation.',90,'interop_design',1],
  ['security_review_module','Security Review Module','institution_part','Records security requirements and review tasks; not a security certification.',95,'security_review',1],
  ['human_approval_module','Human Approval Module','institution_part','Plans accountable manual authorization and escalation checkpoints.',35,'human_approval',1],
  ['clinical_safety_review_module','Clinical Safety Review Module','health_part','Tracks the need for clinical review, safety validation and qualified human oversight. Does not enable patient care.',100,'clinical_safety_review',1],
  ['civic_oversight_module','Civic Oversight Module','civic_part','Tracks review, transparency and administrative authority requirements; does not confer official authority.',85,'civic_oversight',1],
  ['accessibility_planning_module','Accessibility Planning Module','institution_part','Plans usable physical and digital access for different participants.',35,'accessibility_plan',1],
]
