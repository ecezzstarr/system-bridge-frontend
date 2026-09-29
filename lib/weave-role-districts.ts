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
      "key": "position",
      "name": "Bridger Management",
      "subtitle": "BRIDGER MANAGEMENT",
      "purpose": "Recruit and support your assigned Bridgers.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "My Bridgers",
          "href": "/agent/bridgers",
          "detail": "Recruitment guidance, assigned Bridgers and team progress."
        },
        {
          "label": "Commissions",
          "href": "/agent/commissions",
          "detail": "Review Bridger participation and recorded earnings."
        },
        {
          "label": "Bridger Conversations",
          "href": "/agent/bridge-radiance",
          "detail": "Support assigned Bridgers with prospect conversations."
        }
      ]
    },
    {
      "key": "enterprise",
      "name": "Agility",
      "subtitle": "AGILITY",
      "purpose": "Agility.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Agility",
          "href": "/agility",
          "detail": "Order stock, submit payment, receive deliveries and record sales."
        }
      ]
    },
    {
      "key": "presence",
      "name": "Account & Support",
      "subtitle": "ACCOUNT & SUPPORT",
      "purpose": "Account & Support.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Deposit & Withdrawal",
          "href": "/wallet/deposit-withdraw",
          "detail": "Fund your work and manage payment movement."
        },
        {
          "label": "Wallet",
          "href": "/wallet",
          "detail": "Balances and value movement."
        },
        {
          "label": "Records",
          "href": "/ledger",
          "detail": "Payment and earning history."
        },
        {
          "label": "Receipts",
          "href": "/receipts",
          "detail": "Payment, purchase and withdrawal receipts."
        },
        {
          "label": "Company Support",
          "href": "/company-chat",
          "detail": "Recruitment, assignment and operational support."
        },
        {
          "label": "Agent Channels",
          "href": "/agent/channels",
          "detail": "Manage approved company responsibilities."
        }
      ]
    }
  ],
  "bridger": [
    {
      "key": "position",
      "name": "Prospects & Conversations",
      "subtitle": "PROSPECTS & CONVERSATIONS",
      "purpose": "Carry prospects through conversations into Client crossing.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Prospect Market",
          "href": "/weave/market/prospects",
          "detail": "Claim your daily prospect or purchase prospect packages."
        },
        {
          "label": "Bridge Radiance",
          "href": "/bridger/bridge-radiance",
          "detail": "Continue prospect conversations toward Client crossing."
        },
        {
          "label": "Bridge AI",
          "href": "/bridger/bridge-ai",
          "detail": "Manage crossing paths, AI assistance and its subscription."
        },
        {
          "label": "My Clients",
          "href": "/bridger/clients",
          "detail": "Continue relationships after prospects become Clients."
        }
      ]
    },
    {
      "key": "bridge",
      "name": "Outreach Tools",
      "subtitle": "OUTREACH TOOLS",
      "purpose": "Outreach Tools.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Number Bay",
          "href": "/bridger/numbers",
          "detail": "Purchase numbers and follow delivery and verification."
        },
        {
          "label": "Echo",
          "href": "/echo",
          "detail": "AI-assisted interaction."
        },
        {
          "label": "Presences",
          "href": "/profiles",
          "detail": "Find people participating in Weave."
        }
      ]
    },
    {
      "key": "presence",
      "name": "Account & Support",
      "subtitle": "ACCOUNT & SUPPORT",
      "purpose": "Account & Support.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Deposit & Withdrawal",
          "href": "/wallet/deposit-withdraw",
          "detail": "Fund your work and manage payment movement."
        },
        {
          "label": "Wallet",
          "href": "/wallet",
          "detail": "Balances and value movement."
        },
        {
          "label": "Records",
          "href": "/ledger",
          "detail": "Payment and earning history."
        },
        {
          "label": "Receipts",
          "href": "/receipts",
          "detail": "Payment, purchase and withdrawal receipts."
        },
        {
          "label": "Subscription",
          "href": "/bridger/subscription",
          "detail": "Review and renew your Bridger subscription."
        },
        {
          "label": "Company Support",
          "href": "/company-chat",
          "detail": "Get help with your work."
        }
      ]
    }
  ],
  "client": [
    {
      "key": "position",
      "name": "File Folder",
      "subtitle": "FILE FOLDER",
      "purpose": "Enter System Switch, build and operate your systems.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "System Switch \u00b7 File Folder",
          "href": "/client/system-switch",
          "detail": "Build and operate systems, your store and Customer Door."
        },
        {
          "label": "Enterprise Systems",
          "href": "/marketplace",
          "detail": "Explore systems for your enterprise."
        },
        {
          "label": "Settings",
          "href": "/client/settings",
          "detail": "Manage your Client account."
        }
      ]
    },
    {
      "key": "presence",
      "name": "Funds & Records",
      "subtitle": "FUNDS & RECORDS",
      "purpose": "Funds & Records.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Deposit & Withdrawal",
          "href": "/client/deposit",
          "detail": "Fund your work and manage payment movement."
        },
        {
          "label": "Withdraw",
          "href": "/client/withdraw",
          "detail": "Request a withdrawal."
        },
        {
          "label": "Wallet",
          "href": "/wallet",
          "detail": "Balances and value movement."
        },
        {
          "label": "Records",
          "href": "/ledger",
          "detail": "Payment and earning history."
        },
        {
          "label": "Receipts",
          "href": "/receipts",
          "detail": "Payment, purchase and withdrawal receipts."
        }
      ]
    },
    {
      "key": "bridge",
      "name": "Support",
      "subtitle": "SUPPORT",
      "purpose": "Support.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Your Bridger",
          "href": "/client/chat/bridger",
          "detail": "Contact Your Bridger for support."
        },
        {
          "label": "Mandate",
          "href": "/client/chat/mandate",
          "detail": "Contact Mandate for support."
        },
        {
          "label": "Forensics",
          "href": "/client/chat/forensic",
          "detail": "Contact Forensics for support."
        },
        {
          "label": "Attorney",
          "href": "/client/chat/lawyer",
          "detail": "Contact Attorney for support."
        },
        {
          "label": "Administration",
          "href": "/client/chat/admin",
          "detail": "Contact Administration for support."
        }
      ]
    }
  ],
  "admin": [
    {
      "key": "position",
      "name": "People",
      "subtitle": "PEOPLE",
      "purpose": "Manage Agents, Bridgers and Clients.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "User Management",
          "detail": "Manage users, departments, roles and Bridger-to-Agent assignment.",
          "href": "/admin/control-center#users"
        },
        {
          "label": "Department Authorization",
          "detail": "Open the embedded departmental authorization component.",
          "href": "/admin/control-center#departmental"
        },
        {
          "label": "Bridger Operations",
          "detail": "Open Bridger operations, standing and exemption controls.",
          "href": "/admin/control-center#bridgers"
        },
        {
          "label": "Departmental Registration",
          "detail": "Departmental codes and company placement.",
          "href": "/admin/departmental-registration"
        },
        {
          "label": "Agent Channel Requests",
          "detail": "Approve Agent service channels.",
          "href": "/admin/agent-channels"
        },
        {
          "label": "Subscriptions",
          "detail": "Subscription and continuance administration.",
          "href": "/admin/subscriptions"
        }
      ]
    },
    {
      "key": "presence",
      "name": "Finance",
      "subtitle": "FINANCE",
      "purpose": "Finance.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Receipts",
          "detail": "Receipts issued for Administration value movement.",
          "href": "/receipts"
        },
        {
          "label": "Administration Wallet",
          "detail": "Platform balances, deposit, withdrawal and participation controls.",
          "href": "/admin/control-center#wallet"
        },
        {
          "label": "OPay Deposit Review",
          "detail": "Review and decide pending OPay deposits.",
          "href": "/admin/control-center#deposits"
        },
        {
          "label": "Withdrawal Review",
          "detail": "Review and decide pending withdrawal requests.",
          "href": "/admin/control-center#withdrawals"
        },
        {
          "label": "Client Deposits",
          "detail": "Review Client funding requests.",
          "href": "/admin/client-deposits"
        },
        {
          "label": "Client Vaults",
          "detail": "Administer Client vault movement.",
          "href": "/admin/client-vault"
        },
        {
          "label": "Payments",
          "detail": "Institutional payment administration.",
          "href": "/admin/payments"
        },
        {
          "label": "Reserve",
          "href": "/fund-wall",
          "detail": "Institutional reserve and fund position."
        },
        {
          "label": "Wallet",
          "href": "/wallet",
          "detail": "Administration balances."
        },
        {
          "label": "Records",
          "href": "/ledger",
          "detail": "Administration value history."
        }
      ]
    },
    {
      "key": "bridge",
      "name": "Operations",
      "subtitle": "OPERATIONS",
      "purpose": "Operations.",
      "accent": "#7dd3fc",
      "places": [
        {"label":"Enterprise Systems Exchange","href":"/marketplace","detail":"Explore the live enterprise systems market."},
        {
          "label": "Human Cadences",
          "detail": "Find people through their recorded participation and movement.",
          "href": "/search"
        },
        {
          "label": "Presences",
          "detail": "See people and their place in the WEAVE.",
          "href": "/profiles"
        },
        {
          "label": "Bridge Plaza",
          "detail": "Enter the shared WEAVE world and Client support entrance.",
          "href": "/weave"
        },
        {
          "label": "Standing",
          "detail": "See shared WEAVE standing and position.",
          "href": "/weave/standing"
        },
        {
          "label": "Administration Control Center",
          "detail": "Open the preserved dense Administration center and its live embedded components.",
          "href": "/admin/control-center"
        },
        {
          "label": "File Number Registry",
          "detail": "Open the existing File Number Engine component and registry history.",
          "href": "/admin/control-center#fne"
        },
        {
          "label": "Client Communications",
          "detail": "Open the existing Client communications panel.",
          "href": "/admin/control-center#clients"
        },
        {
          "label": "TRON Deposit Review",
          "detail": "Review and decide pending TRON deposits.",
          "href": "/admin/control-center#tron"
        },
        {
          "label": "Bridge Deposit Review",
          "detail": "Review Bridge AI and File Folder deposit movement.",
          "href": "/admin/control-center#bridge"
        },
        {
          "label": "Announcements",
          "detail": "Send role-targeted WEAVE announcements and update notices.",
          "href": "/admin/control-center#announcements"
        },
        {
          "label": "File Number Engine",
          "detail": "Issue and administer Client File Numbers.",
          "href": "/admin/file-number-engine"
        },
        {
          "label": "Enterprise Dream",
          "detail": "Lord/Lady elevation and enterprise plans.",
          "href": "/admin/enterprise-dream"
        },
        {
          "label": "Prospect Engine",
          "detail": "Create and organize Prospect movement.",
          "href": "/admin/prospect-engine"
        },
        {
          "label": "Bridge Templates",
          "detail": "Control Bridge AI crossing templates.",
          "href": "/admin/bridge-templates"
        },
        {
          "label": "Bridge AI Continuity",
          "detail": "Review Client Bridge AI support insight.",
          "href": "/admin/bridge-ai"
        },
        {
          "label": "Fulfillment Agent",
          "detail": "Authorized outreach and delivery movement.",
          "href": "/admin/outreach"
        },
        {
          "label": "Agility Fulfillment",
          "detail": "Administer Agility orders and fulfillment.",
          "href": "/admin/agility"
        },
        {
          "label": "Administration World",
          "detail": "Institutional arrival world and daily authority state.",
          "href": "/admin/dashboard"
        },
        {
          "label": "Administration Operating Room",
          "detail": "Enter administrative systems and controls.",
          "href": "/admin/functions"
        },
        {
          "label": "WhatsApp Number Engine",
          "detail": "Number Bay stock, delivery and verification authority.",
          "href": "/admin/bridger-numbers"
        }
      ]
    },
    {
      "key": "administration",
      "name": "Workshops",
      "subtitle": "WORKSHOPS",
      "purpose": "Workshops.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Administration Workshops",
          "detail": "Developer, Authority, AI Registry, EIGHT Dev Core and event workshop access.",
          "href": "/admin/control-center#workshops"
        },
        {
          "label": "EIGHT AI",
          "detail": "Direct Administration interaction with EIGHT and its Scroll.",
          "href": "/admin/control-center#eight"
        },
        {
          "label": "Client Build Catalog",
          "detail": "Control Client build systems and pricing.",
          "href": "/admin/client-build-catalog"
        },
        {
          "label": "Authority Workshop",
          "detail": "Institutional structures and authority.",
          "href": "/authority/workshops"
        },
        {
          "label": "Development Foundry",
          "detail": "Eight and persistent coding agents developing WEAVE against the real source.",
          "href": "/admin/development-agents"
        },
        {
          "label": "Developer Workshop",
          "detail": "Develop and refine WEAVE systems.",
          "href": "/admin/dev-workshop"
        },
        {
          "label": "Origin Systems",
          "detail": "Inspect origin runtime and system foundations.",
          "href": "/admin/origin-systems"
        },
        {
          "label": "Enterprise Systems Workshop",
          "detail": "Million-scale software, hardware and infrastructure systems.",
          "href": "/admin/enterprise-systems"
        },
        {
          "label": "Infrastructure",
          "detail": "Cloud Run, runtime and maintenance control.",
          "href": "/admin/infrastructure"
        },
        {
          "label": "Visual Systems \u00b7 Interaction in Motion",
          "detail": "Govern live Flame, River, route current, emergence and visual runtime with history and rollback.",
          "href": "/admin/visual-systems"
        },
        {
          "label": "Environment Organizer",
          "detail": "Withdraw, restore and reorder registered cards and pages without deleting source.",
          "href": "/admin/environment-organizer"
        },
        {
          "label": "Loop Workshop",
          "detail": "Create and publish company loops.",
          "href": "/admin/loop-workshop"
        },
        {
          "label": "DJ Workshop",
          "detail": "System sound and live atmosphere.",
          "href": "/admin/dj-workshop"
        },
        {
          "label": "Ad Workshop",
          "detail": "Role-targeted communication without deployment.",
          "href": "/admin/ad-workshop"
        }
      ]
    },
    {
      "key": "participation",
      "name": "Communication & Events",
      "subtitle": "COMMUNICATION & EVENTS",
      "purpose": "Communication & Events.",
      "accent": "#7dd3fc",
      "places": [
        {
          "label": "Company Loops",
          "detail": "Shared company movement visible across WEAVE.",
          "href": "/company/loops"
        },
        {
          "label": "Company Guidance",
          "detail": "Use the shared company clarification channel.",
          "href": "/company-chat"
        },
        {
          "label": "Private Lounge",
          "detail": "Enter private WEAVE communication.",
          "href": "/lounge?view=private"
        },
        {
          "label": "Lounge",
          "detail": "Enter the shared WEAVE communication space.",
          "href": "/lounge"
        },
        {
          "label": "Echo",
          "detail": "Use the WEAVE Echo surface.",
          "href": "/echo"
        },
        {
          "label": "Contest",
          "detail": "Enter shared participant contest movement.",
          "href": "/arena"
        },
        {
          "label": "Pattern",
          "detail": "Enter shared system pattern play.",
          "href": "/casino"
        },
        {
          "label": "Stream",
          "detail": "Enter the shared WEAVE media stream.",
          "href": "/video-feed"
        },
        {
          "label": "Loop 1 Ground",
          "detail": "Enter the current shared WEAVE event ground.",
          "href": "/event"
        },
        {
          "label": "Message Hub",
          "detail": "People, Client and staff communication.",
          "href": "/admin/hub"
        },
        {
          "label": "Client Messages",
          "detail": "Direct Client communication records.",
          "href": "/admin/client-messages"
        },
        {
          "label": "Campaign Flame",
          "detail": "Campaign construction and coordinated movement.",
          "href": "/admin/campaign-flame"
        },
        {
          "label": "Flame Event \u00b7 Loop 1",
          "detail": "Event-world control and opening movement.",
          "href": "/admin/flame-event"
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
