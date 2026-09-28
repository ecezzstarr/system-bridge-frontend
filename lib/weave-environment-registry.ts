export type EnvironmentSurfaceKind = 'district' | 'station'
export type EnvironmentSurfaceScope = 'shared' | 'admin' | 'agent' | 'bridger' | 'client'

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
  { key:'shared-bridge-plaza', label:'Bridge Plaza', kind:'district', route:'/weave', area:'Shared WEAVE', scope:'shared', defaultOrder:40 },
  { key:'shared-company-guidance', label:'Company Guidance', kind:'district', route:'/company-chat', area:'Shared WEAVE', scope:'shared', defaultOrder:50 },
  { key:'shared-lounge', label:'Lounge', kind:'district', route:'/lounge', area:'Shared WEAVE', scope:'shared', defaultOrder:60 },
  { key:'shared-marketplace', label:'Enterprise Systems', kind:'district', route:'/marketplace', area:'Shared WEAVE', scope:'shared', defaultOrder:70 },
  { key:'shared-echo', label:'Echo', kind:'district', route:'/echo', area:'Shared WEAVE', scope:'shared', defaultOrder:80 },
  { key:'shared-arena', label:'Arena', kind:'district', route:'/arena', area:'Shared WEAVE', scope:'shared', defaultOrder:90 },
  { key:'shared-casino', label:'Casino', kind:'district', route:'/casino', area:'Shared WEAVE', scope:'shared', defaultOrder:100 },
  { key:'shared-stream', label:'Stream', kind:'district', route:'/video-feed', area:'Shared WEAVE', scope:'shared', defaultOrder:110 },
  { key:'shared-standing', label:'Standing', kind:'district', route:'/weave/standing', area:'Shared WEAVE', scope:'shared', defaultOrder:120 },

  { key:'bridger-functions', label:'Bridger Operating Room', kind:'district', route:'/bridger/functions', area:'Bridger', scope:'bridger', protected:true, defaultOrder:10 },
  { key:'bridger-numbers', label:'WhatsApp Numbers', kind:'district', route:'/bridger/numbers', area:'Bridger', scope:'bridger', defaultOrder:20 },
  { key:'bridger-bridge-ai', label:'Bridge AI Paths', kind:'district', route:'/bridger/bridge-ai', area:'Bridger', scope:'bridger', defaultOrder:30 },
  { key:'bridger-bridge-radiance', label:'Bridge Radiance', kind:'district', route:'/bridger/bridge-radiance', area:'Bridger', scope:'bridger', defaultOrder:35 },
  { key:'bridger-prospect-market', label:'Prospect Market', kind:'district', route:'/weave/market/prospects', area:'Bridger', scope:'bridger', defaultOrder:40 },
  { key:'bridger-clients', label:'My Clients', kind:'district', route:'/bridger/clients', area:'Bridger', scope:'bridger', defaultOrder:50 },
  { key:'bridger-continuance', label:'Bridger Continuance', kind:'district', route:'/bridger/subscription', area:'Bridger', scope:'bridger', defaultOrder:60 },

  { key:'agent-functions', label:'Agent Operating Room', kind:'district', route:'/agent/functions', area:'Agent', scope:'agent', protected:true, defaultOrder:10 },
  { key:'agent-bridgers', label:'My Bridgers', kind:'district', route:'/agent/bridgers', area:'Agent', scope:'agent', defaultOrder:20 },
  { key:'agent-stability-supply', label:'Stability Commercial Supply', kind:'district', route:'/agent/stability-supply', area:'Stability', scope:'agent', defaultOrder:25 },
  { key:'agent-channels', label:'Agent Channels', kind:'district', route:'/agent/channels', area:'Agent', scope:'agent', defaultOrder:30 },
  { key:'agent-commissions', label:'Agent Continuance', kind:'district', route:'/agent/commissions', area:'Agent', scope:'agent', defaultOrder:40 },
  { key:'agent-agility', label:'Agility Agent Store', kind:'district', route:'/agility', area:'Agent', scope:'agent', defaultOrder:50 },

  { key:'client-dashboard', label:'Client Home World', kind:'district', route:'/client/dashboard', area:'Client', scope:'client', protected:true, defaultOrder:10 },
  { key:'client-functions', label:'Client Operating Room', kind:'district', route:'/client/functions', area:'Client', scope:'client', protected:true, defaultOrder:20 },
  { key:'client-file-folder', label:'Main File Folder', kind:'district', route:'/client/system-switch', area:'Client', scope:'client', protected:true, defaultOrder:30 },
  { key:'client-loops', label:'Client Loop Field', kind:'district', route:'/client/loops', area:'Client', scope:'client', defaultOrder:40 },
  { key:'client-event', label:'Client Loop 1 Ground', kind:'district', route:'/client/event', area:'Client', scope:'client', defaultOrder:50 },

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

  { key:'admin-dashboard', label:'Administration Home', kind:'district', route:'/admin/dashboard', area:'Administration', scope:'admin', protected:true, defaultOrder:10 },
  { key:'admin-functions', label:'Administration Operating Room', kind:'district', route:'/admin/functions', area:'Administration', scope:'admin', protected:true, defaultOrder:20 },
  { key:'admin-control-center', label:'Administration Control Center', kind:'district', route:'/admin/control-center', area:'Administration', scope:'admin', protected:true, defaultOrder:30 },
  { key:'admin-environment-organizer', label:'Environment Organizer', kind:'district', route:'/admin/environment-organizer', area:'Administration', scope:'admin', protected:true, defaultOrder:40 },
  { key:'admin-message-hub', label:'Message Hub', kind:'district', route:'/admin/hub', area:'Administration', scope:'admin', defaultOrder:50 },
  { key:'admin-prospect-engine', label:'Prospect Engine', kind:'district', route:'/admin/prospect-engine', area:'Administration', scope:'admin', defaultOrder:60 },
  { key:'admin-number-engine', label:'WhatsApp Number Engine', kind:'district', route:'/admin/bridger-numbers', area:'Administration', scope:'admin', defaultOrder:70 },
  { key:'admin-bridge-templates', label:'Bridge Templates', kind:'district', route:'/admin/bridge-templates', area:'Administration', scope:'admin', defaultOrder:80 },
  { key:'admin-file-number-engine', label:'File Number Engine', kind:'district', route:'/admin/file-number-engine', area:'Administration', scope:'admin', defaultOrder:90 },
  { key:'admin-outreach', label:'Fulfillment Agent', kind:'district', route:'/admin/outreach', area:'Administration', scope:'admin', defaultOrder:100 },
  { key:'admin-agent-channels', label:'Agent Channel Requests', kind:'district', route:'/admin/agent-channels', area:'Administration', scope:'admin', defaultOrder:110 },
  { key:'admin-client-deposits', label:'Client Deposits', kind:'district', route:'/admin/client-deposits', area:'Administration', scope:'admin', defaultOrder:120 },
  { key:'admin-client-vault', label:'Client Vaults', kind:'district', route:'/admin/client-vault', area:'Administration', scope:'admin', defaultOrder:130 },
  { key:'admin-enterprise-systems', label:'Enterprise Systems Workshop', kind:'district', route:'/admin/enterprise-systems', area:'Administration', scope:'admin', defaultOrder:140 },
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
  { key:'admin-visual-systems', label:'Visual Systems', kind:'district', route:'/admin/visual-systems', area:'Administration', scope:'admin', defaultOrder:230 },
  { key:'admin-flame-event', label:'Flame Event · Loop 1', kind:'district', route:'/admin/flame-event', area:'Administration', scope:'admin', defaultOrder:240 },
]

export function normalizeEnvironmentPageRoute(route:string){
  return String(route||'').split('#')[0].split('?')[0] || '/'
}
