export type WeaveRole='client'|'agent'|'bridger'|'admin'
export type WeaveDistrictKey='presence'|'position'|'bridge'|'enterprise'|'participation'|'administration'

export type WeaveRolePlace={
  label:string
  detail:string
  href:string
  daily?:boolean
}

export type WeaveRoleDistrict={
  key:WeaveDistrictKey
  name:string
  subtitle:string
  purpose:string
  accent:string
  places:WeaveRolePlace[]
}

// Single role catalog used by Bridge Plaza and all operating rooms.
const byRole:Record<WeaveRole,WeaveRoleDistrict[]>={
  "agent": [
    {
      "key": "presence",
      "name": "Presence",
      "subtitle": "UNDERSTAND YOUR POSITION",
      "purpose": "Understand the Agent position before entering its working functions.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Agent Presence",
          "href": "/agent/presence",
          "detail": "Understand the Agent position, Agility movement and commission return.",
          "daily": true
        }
      ]
    },
    {
      "key": "position",
      "name": "Agent Movement",
      "subtitle": "AGILITY + COMMISSIONS",
      "purpose": "Carry real distribution through Agility and receive the Agent shares from qualifying attached Bridger Prospect purchases and verified Client File Folder crossings.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Agility",
          "href": "/agility",
          "detail": "Order, receive, distribute and record Agility movement.",
          "daily": true
        },
        {
          "label": "Commissions",
          "href": "/agent/commissions",
          "detail": "See Prospect purchase shares and verified Client File Folder shares generated through attached Bridgers.",
          "daily": true
        }
      ]
    }
  ],
  "bridger": [
    {
      "key": "presence",
      "name": "Presence",
      "subtitle": "UNDERSTAND YOUR POSITION",
      "purpose": "Understand the Bridger position and the movement it carries before entering Bridge tools.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Bridger Presence",
          "href": "/bridger/presence",
          "detail": "Understand prospect movement, Bridge AI, Number Bay, Echo, Presences and value continuity.",
          "daily": true
        }
      ]
    },
    {
      "key": "bridge",
      "name": "Bridge Movement",
      "subtitle": "PROSPECT → CROSSING",
      "purpose": "Acquire Prospects, operate authorized outreach, carry people toward Client crossing and receive the Bridger share when a guided Prospect completes a verified File Folder purchase.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Bridge AI",
          "href": "/bridger/bridge-ai",
          "detail": "Use and maintain the Bridge AI crossing path.",
          "daily": true
        },
        {
          "label": "Prospect Market",
          "href": "/weave/market/prospects",
          "detail": "Claim the daily Prospect or purchase Prospect movement.",
          "daily": true
        },
        {
          "label": "Number Bay",
          "href": "/bridger/numbers",
          "detail": "Purchase authenticated numbers and follow delivery and verification.",
          "daily": true
        },
        {
          "label": "Echo",
          "href": "/echo",
          "detail": "Operate authorized AI-assisted outreach and amplification."
        },
        {
          "label": "Presences",
          "href": "/profiles",
          "detail": "See people and active Presences inside WEAVE."
        }
      ]
    },
    {
      "key": "participation",
      "name": "Value",
      "subtitle": "DEPOSIT + WITHDRAWAL",
      "purpose": "Keep Bridger value movement available without turning value controls into the identity of the role.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Deposit & Withdrawal",
          "href": "/wallet/deposit-withdraw",
          "detail": "Deposit Flame Coin value or request withdrawal.",
          "daily": true
        }
      ]
    }
  ],
  "client": [
    {
      "key": "presence",
      "name": "Presence",
      "subtitle": "UNDERSTAND YOUR WORLD",
      "purpose": "Understand the Client position, the File Folder and how work, value and support continue through the Client world.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Client Presence",
          "href": "/client/presence",
          "detail": "Understand your Client world, File Folder, value movement and support paths.",
          "daily": true
        }
      ]
    },
    {
      "key": "position",
      "name": "File Folder",
      "subtitle": "BUILD + OPERATE",
      "purpose": "Enter System Switch, build systems and operate the Client File Folder.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "System Switch · File Folder",
          "href": "/client/system-switch",
          "detail": "Build and operate systems, your store and Customer Door.",
          "daily": true
        },
        {
          "label": "Enterprise Systems",
          "href": "/marketplace",
          "detail": "Explore enterprise-scale systems for your work."
        },
        {
          "label": "Settings",
          "href": "/client/settings",
          "detail": "Manage your Client identity and account."
        }
      ]
    },
    {
      "key": "participation",
      "name": "Funds & Records",
      "subtitle": "VALUE + EVIDENCE",
      "purpose": "Fund work, release available value and preserve financial evidence.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Deposit",
          "href": "/client/deposit",
          "detail": "Fund your Client work."
        },
        {
          "label": "Withdraw",
          "href": "/client/withdraw",
          "detail": "Request controlled release of available value."
        },
        {
          "label": "Wallet",
          "href": "/wallet",
          "detail": "See balances and value movement."
        },
        {
          "label": "Records",
          "href": "/ledger",
          "detail": "See preserved payment and earning history."
        },
        {
          "label": "Receipts",
          "href": "/receipts",
          "detail": "See payment, purchase and withdrawal receipts."
        }
      ]
    },
    {
      "key": "bridge",
      "name": "Support",
      "subtitle": "HUMAN CONTINUITY",
      "purpose": "Reach the authorized WEAVE position needed for the next Client movement.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Your Bridger",
          "href": "/client/chat/bridger",
          "detail": "Contact Your Bridger for crossing and continuity support."
        },
        {
          "label": "Mandate",
          "href": "/client/chat/mandate",
          "detail": "Contact Mandate for operational support."
        },
        {
          "label": "Forensics",
          "href": "/client/chat/forensic",
          "detail": "Contact Forensics for value and verification support."
        },
        {
          "label": "Attorney",
          "href": "/client/chat/lawyer",
          "detail": "Contact Attorney for legal support."
        },
        {
          "label": "Administration",
          "href": "/client/chat/admin",
          "detail": "Contact Administration for institutional support."
        }
      ]
    }
  ],
  "admin": [
    {
      "key": "position",
      "name": "Control",
      "subtitle": "PEOPLE + AUTHORITY",
      "purpose": "Govern people, departmental placement, Bridger standing and institutional authorization from one control district.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Administration Control Center",
          "href": "/admin/control-center",
          "detail": "Users, departmental authorization, Bridger operations, verification queues and announcements.",
          "daily": true
        },
        {
          "label": "Departmental Registration",
          "href": "/admin/departmental-registration",
          "detail": "Issue departmental codes and company placement."
        },
        {
          "label": "Subscriptions",
          "href": "/admin/subscriptions",
          "detail": "Review subscription and Continuance standing."
        }
      ]
    },
    {
      "key": "presence",
      "name": "Finance",
      "subtitle": "VALUE + RECORDS",
      "purpose": "Review, release and preserve institutional value movement without duplicating verification stations.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Client Deposits",
          "href": "/admin/client-deposits",
          "detail": "Review Client funding requests.",
          "daily": true
        },
        {
          "label": "Client Vaults",
          "href": "/admin/client-vault",
          "detail": "Administer Client vault movement."
        },
        {
          "label": "Payments",
          "href": "/admin/payments",
          "detail": "Institutional payment administration."
        },
        {
          "label": "Wallet",
          "href": "/wallet",
          "detail": "Administration balances and value position."
        },
        {
          "label": "Reserve",
          "href": "/fund-wall",
          "detail": "Institutional reserve and fund position."
        },
        {
          "label": "Records",
          "href": "/ledger",
          "detail": "Administration value history."
        },
        {
          "label": "Receipts",
          "href": "/receipts",
          "detail": "Receipts issued for Administration value movement."
        }
      ]
    },
    {
      "key": "bridge",
      "name": "Operations",
      "subtitle": "LIVE COMPANY SYSTEMS",
      "purpose": "Operate the engines that move Clients, Prospects, Bridgers, Agility and enterprise formation.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "File Number Engine",
          "href": "/admin/file-number-engine",
          "detail": "Issue and administer Client File Numbers.",
          "daily": true
        },
        {
          "label": "Prospect Engine",
          "href": "/admin/prospect-engine",
          "detail": "Create and organize Prospect movement.",
          "daily": true
        },
        {
          "label": "Number Bay Engine",
          "href": "/admin/bridger-numbers",
          "detail": "Number Bay stock, delivery and verification authority.",
          "daily": true
        },
        {
          "label": "Bridge AI",
          "href": "/admin/bridge-ai",
          "detail": "Review Bridge AI crossing and Client continuity."
        },
        {
          "label": "Bridge Templates",
          "href": "/admin/bridge-templates",
          "detail": "Control Bridge AI crossing templates."
        },
        {
          "label": "Fulfillment Agent",
          "href": "/admin/outreach",
          "detail": "Authorized Prospect outreach and delivery movement."
        },
        {
          "label": "Agility Fulfillment",
          "href": "/admin/agility",
          "detail": "Administer Agility orders and fulfillment."
        },
        {
          "label": "Enterprise Dream",
          "href": "/admin/enterprise-dream",
          "detail": "Lord/Lady elevation and enterprise plans."
        },
        {
          "label": "Client Build Catalog",
          "href": "/admin/client-build-catalog",
          "detail": "Control Client build systems and pricing."
        },
        {
          "label": "Enterprise Systems",
          "href": "/admin/enterprise-systems",
          "detail": "Build and administer enterprise-scale systems."
        }
      ]
    },
    {
      "key": "administration",
      "name": "Workshops",
      "subtitle": "BUILD + GOVERN",
      "purpose": "Develop, govern and tune WEAVE itself through distinct Administration workshops.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Authority Workshop",
          "href": "/authority/workshops",
          "detail": "Institutional structures and authority."
        },
        {
          "label": "Development Foundry",
          "href": "/admin/development-agents",
          "detail": "EIGHT and persistent coding agents developing WEAVE against the real source."
        },
        {
          "label": "WEAVE Integrity Engine",
          "href": "/admin/dev-workshop",
          "detail": "Inspect and safely repair live WEAVE system state."
        },
        {
          "label": "Origin Systems",
          "href": "/admin/origin-systems",
          "detail": "Inspect origin runtime and system foundations."
        },
        {
          "label": "Infrastructure",
          "href": "/admin/infrastructure",
          "detail": "Cloud Run, runtime and maintenance control."
        },
        {
          "label": "Visual Systems · Interaction in Motion",
          "href": "/admin/visual-systems",
          "detail": "Govern live Flame, River, route current and visual runtime."
        },
        {
          "label": "Environment Organizer",
          "href": "/admin/environment-organizer",
          "detail": "Withdraw, restore and reorder active WEAVE environments."
        },
        {
          "label": "Loop Workshop",
          "href": "/admin/loop-workshop",
          "detail": "Create and publish Company Loops."
        },
        {
          "label": "DJ Workshop",
          "href": "/admin/dj-workshop",
          "detail": "System sound and live atmosphere."
        },
        {
          "label": "Ad Workshop",
          "href": "/admin/ad-workshop",
          "detail": "Role-targeted communication without deployment."
        }
      ]
    },
    {
      "key": "participation",
      "name": "Communication & Events",
      "subtitle": "MESSAGE + LOOP",
      "purpose": "Operate company communication and current event movement without duplicating shared participant spaces.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Message Hub",
          "href": "/admin/hub",
          "detail": "People, Client and staff communication.",
          "daily": true
        },
        {
          "label": "Client Messages",
          "href": "/admin/client-messages",
          "detail": "Direct Client communication records."
        },
        {
          "label": "Company Loops",
          "href": "/company/loops",
          "detail": "Shared company movement visible across WEAVE."
        },
        {
          "label": "Company Guidance",
          "href": "/company-chat",
          "detail": "Use the shared company clarification channel."
        },
        {
          "label": "Campaign Flame",
          "href": "/admin/campaign-flame",
          "detail": "Campaign construction and coordinated movement."
        },
        {
          "label": "Flame Event · Loop 1",
          "href": "/admin/flame-event",
          "detail": "Event-world control and opening movement."
        }
      ]
    }
  ]
}

export function normalizeWeaveRole(role?:string|null):WeaveRole{
  if(role==='admin'||role==='agent'||role==='bridger'||role==='client')return role
  return 'client'
}

export function getRoleDistricts(role?:string|null){
  return byRole[normalizeWeaveRole(role)]
}

export function getRoleDistrict(role:string|undefined|null,key:string){
  return getRoleDistricts(role).find(district=>district.key===key)||null
}

export function getRolePlaces(role?:string|null){
  return getRoleDistricts(role).flatMap(district=>district.places.map(place=>({...place,district:district.name})))
}
