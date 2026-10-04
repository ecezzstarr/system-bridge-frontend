export type EnvironmentSurfaceKind = 'district' | 'station'
export type EnvironmentSurfaceScope = 'shared' | 'admin' | 'agent' | 'bridger' | 'client' | 'agent-bridger'

export type EnvironmentSurfaceDefinition = {
  key: string
  label: string
  kind: EnvironmentSurfaceKind
  route: string
  area: string
  scope: EnvironmentSurfaceScope
  protected?: boolean
  defaultOrder: number
}

export const WEAVE_ENVIRONMENT_REGISTRY: EnvironmentSurfaceDefinition[] = [
  { key:'shared-company-loops', label:'Company Loops', kind:'district', route:'/company/loops', area:'Shared WEAVE', scope:'shared', defaultOrder:10 },
  { key:'shared-human-cadences', label:'Human Cadences', kind:'district', route:'/search', area:'Shared WEAVE', scope:'shared', defaultOrder:20 },
  { key:'shared-presences', label:'Presences', kind:'district', route:'/profiles', area:'Shared WEAVE', scope:'shared', defaultOrder:30 },
  { key:'shared-company-guidance', label:'Company Guidance', kind:'district', route:'/company-chat', area:'Agent + Bridger', scope:'agent-bridger', defaultOrder:50 },
  { key:'shared-direct-communication', label:'Direct Communication', kind:'district', route:'/communications', area:'Shared WEAVE', scope:'shared', protected:true, defaultOrder:55 },
  { key:'shared-flame-event', label:'Flame Event · Loop 1', kind:'district', route:'/event', area:'Shared WEAVE', scope:'shared', protected:true, defaultOrder:57 },
  { key:'shared-settings', label:'Settings', kind:'district', route:'/settings', area:'Shared WEAVE', scope:'shared', protected:true, defaultOrder:58 },
  { key:'shared-marketplace', label:'Enterprise Systems', kind:'district', route:'/marketplace', area:'Shared WEAVE', scope:'shared', defaultOrder:70 },
  { key:'shared-video-ad-studio', label:'Video Ad Studio', kind:'district', route:'/video-ad-studio', area:'Shared WEAVE', scope:'shared', protected:true, defaultOrder:75 },
  { key:'shared-echo', label:'Echo', kind:'district', route:'/echo', area:'Shared WEAVE', scope:'shared', defaultOrder:80 },
  { key:'shared-arena', label:'Arena', kind:'district', route:'/arena', area:'Shared WEAVE', scope:'shared', defaultOrder:90 },
  { key:'shared-casino', label:'Casino', kind:'district', route:'/casino', area:'Shared WEAVE', scope:'shared', defaultOrder:100 },
  { key:'shared-standing', label:'Standing', kind:'district', route:'/weave/standing', area:'Shared WEAVE', scope:'shared', defaultOrder:120 },

  { key:'bridger-presence', label:'Bridger Presence', kind:'district', route:'/bridger/presence', area:'Bridger', scope:'bridger', protected:true, defaultOrder:5 },
  { key:'bridger-bridge-ai', label:'Bridge AI', kind:'district', route:'/bridger/bridge-ai', area:'Bridger', scope:'bridger', defaultOrder:20 },
  { key:'bridger-prospect-market', label:'Prospect Market', kind:'district', route:'/weave/market/prospects', area:'Bridger', scope:'bridger', defaultOrder:30 },
  { key:'bridger-email-outreach', label:'Email Outreach', kind:'district', route:'/bridger/email-outreach', area:'Bridger', scope:'bridger', protected:true, defaultOrder:35 },
  { key:'bridger-numbers', label:'Number Bay', kind:'district', route:'/bridger/numbers', area:'Bridger', scope:'bridger', defaultOrder:40 },
  { key:'bridger-value', label:'Deposit & Withdrawal', kind:'district', route:'/wallet/deposit-withdraw', area:'Bridger', scope:'bridger', defaultOrder:50 },

  { key:'agent-presence', label:'Agent Presence', kind:'district', route:'/agent/presence', area:'Agent', scope:'agent', protected:true, defaultOrder:5 },
  { key:'agent-agility', label:'Agility', kind:'district', route:'/agility', area:'Agent', scope:'agent', defaultOrder:20 },
  { key:'agent-commissions', label:'Commissions', kind:'district', route:'/agent/commissions', area:'Agent', scope:'agent', defaultOrder:30 },

  { key:'client-presence', label:'Client Presence', kind:'district', route:'/client/presence', area:'Client', scope:'client', protected:true, defaultOrder:5 },
  { key:'client-dashboard', label:'Client World', kind:'district', route:'/client/dashboard', area:'Client', scope:'client', protected:true, defaultOrder:10 },
  { key:'client-file-folder', label:'File Folder', kind:'district', route:'/client/system-switch', area:'Client', scope:'client', protected:true, defaultOrder:30 },
  { key:'client-loops', label:'Loop Field', kind:'district', route:'/client/loops', area:'Client', scope:'client', defaultOrder:40 },
  { key:'client-event', label:'Flame Event · Loop 1', kind:'district', route:'/client/event', area:'Client', scope:'client', defaultOrder:50 },
  { key:'client-settings', label:'Settings', kind:'district', route:'/client/settings', area:'Client', scope:'client', protected:true, defaultOrder:60 },

  { key:'file-folder-command', label:'Command Citadel', kind:'station', route:'/client/system-switch#command', area:'File Folder', scope:'client', protected:true, defaultOrder:10 },
  { key:'file-folder-builds', label:'Build Yard + Live Systems', kind:'station', route:'/client/system-switch#builds', area:'File Folder', scope:'client', defaultOrder:20 },
  { key:'file-folder-business', label:'Market + Customers', kind:'station', route:'/client/system-switch#business', area:'File Folder', scope:'client', defaultOrder:30 },
  { key:'file-folder-enterprise', label:'Expansion Council', kind:'station', route:'/client/system-switch#enterprise', area:'File Folder', scope:'client', defaultOrder:40 },
  { key:'file-folder-sound', label:'Sound Room', kind:'station', route:'/client/system-switch#sound', area:'File Folder', scope:'client', defaultOrder:50 },
  { key:'file-folder-blueprints', label:'Blueprint Foundry', kind:'station', route:'/client/system-switch#studio:blueprint_foundry', area:'File Folder Build Studio', scope:'client', defaultOrder:10 },
  { key:'file-folder-materials', label:'Materials Depot', kind:'station', route:'/client/system-switch#studio:build_market', area:'File Folder Build Studio', scope:'client', defaultOrder:20 },
  { key:'file-folder-parts', label:'Parts Workshop', kind:'station', route:'/client/system-switch#studio:parts_workshop', area:'File Folder Build Studio', scope:'client', defaultOrder:25 },
  { key:'file-folder-construction', label:'Construction Yard', kind:'station', route:'/client/system-switch#studio:formation_yard', area:'File Folder Build Studio', scope:'client', defaultOrder:30 },
  { key:'file-folder-boosts', label:'Acceleration Bay', kind:'station', route:'/client/system-switch#studio:boost_bay', area:'File Folder Build Studio', scope:'client', defaultOrder:40 },
  { key:'file-folder-live', label:'Live Systems', kind:'station', route:'/client/system-switch#studio:active_systems', area:'File Folder Build Studio', scope:'client', defaultOrder:50 },
  { key:'file-folder-library', label:'Build Intelligence Library', kind:'station', route:'/client/system-switch#studio:library_district', area:'File Folder Build Studio', scope:'client', defaultOrder:60 },

  { key:'admin-dashboard', label:'Administration World', kind:'district', route:'/admin/dashboard', area:'Administration', scope:'admin', protected:true, defaultOrder:10 },
  { key:'admin-control-center', label:'Administration Control Center', kind:'district', route:'/admin/control-center', area:'Administration', scope:'admin', protected:true, defaultOrder:30 },
  { key:'admin-environment-organizer', label:'Environment Organizer', kind:'district', route:'/admin/environment-organizer', area:'Administration', scope:'admin', protected:true, defaultOrder:40 },
  { key:'admin-prospect-engine', label:'Prospect Engine', kind:'district', route:'/admin/prospect-engine', area:'Administration', scope:'admin', defaultOrder:60 },
  { key:'admin-access-recovery', label:'Access Recovery Desk', kind:'district', route:'/admin/access-recovery', area:'Administration', scope:'admin', protected:true, defaultOrder:62 },
  { key:'admin-email-outreach', label:'Email Outreach', kind:'district', route:'/admin/email-outreach', area:'Administration', scope:'admin', protected:true, defaultOrder:65 },
  { key:'admin-number-engine', label:'Number Bay Engine', kind:'district', route:'/admin/bridger-numbers', area:'Administration', scope:'admin', defaultOrder:70 },
  { key:'admin-bridge-templates', label:'Bridge Templates', kind:'district', route:'/admin/bridge-templates', area:'Administration', scope:'admin', defaultOrder:80 },
  { key:'admin-file-number-engine', label:'File Number Engine', kind:'district', route:'/admin/file-number-engine', area:'Administration', scope:'admin', defaultOrder:90 },
  { key:'admin-outreach', label:'Fulfillment Agent', kind:'district', route:'/admin/outreach', area:'Administration', scope:'admin', defaultOrder:100 },
  { key:'admin-agent-channels', label:'Agent Channel Requests', kind:'district', route:'/admin/agent-channels', area:'Administration', scope:'admin', defaultOrder:110 },
  { key:'admin-client-deposits', label:'Client Deposits', kind:'district', route:'/admin/client-deposits', area:'Administration', scope:'admin', defaultOrder:120 },
  { key:'admin-client-vault', label:'Client Vaults', kind:'district', route:'/admin/client-vault', area:'Administration', scope:'admin', defaultOrder:130 },
  { key:'admin-enterprise-systems', label:'Enterprise Systems', kind:'district', route:'/admin/enterprise-systems', area:'Administration', scope:'admin', defaultOrder:140 },
  { key:'admin-agility', label:'Agility Fulfillment', kind:'district', route:'/admin/agility', area:'Administration', scope:'admin', defaultOrder:150 },
  { key:'admin-enterprise-dream', label:'Enterprise Dream', kind:'district', route:'/admin/enterprise-dream', area:'Administration', scope:'admin', defaultOrder:160 },
  { key:'admin-client-build-catalog', label:'Client Build Catalog', kind:'district', route:'/admin/client-build-catalog', area:'Administration', scope:'admin', defaultOrder:170 },
  { key:'admin-loop-workshop', label:'Loop Workshop', kind:'district', route:'/admin/loop-workshop', area:'Administration', scope:'admin', defaultOrder:180 },
  { key:'admin-authority-workshop', label:'Authority Workshop', kind:'district', route:'/authority/workshops', area:'Administration', scope:'admin', defaultOrder:190 },
  { key:'admin-infrastructure', label:'Infrastructure', kind:'district', route:'/admin/infrastructure', area:'Administration', scope:'admin', defaultOrder:200 },
  { key:'admin-development-foundry', label:'Development Foundry', kind:'district', route:'/admin/development-agents', area:'Administration', scope:'admin', protected:true, defaultOrder:202 },
  { key:'admin-integrity-engine', label:'WEAVE Integrity Engine', kind:'district', route:'/admin/dev-workshop', area:'Administration', scope:'admin', protected:true, defaultOrder:205 },
  { key:'admin-dj-workshop', label:'DJ Workshop', kind:'district', route:'/admin/dj-workshop', area:'Administration', scope:'admin', defaultOrder:210 },
  { key:'admin-ad-workshop', label:'Ad Workshop', kind:'district', route:'/admin/ad-workshop', area:'Administration', scope:'admin', defaultOrder:220 },
  { key:'admin-video-ad-studio', label:'Video Ad Studio', kind:'district', route:'/admin/video-ad-workshop', area:'Administration', scope:'admin', protected:true, defaultOrder:225 },
  { key:'admin-visual-systems', label:'Visual Systems · Interaction in Motion', kind:'district', route:'/admin/visual-systems', area:'Administration', scope:'admin', defaultOrder:230 },
  { key:'admin-flame-event', label:'Flame Event Control', kind:'district', route:'/admin/flame-event', area:'Administration', scope:'admin', defaultOrder:240 },
]

export function normalizeEnvironmentPageRoute(route:string){
  return String(route||'').split('#')[0].split('?')[0] || '/'
}
