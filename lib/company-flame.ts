/** Company-owned native intelligence. No provider or model is required for these functions. */
export const FLAME_INSTITUTION = {
  owner: 'WEAVE',
  identity: 'Flame',
  fileFolderOwner: 'client',
  fileFolderOperator: 'WEAVE Flame',
  types: {
    eight: { name: 'Eight', scope: 'administrations' },
    river: { name: 'River', scope: 'interaction' },
    echo: { name: 'Echo', scope: 'observation and coordination' },
    file_folder: { name: 'File Folder Flame', scope: 'client-authorized technical operations' },
  },
} as const

export const FILE_FOLDER_FLAME_ACTIONS = [
  'connect_modules', 'create_platform_project', 'set_business_formation',
  'purchase_item', 'start_build', 'apply_build_item', 'library_start',
  'library_complete', 'add_system_entry', 'toggle_system_entry',
] as const
export type FileFolderFlameAction = typeof FILE_FOLDER_FLAME_ACTIONS[number]

/** Dispatch only established native functions. The authenticated route retains all
 * ownership, funding, catalog and other action-specific checks. Never accept a
 * claimed operator, owner, role or authorization from the browser. */
export function resolveFileFolderFlameAction(value: unknown): FileFolderFlameAction | null {
  return typeof value === 'string' && FILE_FOLDER_FLAME_ACTIONS.includes(value as FileFolderFlameAction)
    ? value as FileFolderFlameAction : null
}
export function fileFolderFlameExecution(action: FileFolderFlameAction) {
  return { owner: FLAME_INSTITUTION.owner, operator: FLAME_INSTITUTION.fileFolderOperator,
    type: 'file_folder', execution: 'native', authorization: 'authenticated_owner_request', action } as const
}

/** Exact read-only commands; arbitrary prose never becomes an executable instruction. */
export function nativeFlameReply(message: string, context: {
  systems?: readonly { title?: unknown; status?: unknown }[]
  builds?: readonly { title?: unknown; status?: unknown }[]
}): string | null {
  const command = message.trim().toLowerCase().replace(/[.!?]+$/, '')
  if (!['status', 'show builds', 'show systems'].includes(command)) return null
  const systems = (context.systems || []).filter(s => s.status === 'active')
  const builds = context.builds || []
  const describe = (rows: readonly {title?: unknown; status?: unknown}[]) =>
    rows.slice(0, 15).map(r => String(r.title || 'Unnamed system') + ' — ' + String(r.status || 'recorded')).join('; ')
  if (command === 'show builds') return builds.length ? 'Recorded construction: ' + describe(builds) : 'No unfinished construction is recorded.'
  if (command === 'show systems') return systems.length ? 'Active systems: ' + describe(systems) : 'No active systems are recorded.'
  return 'WEAVE Flame — ' + systems.length + ' active system(s); ' + builds.length +
    ' recorded unfinished build(s). You own the File Folder and direct its formation; WEAVE owns Flame. ' +
    'Use show builds or show systems for details. This native check does not use an external model.'
}
