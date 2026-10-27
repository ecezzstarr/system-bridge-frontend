/**
 * File Folder Source Engine — first structured composition layer.
 *
 * Turns a Client's business source into an inspectable system plan inside the
 * existing File Folder. This is a plan, not generated executable code. Runtime
 * execution requires separately implemented, permission-checked capabilities.
 */
import { FILE_FOLDER_PLATFORM_TEMPLATES, type FileFolderPlatformKind } from '@/lib/file-folder-platform-projects'

export const SOURCE_SYSTEM_KINDS = [
  'commerce',
  'operations',
  'community',
  'creative',
  'education',
  'logistics',
  'custom',
] as const

export type SourceSystemKind = typeof SOURCE_SYSTEM_KINDS[number]

const PLATFORM_KIND_BY_SOURCE: Record<SourceSystemKind, FileFolderPlatformKind> = {
  commerce: 'commerce_platform',
  operations: 'custom_platform',
  community: 'social_community',
  creative: 'video_channel',
  education: 'education_network',
  logistics: 'transportation_network',
  custom: 'custom_platform',
}

export type SourceBlueprintStage = {
  blueprintKey: string
  order: number
  purpose: string
  status: 'not_started'
}

export type SourceEnginePlan = {
  engine: 'weave-file-folder-source-engine'
  version: 1
  name: string
  sourceDescription: string
  systemKind: SourceSystemKind
  functions: string[]
  participantRoles: string[]
  connections: string[]
  platformKind: FileFolderPlatformKind
  blueprintStages: SourceBlueprintStage[]
  productionGap: string
  buildSequence: string[]
  acceptanceChecks: string[]
  state: 'conceptual'
  executionBoundary: string
}

const KIND_BLUEPRINTS: Record<SourceSystemKind, {
  functions: string[]
  participantRoles: string[]
  connections: string[]
}> = {
  commerce: {
    functions: ['Offer and catalog', 'Pricing and availability', 'Order lifecycle', 'Customer access'],
    participantRoles: ['Owner', 'Customer', 'Supplier', 'Fulfilment partner'],
    connections: ['Catalog → Customer Door', 'Order → Owner operations', 'Fulfilment → Customer'],
  },
  operations: {
    functions: ['Work intake', 'Task assignment', 'Status tracking', 'Completion record'],
    participantRoles: ['Owner', 'Coordinator', 'Operator', 'Reviewer'],
    connections: ['Request → Work queue', 'Assignment → Operator', 'Completion → Record'],
  },
  community: {
    functions: ['Membership and access', 'Needs and offers', 'Participation records', 'Resource coordination'],
    participantRoles: ['Community steward', 'Member', 'Contributor', 'Service partner'],
    connections: ['Member need → Available contribution', 'Authorization → Participation', 'Outcome → Community record'],
  },
  creative: {
    functions: ['Brief and concept', 'Production workflow', 'Review and approval', 'Release and distribution'],
    participantRoles: ['Owner', 'Creator', 'Collaborator', 'Reviewer'],
    connections: ['Brief → Production', 'Production → Review', 'Approval → Release'],
  },
  education: {
    functions: ['Learning resources', 'Enrollment and access', 'Learning activities', 'Progress evidence'],
    participantRoles: ['Learning steward', 'Educator', 'Learner', 'Reviewer'],
    connections: ['Resource → Learner', 'Activity → Evidence', 'Review → Next learning step'],
  },
  logistics: {
    functions: ['Request and parcel record', 'Route and assignment', 'Handover evidence', 'Delivery status'],
    participantRoles: ['Owner', 'Dispatcher', 'Carrier', 'Recipient'],
    connections: ['Request → Dispatch', 'Dispatch → Carrier', 'Handover → Delivery record'],
  },
  custom: {
    functions: ['Source definition', 'Inputs and outputs', 'Rules and permissions', 'Outcome recording'],
    participantRoles: ['Owner', 'Authorized participant', 'Service system', 'Reviewer'],
    connections: ['Input → Defined process', 'Process → Authorized output', 'Outcome → Evidence record'],
  },
}

export function createSourceEnginePlan(input: {
  name: string
  sourceDescription: string
  systemKind: unknown
}): SourceEnginePlan {
  const name = input.name.trim().slice(0, 100)
  const sourceDescription = input.sourceDescription.trim()
  if (!name || sourceDescription.length < 15 || sourceDescription.length > 6000) {
    throw new Error('A name and meaningful source description are required.')
  }
  const systemKind = typeof input.systemKind === 'string' &&
    SOURCE_SYSTEM_KINDS.includes(input.systemKind as SourceSystemKind)
    ? input.systemKind as SourceSystemKind
    : 'custom'
  const blueprint = KIND_BLUEPRINTS[systemKind]
  const platformKind = PLATFORM_KIND_BY_SOURCE[systemKind]
  const platformTemplate = FILE_FOLDER_PLATFORM_TEMPLATES[platformKind]
  return {
    engine: 'weave-file-folder-source-engine',
    version: 1,
    name,
    sourceDescription,
    systemKind,
    functions: [...blueprint.functions],
    participantRoles: [...blueprint.participantRoles],
    connections: [...blueprint.connections],
    platformKind,
    blueprintStages: platformTemplate.stages.map((blueprintKey, index) => ({
      blueprintKey,
      order: index + 1,
      purpose: `Build and verify ${blueprintKey.replaceAll('_', ' ')} inside this Client File Folder`,
      status: 'not_started' as const,
    })),
    productionGap: platformTemplate.productionGap,
    buildSequence: [
      'Recognize the Client source and its existing File Folder context',
      'Review and refine the proposed functions, roles, connections and rules',
      'Map each function to an existing workshop or an explicitly scoped new build',
      'Implement and test each capability with Client-scoped permissions',
      'Activate only after authorized review and operational evidence',
    ],
    acceptanceChecks: [
      'Client ownership, File Folder scope and participant permissions are enforced on every operation',
      'Each participant can access only the functions allowed by their role',
      'Connections have validated inputs, outputs and failure behavior',
      'Writes are persisted and can be inspected or audited',
      'No capability is labeled operational before implementation and tests pass',
    ],
    state: 'conceptual',
    executionBoundary: 'This plan does not execute generated code, publish a web system, or claim a working capability. Build and activation must use the existing File Folder construction, authorization, testing and release paths.',
  }
}
