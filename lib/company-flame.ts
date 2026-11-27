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
    personal: { name: 'Personal Flame', scope: 'private interaction, reflection and everyday assistance' },
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
export function isNativeFlameCommand(message: string): boolean {
  return nativeFolderQuery(message)!==null
}
export function nativeFlameReply(message: string, context: {
  systems?: readonly { title?: unknown; status?: unknown }[]
  builds?: readonly { title?: unknown; status?: unknown }[]
}): string | null {
  const command = nativeFolderQuery(message)
  if (!command) return null
  const systems = (context.systems || []).filter(s => s.status === 'active')
  const builds = context.builds || []
  const describe = (rows: readonly {title?: unknown; status?: unknown}[]) =>
    rows.slice(0, 15).map(r => String(r.title || 'Unnamed system') + ' — ' + String(r.status || 'recorded')).join('; ')
  if (command === 'show builds') return builds.length ? 'Recorded construction: ' + describe(builds) : 'No unfinished construction is recorded.'
  if (command === 'show systems') return systems.length ? 'Active systems: ' + describe(systems) : 'No active systems are recorded.'
  return 'WEAVE Flame — ' + systems.length + ' active system(s) in the recent record; ' + builds.length +
    ' recorded unfinished build(s) in the recent record. You own the File Folder and direct its formation; WEAVE owns Flame. ' +
    'Use show builds or show systems for details. This native check does not use an external model.'
}

function nativeFolderQuery(message:string):'status'|'show builds'|'show systems'|null{
 const q=message.trim().toLowerCase().replace(/[.!?]+$/,'').replace(/^(?:flame[, ]+)?(?:please +|could you +|can you +|would you +)*/,'')
 if(/^(?:status|(?:check|show|inspect|review|tell me about) (?:me )?(?:my |the )?(?:file folder|enterprise|business)(?: status| progress)?|how is my file folder doing)$/.test(q))return 'status'
 if(/^(?:show|list|check|inspect|review|tell me about) (?:me )?(?:my |the )?(?:unfinished |current |active )?(?:builds|construction)(?: status| progress)?$/.test(q)||/^how are my builds (?:doing|progressing)$/.test(q))return 'show builds'
 if(/^(?:show|list|check|inspect|review|tell me about) (?:me )?(?:my |the )?(?:live |active |installed )?systems$/.test(q)||/^what systems (?:do i have|are active)$/.test(q))return 'show systems'
 return null
}

/** Explicit non-financial operation, resolved against server-owned active rows.
 * Never interpret a question, earlier conversation or a model reply as consent.
 * A title must identify exactly one system in the authenticated File Folder. */
export function resolveNativeFolderConnection(message:string,systems:readonly {id?:unknown;title?:unknown;status?:unknown}[]):
 {sourceId:string;targetId:string;sourceTitle:string;targetTitle:string}|{error:string}|null{
 const q=message.trim().replace(/[.!]+$/,'')
 const match=q.match(/^(?:flame[, ]+)?(?:please\s+|could you\s+|can you\s+|i want you to\s+)*(?:connect|link)\s+(.{1,220}?)\s+to\s+(.{1,220}?)$/i)
 if(!match||q.includes('?'))return null
 const title=(v:unknown)=>String(v||'').trim().replace(/^["“]|["”]$/g,'').toLowerCase()
 const active=systems.filter(s=>s.status==='active')
 const from=active.filter(s=>title(s.title)===title(match[1]))
 const to=active.filter(s=>title(s.title)===title(match[2]))
 if(from.length!==1||to.length!==1)return {error:'I need two uniquely named active systems in your File Folder. Say show systems to check their exact names, then specify connect Source to Target.'}
 const sourceId=String(from[0].id||''),targetId=String(to[0].id||'')
 if(!sourceId||!targetId||sourceId===targetId)return {error:'Choose two different active systems.'}
 return {sourceId,targetId,sourceTitle:String(from[0].title),targetTitle:String(to[0].title)}
}
