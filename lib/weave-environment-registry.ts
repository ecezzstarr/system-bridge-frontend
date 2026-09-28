export type EnvironmentSurfaceKind = 'district' | 'place' | 'station'
export type EnvironmentSurfaceScope = 'shared' | 'admin' | 'agent' | 'bridger' | 'client' | 'staff'

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
  { key:'shared-company-loops', label:'Company Loops', kind:'place', route:'/company/loops', area:'Shared WEAVE', scope:'shared', defaultOrder:10 },
  { key:'shared-human-cadences', label:'Human Cadences', kind:'place', route:'/search', area:'Shared WEAVE', scope:'shared', defaultOrder:20 },
  { key:'shared-presences', label:'Presences', kind:'place', route:'/profiles', area:'Shared WEAVE', scope:'shared', defaultOrder:30 },
  { key:'shared-bridge-plaza', label:'Bridge Plaza', kind:'district', route:'/weave', area:'Shared WEAVE', scope:'shared', defaultOrder:40 },
  { key:'shared-company-guidance', label:'Company Guidance', kind:'place', route:'/company-chat', area:'Shared WEAVE', scope:'shared', defaultOrder:50 },
  { key:'shared-lounge', label:'Lounge', kind:'place', route:'/lounge', area:'Shared WEAVE', scope:'shared', defaultOrder:60 },
  { key:'shared-marketplace', label:'Enterprise Systems', kind:'place', route:'/marketplace', area:'Shared WEAVE', scope:'shared', defaultOrder:70 },
  { key:'shared-echo', label:'Echo', kind:'place', route:'/echo', area:'Shared WEAVE', scope:'shared', defaultOrder:80 },
  { key:'shared-arena', label:'Arena', kind:'place', route:'/arena', area:'Shared WEAVE', scope:'shared', defaultOrder:90 },
  { key:'shared-casino', label:'Casino', kind:'place', route:'/casino', area:'Shared WEAVE', scope:'shared', defaultOrder:100 },
  { key:'shared-stream', label:'Stream', kind:'place', route:'/video-feed', area:'Shared WEAVE', scope:'shared', defaultOrder:110 },
  { key:'shared-standing', label:'Standing', kind:'place', route:'/weave/standing', area:'Shared WEAVE', scope:'shared', defaultOrder:120 },

  { key:'bridger-functions', label:'Bridger Operating Room', kind:'place', route:'/bridger/functions', area:'Bridger', scope:'bridger', protected:true, defaultOrder:10 },
  { key:'bridger-numbers', label:'WhatsApp Numbers', kind:'place', route:'/bridger/numbers', area:'Bridger', scope:'bridger', defaultOrder:20 },
  { key:'bridger-bridge-ai', label:'Bridge AI Paths', kind:'place', route:'/bridger/bridge-ai', area:'Bridger', scope:'bridger', defaultOrder:30 },
  { key:'bridger-bridge-radiance', label:'Bridge Radiance', kind:'place', route:'/bridger/bridge-radiance', area:'Bridger', scope:'bridger', defaultOrder:35 },
  { key:'bridger-prospect-market', label:'Prospect Market', kind:'place', route:'/weave/market/prospects', area:'Bridger', scope:'bridger', defaultOrder:40 },
  { key:'bridger-clients', label:'My Clients', kind:'place', route:'/bridger/clients', area:'Bridger', scope:'bridger', defaultOrder:50 },
  { key:'bridger-continuance', label:'Bridger Continuance', kind:'place', route:'/bridger/subscription', area:'Bridger', scope:'bridger', defaultOrder:60 },

  { key:'agent-functions', label:'Agent Operating Room', kind:'place', route:'/agent/functions', area:'Agent', scope:'agent', protected:true, defaultOrder:10 },
  { key:'agent-bridgers', label:'My Bridgers', kind:'place', route:'/agent/bridgers', area:'Agent', scope:'agent', defaultOrder:20 },
  { key:'agent-stability-supply', label:'Stability Commercial Supply', kind:'place', route:'/agent/stability-supply', area:'Stability', scope:'agent', defaultOrder:25 },
  { key:'agent-channels', label:'Agent Channels', kind:'place', route:'/agent/channels', area:'Agent', scope:'agent', defaultOrder:30 },
  { key:'agent-commissions', label:'Agent Continuance', kind:'place', route:'/agent/commissions', area:'Agent', scope:'agent', defaultOrder:40 },
  { key:'agent-agility', label:'Agility Agent Store', kind:'place', route:'/agility', area:'Agent', scope:'agent', defaultOrder:50 },

  { key:'client-dashboard', label:'Client Home World', kind:'place', route:'/client/dashboard', area:'Client', scope:'client', protected:true, defaultOrder:10 },
  { key:'client-functions', label:'Client Operating Room', kind:'place', route:'/client/functions', area:'Client', scope:'client', protected:true, defaultOrder:20 },
  { key:'client-file-folder', label:'Main File Folder', kind:'place', route:'/client/system-switch', area:'Client', scope:'client', protected:true, defaultOrder:30 },
  { key:'client-loops', label:'Client Loop Field', kind:'place', route:'/client/loops', area:'Client', scope:'client', defaultOrder:40 },
  { key:'client-event', label:'Client Loop 1 Ground', kind:'place', route:'/client/event', area:'Client', scope:'client', defaultOrder:50 },

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

  { key:'admin-dashboard', label:'Administration Home', kind:'place', route:'/admin/dashboard', area:'Administration', scope:'admin', protected:true, defaultOrder:10 },
  { key:'admin-functions', label:'Administration Operating Room', kind:'place', route:'/admin/functions', area:'Administration', scope:'admin', protected:true, defaultOrder:20 },
  { key:'admin-control-center', label:'Administration Control Center', kind:'place', route:'/admin/control-center', area:'Administration', scope:'admin', protected:true, defaultOrder:30 },
  { key:'admin-environment-organizer', label:'Environment Organizer', kind:'place', route:'/admin/environment-organizer', area:'Administration', scope:'admin', protected:true, defaultOrder:40 },
  { key:'admin-message-hub', label:'Message Hub', kind:'place', route:'/admin/hub', area:'Administration', scope:'admin', defaultOrder:50 },
  { key:'admin-prospect-engine', label:'Prospect Engine', kind:'place', route:'/admin/prospect-engine', area:'Administration', scope:'admin', defaultOrder:60 },
  { key:'admin-number-engine', label:'WhatsApp Number Engine', kind:'place', route:'/admin/bridger-numbers', area:'Administration', scope:'admin', defaultOrder:70 },
  { key:'admin-bridge-templates', label:'Bridge Templates', kind:'place', route:'/admin/bridge-templates', area:'Administration', scope:'admin', defaultOrder:80 },
  { key:'admin-file-number-engine', label:'File Number Engine', kind:'place', route:'/admin/file-number-engine', area:'Administration', scope:'admin', defaultOrder:90 },
  { key:'admin-outreach', label:'Fulfillment Agent', kind:'place', route:'/admin/outreach', area:'Administration', scope:'admin', defaultOrder:100 },
  { key:'admin-agent-channels', label:'Agent Channel Requests', kind:'place', route:'/admin/agent-channels', area:'Administration', scope:'admin', defaultOrder:110 },
  { key:'admin-client-deposits', label:'Client Deposits', kind:'place', route:'/admin/client-deposits', area:'Administration', scope:'admin', defaultOrder:120 },
  { key:'admin-client-vault', label:'Client Vaults', kind:'place', route:'/admin/client-vault', area:'Administration', scope:'admin', defaultOrder:130 },
  { key:'admin-enterprise-systems', label:'Enterprise Systems Workshop', kind:'place', route:'/admin/enterprise-systems', area:'Administration', scope:'admin', defaultOrder:140 },
  { key:'admin-agility', label:'Agility Fulfillment', kind:'place', route:'/admin/agility', area:'Administration', scope:'admin', defaultOrder:150 },
  { key:'admin-enterprise-dream', label:'Enterprise Dream', kind:'place', route:'/admin/enterprise-dream', area:'Administration', scope:'admin', defaultOrder:160 },
  { key:'admin-client-build-catalog', label:'Client Build Catalog', kind:'place', route:'/admin/client-build-catalog', area:'Administration', scope:'admin', defaultOrder:170 },
  { key:'admin-loop-workshop', label:'Loop Workshop', kind:'place', route:'/admin/loop-workshop', area:'Administration', scope:'admin', defaultOrder:180 },
  { key:'admin-authority-workshop', label:'Authority Workshop', kind:'place', route:'/authority/workshops', area:'Administration', scope:'admin', defaultOrder:190 },
  { key:'admin-infrastructure', label:'Infrastructure', kind:'place', route:'/admin/infrastructure', area:'Administration', scope:'admin', defaultOrder:200 },
  { key:'admin-development-foundry', label:'Development Foundry', kind:'place', route:'/admin/development-agents', area:'Administration', scope:'admin', protected:true, defaultOrder:202 },
  { key:'admin-integrity-engine', label:'WEAVE Integrity Engine', kind:'place', route:'/admin/dev-workshop', area:'Administration', scope:'admin', protected:true, defaultOrder:205 },
  { key:'admin-dj-workshop', label:'DJ Workshop', kind:'place', route:'/admin/dj-workshop', area:'Administration', scope:'admin', defaultOrder:210 },
  { key:'admin-ad-workshop', label:'Ad Workshop', kind:'place', route:'/admin/ad-workshop', area:'Administration', scope:'admin', defaultOrder:220 },
  { key:'admin-visual-systems', label:'Visual Systems', kind:'place', route:'/admin/visual-systems', area:'Administration', scope:'admin', defaultOrder:230 },
  { key:'admin-flame-event', label:'Flame Event · Loop 1', kind:'place', route:'/admin/flame-event', area:'Administration', scope:'admin', defaultOrder:240 },
  { key:'shared-loop-ground', label:'Loop 1 Ground', kind:'place', route:'/event', area:'Shared WEAVE', scope:'shared', defaultOrder:125 },
  { key:'shared-wallet', label:'Value Vault', kind:'place', route:'/wallet', area:'Shared WEAVE', scope:'shared', defaultOrder:130 },
  { key:'shared-ledger', label:'Movement Record', kind:'place', route:'/ledger', area:'Shared WEAVE', scope:'shared', defaultOrder:140 },
  { key:'shared-receipts', label:'Receipts', kind:'place', route:'/receipts', area:'Shared WEAVE', scope:'shared', defaultOrder:150 },
  { key:'shared-reserve', label:'Reserve', kind:'place', route:'/fund-wall', area:'Shared WEAVE', scope:'admin', defaultOrder:160 },
  { key:'shared-place-directory', label:'District Directory', kind:'place', route:'/places', area:'Shared WEAVE', scope:'shared', defaultOrder:170 },
  { key:'shared-private-ground', label:'Private Ground', kind:'place', route:'/private-ground', area:'Shared WEAVE', scope:'shared', defaultOrder:180 },
  { key:'shared-roles', label:'Position Registry', kind:'place', route:'/roles', area:'Shared WEAVE', scope:'shared', defaultOrder:190 },
  { key:'shared-wallet-movement', label:'Deposit + Withdrawal', kind:'place', route:'/wallet/deposit-withdraw', area:'Shared WEAVE', scope:'shared', defaultOrder:200 },
  { key:'shared-clients', label:'Clients', kind:'place', route:'/clients', area:'Shared WEAVE', scope:'staff', defaultOrder:210 },
  { key:'shared-client-interactions', label:'Client Interactions', kind:'place', route:'/client-interactions', area:'Shared WEAVE', scope:'staff', defaultOrder:220 },
  { key:'shared-role-home', label:'Role Home', kind:'place', route:'/dashboard', area:'Shared WEAVE', scope:'shared', defaultOrder:230 },

  { key:'bridger-dashboard', label:'Bridger Home', kind:'place', route:'/bridger/dashboard', area:'Bridger', scope:'bridger', protected:true, defaultOrder:5 },
  { key:'agent-dashboard', label:'Agent Home', kind:'place', route:'/agent/dashboard', area:'Agent', scope:'agent', protected:true, defaultOrder:5 },
  { key:'agent-bridge-radiance', label:'Bridge Radiance · Stability', kind:'place', route:'/agent/bridge-radiance', area:'Agent', scope:'agent', defaultOrder:35 },
  { key:'agent-client-chat', label:'Client Interaction Room', kind:'station', route:'/agent-chat/[clientId]/[position]', area:'Agent', scope:'agent', defaultOrder:90 },

  { key:'client-access', label:'Client Access Point', kind:'station', route:'/client', area:'Client', scope:'client', defaultOrder:1 },
  { key:'client-login', label:'Client Access Gate', kind:'station', route:'/client/login', area:'Client', scope:'client', defaultOrder:2 },
  { key:'client-register', label:'Client Registration Gate', kind:'station', route:'/client/register', area:'Client', scope:'client', defaultOrder:3 },
  { key:'client-settings', label:'Client Position Settings', kind:'place', route:'/client/settings', area:'Client', scope:'client', defaultOrder:55 },
  { key:'client-deposit', label:'Client Value Entry', kind:'place', route:'/client/deposit', area:'Client', scope:'client', defaultOrder:60 },
  { key:'client-withdraw', label:'Client Value Release', kind:'place', route:'/client/withdraw', area:'Client', scope:'client', defaultOrder:70 },
  { key:'client-admin-chat', label:'Administration Support', kind:'place', route:'/client/admin-chat', area:'Client', scope:'client', defaultOrder:80 },
  { key:'client-arena', label:'Client Arena', kind:'place', route:'/client/arena', area:'Client', scope:'client', defaultOrder:90 },
  { key:'client-pattern', label:'Client Pattern', kind:'place', route:'/client/casino', area:'Client', scope:'client', defaultOrder:100 },
  { key:'client-chat-position', label:'Client Support Interaction', kind:'station', route:'/client/chat/[position]', area:'Client', scope:'client', defaultOrder:110 },

  { key:'admin-root', label:'Administration Entrance', kind:'place', route:'/admin', area:'Administration', scope:'admin', protected:true, defaultOrder:1 },
  { key:'admin-bridge-ai', label:'Bridge AI Continuity', kind:'place', route:'/admin/bridge-ai', area:'Administration', scope:'admin', defaultOrder:45 },
  { key:'admin-campaign-flame', label:'Campaign Flame', kind:'place', route:'/admin/campaign-flame', area:'Administration', scope:'admin', defaultOrder:55 },
  { key:'admin-client-messages', label:'Client Messages', kind:'place', route:'/admin/client-messages', area:'Administration', scope:'admin', defaultOrder:65 },
  { key:'admin-departmental-registration', label:'Departmental Registration', kind:'place', route:'/admin/departmental-registration', area:'Administration', scope:'admin', defaultOrder:75 },
  { key:'admin-origin-systems', label:'Origin Systems', kind:'place', route:'/admin/origin-systems', area:'Administration', scope:'admin', defaultOrder:203 },
  { key:'admin-payments', label:'Payments', kind:'place', route:'/admin/payments', area:'Administration', scope:'admin', defaultOrder:208 },
  { key:'admin-subscriptions', label:'Subscriptions', kind:'place', route:'/admin/subscriptions', area:'Administration', scope:'admin', defaultOrder:209 },
  { key:'admin-workshop', label:'Administration Workshop', kind:'place', route:'/admin/workshop', area:'Administration', scope:'admin', defaultOrder:211 },
  { key:'authority-root', label:'Authority', kind:'place', route:'/authority', area:'Administration', scope:'admin', defaultOrder:212 },

  { key:'staff-file-folder-observer', label:'Client File Folder Observer', kind:'station', route:'/weave/file-folder/[fileNumber]', area:'System Switch', scope:'staff', defaultOrder:90 },

]

export function normalizeEnvironmentPageRoute(route:string){
  return String(route||'').split('#')[0].split('?')[0] || '/'
}
