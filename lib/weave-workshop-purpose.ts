export const WEAVE_INDUSTRY_PURPOSE =
  'Weave helps people turn what they know, make or imagine into systems they own and operate. Through those systems people can work together, serve customers and build a livelihood.'

export const WEAVE_WORK_AREAS = {
  file_folder: {
    label: 'Client business and File Folder',
    review: 'Verify that the Client can build or operate the intended system with the correct tier, ownership and worker permissions.',
  },
  customer_door: {
    label: 'Customer Door and fulfilment',
    review: 'Follow a commissioned offer through customer access, order and fulfilment. Verify that private work stays behind the Customer Door.',
  },
  departments: {
    label: 'Department work and participation',
    review: 'Test the affected role in its own workspace. Check that Bridger outreach, Agent operations or Client assignments reach the right people and records.',
  },
  continuity: {
    label: 'Company records and continuity',
    review: 'Check that release, payment and work records remain accurate across retries and recovery. Verify that Administrations can trace the result.',
  },
} as const

type WorkArea = keyof typeof WEAVE_WORK_AREAS

export function isWeaveWorkArea(value: unknown): value is WorkArea {
  return typeof value === 'string' && Object.hasOwn(WEAVE_WORK_AREAS, value)
}

export function weaveWorkAreaFromReview(body: unknown) {
  if (typeof body !== 'string') return null
  const area = body.match(/^<!-- weave-work-area: ([a-z_]+) -->(?:\r?\n|$)/)?.[1]
  return isWeaveWorkArea(area) ? WEAVE_WORK_AREAS[area] : null
}

export function fileFolderWorkshopNextStep(state: {
  hasPurpose: boolean
  building: boolean
  hasOperatingSystem: boolean
  hasCustomerDoor: boolean
  customerDoorOpen: boolean
  customerDoorNeedsAttention: boolean
  canOpenCustomerDoor: boolean
}) {
  if (state.building) return {
    destination: 'formation_yard',
    label: 'Continue construction',
    detail: 'Follow the live build and install the parts it needs to do the work you planned.',
  } as const

  if (!state.hasOperatingSystem && !state.hasCustomerDoor) {
    if (!state.hasPurpose) return {
      destination: 'business_formation',
      label: 'Define your business',
      detail: 'Start with what you can offer, who it serves, and how the work will reach them.',
    } as const
    if (!state.customerDoorNeedsAttention || !state.canOpenCustomerDoor) {
      return {
        destination: 'blueprint_foundry',
        label: 'Choose a blueprint',
        detail: 'Choose the first system your business needs and check its materials and build price before starting.',
      } as const
    }
  }

  if (state.canOpenCustomerDoor) return {
    destination: 'customer_door',
    label: state.customerDoorOpen ? 'Manage offers and orders' : 'Review Customer Door readiness',
    detail: state.customerDoorOpen
      ? 'Serve customers through published offers. Keep verified payment, fulfilment and owner earnings in their proper records.'
      : 'Check what remains to commission the entrance and publish a real product or service. You decide what customers can see.',
  } as const

  return {
    destination: 'active_systems',
    label: 'Go to Systems in Motion',
    detail: 'Run the systems you have formed and record the work they actually produce.',
  } as const
}
