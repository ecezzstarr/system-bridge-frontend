/** Administration workplace catalog: real pre-existing routes, not replacement systems. */
export type AdminSpaceId='desk'|'people'|'finance'|'operations'|'systems'
export type AdminStation={title:string;href:string;description:string;officialImage?:string}
export type AdminSpace={id:AdminSpaceId;title:string;purpose:string;stations:readonly AdminStation[]}
export const ADMIN_SPACES:readonly AdminSpace[]=[
  {id:"desk",title:"Command Desk",purpose:"Review the institution, real alerts, decisions and verified activity.",stations:[
  {
    "title": "Original Administration World",
    "href": "/admin/dashboard",
    "description": "Enter the unchanged Administration district world."
  },
  {
    "title": "Administration Control Center",
    "href": "/admin/control-center",
    "description": "Open the current institutional controls and company authority."
  },
  {
    "title": "Orders & Payment Alerts",
    "href": "/admin/orders",
    "description": "Inspect recorded order alerts and payment exceptions."
  },
  {
    "title": "Employment Applications",
    "href": "/admin/employment-applications",
    "description": "Review applications across supported company employment tracks."
  },
  {
    "title": "Client Communication",
    "href": "/admin/client-messages",
    "description": "Continue recorded messages with Clients and their authorized support."
  },
  {
    "title": "Company Guidance",
    "href": "/admin/company-guidance",
    "description": "Oversee actual departmental guidance and support conversations."
  },
  {
    "title": "Access Recovery",
    "href": "/admin/access-recovery",
    "description": "Review account access recovery through authorized controls."
  },
  {
    "title": "Departmental Authorization",
    "href": "/admin/departmental-registration",
    "description": "Issue official codes and process documented departmental requests."
  },
  {
    "title": "Environment Organizer",
    "href": "/admin/environment-organizer",
    "description": "Choose which authorized operating surfaces are visible."
  },
  {
    "title": "Legacy Communication Entrance",
    "href": "/admin/hub",
    "description": "Open the existing Company Communication route through its preserved legacy entrance."
  },
  {
    "title": "Legacy Administration Functions",
    "href": "/admin/functions",
    "description": "Open the preserved legacy functions entrance to the Administration World."
  }
]},
  {id:"people",title:"People & Employment",purpose:"Manage people, applications, Client work and appointments.",stations:[
  {
    "title": "Agent Channel Approval",
    "href": "/admin/agent-channels",
    "description": "Approve or reject Agent communication authority per channel."
  },
  {
    "title": "Development Agents",
    "href": "/admin/development-agents",
    "description": "Review appointed development personnel and their work."
  },
  {
    "title": "Distribution Employment",
    "href": "/admin/distribution-employment",
    "description": "Appoint eligible distribution managers and assistants."
  },
  {
    "title": "Food Distribution Employment",
    "href": "/admin/food-distribution-employment",
    "description": "Verify Agent food distribution employment applications."
  },
  {
    "title": "Guidance Personnel",
    "href": "/admin/guidance-staff",
    "description": "Approve staff for Mandate, Forensics and Attorney guidance."
  },
  {
    "title": "Regional Manager Applications",
    "href": "/admin/regional-manager-applications",
    "description": "Review ordinary Bridger/Agent regional supervision applications without File Folders."
  },
  {
    "title": "Pro Regional Manager Applications",
    "href": "/admin/pro-regional-manager-applications",
    "description": "Review Agent and Bridger Pro position applications and independently agreed staff terms."
  },
  {
    "title": "Client Staff Offers",
    "href": "/admin/client-staff-offers",
    "description": "Manage Client staff offers and documented employment terms."
  },
  {
    "title": "Legion Releases",
    "href": "/admin/legion-releases",
    "description": "Review exclusive Client Legion exits and restored roles."
  },
  {
    "title": "File Folder Sales Management",
    "href": "/admin/file-folder-sales-manager",
    "description": "Inspect verified File Folder sales-manager work."
  },
  {
    "title": "Bridge AI Oversight",
    "href": "/admin/bridge-ai",
    "description": "Oversee Bridger Bridge AI reports and related activities."
  },
  {
    "title": "Bridge Templates",
    "href": "/admin/bridge-templates",
    "description": "Maintain company-approved prospect introduction templates."
  },
  {
    "title": "Prospect Engine",
    "href": "/admin/prospect-engine",
    "description": "Publish and organize prospects offered to Bridgers."
  },
  {
    "title": "Number Engine",
    "href": "/admin/bridger-numbers",
    "description": "Manage country number inventory and delivery requests."
  }
]},
  {id:"finance",title:"Finance & Commerce",purpose:"Work from actual deposits, ledgers, payment evidence and verified Client commerce.",stations:[
  {
    "title": "Agent Yield Registry",
    "href": "/admin/payments",
    "description": "Review Agent yield and settlement states."
  },
  {
    "title": "Paystack Integration Workshop",
    "href": "/admin/paystack-integration-workshop",
    "description": "Configure the live payment integration and test verified callbacks."
  },
  {
    "title": "Client Deposits",
    "href": "/admin/client-deposits",
    "description": "Verify deposited value before crediting the Client."
  },
  {
    "title": "Client Vault",
    "href": "/admin/client-vault",
    "description": "Review authorized Client vault movements and withdrawals."
  },
  {
    "title": "Customer Door Settlements",
    "href": "/admin/customer-door-settlements",
    "description": "Settle verified public Customer Door purchases."
  },
  {
    "title": "Carrier Food Payments",
    "href": "/admin/carrier-food-payments",
    "description": "Verify Agent food Carrier customer-payment evidence."
  },
  {
    "title": "Food Escrow",
    "href": "/admin/food-escrow",
    "description": "Review held food value and supported settlement."
  },
  {
    "title": "Subscription Records",
    "href": "/admin/subscriptions",
    "description": "Audit recorded subscription payment states."
  },
  {
    "title": "Flame Coin Sales",
    "href": "/admin/weave-flame-coin-sales",
    "description": "Manage confirmed Flame Coin purchase operations."
  },
  {
    "title": "TRX Sales",
    "href": "/admin/weave-trx-sales",
    "description": "Review documented TRX sales and exchange movement."
  },
  {
    "title": "Client Folder Upgrades (Legacy Register)",
    "href": "/admin/client-folder-upgrades",
    "description": "Historical Client File Folder records and File Number preparation; old loan collection is retired."
  },
  {
    "title": "Pro Folder Activation · Forensics",
    "href": "/admin/pro-activations",
    "description": "Review signed Pro agreements, Client business plans and manually verified one-time 680 USDT TRC-20 payments."
  },
  {
    "title": "Pro File Number Verification · Forensics",
    "href": "/admin/pro-file-number-verifications",
    "description": "Review passwordless Pro recipient File Numbers, signed business plans and independently confirmed TRC-20 payments."
  },
  {
    "title": "CJ Crypto Exchange Review",
    "href": "/admin/cj-exchange",
    "description": "Review independently evidenced CJ Dorado exchange operations without executing trades."
  },
  {
    "title": "Enterprise Dream",
    "href": "/admin/enterprise-dream",
    "description": "Manage Lord and Lady enterprise operations."
  },
  {
    "title": "Enterprise Systems",
    "href": "/admin/enterprise-systems",
    "description": "Review approved enterprise-grade technologies."
  },
  {
    "title": "System Store",
    "href": "/admin/system-store",
    "description": "Manage systems offered through the company store."
  },
  {
    "title": "File Folder Build Catalog",
    "href": "/admin/client-build-catalog",
    "description": "Publish materials and build components available to Clients."
  }
]},
  {id:"operations",title:"Products & Distribution",purpose:"Operate the real WEAVE product lines, stock, fulfillment, prospects and outreach.",stations:[
  {
    "title": "Agility Production",
    "href": "/admin/agility",
    "description": "Verify Agility morning-food stock and preparation.",
    "officialImage": "/weave-food/agility.jpeg"
  },
  {
    "title": "Electrolyte Production",
    "href": "/admin/electrolyte",
    "description": "Verify Electrolyte bowl orders and production.",
    "officialImage": "/weave-food/electrolyte.jpeg"
  },
  {
    "title": "Ember Production",
    "href": "/admin/ember",
    "description": "Verify Ember evening-food orders and delivery.",
    "officialImage": "/weave-food/ember.jpg"
  },
  {
    "title": "Daisy Pastries",
    "href": "/admin/cakes",
    "description": "Review official Daisy Pastries production requests.",
    "officialImage": "/weave-food/daisy-pastries.jpg"
  },
  {
    "title": "Food Bridge",
    "href": "/admin/food-bridge",
    "description": "Coordinate the existing food supply and support movement."
  },
  {
    "title": "Food Preparation Management",
    "href": "/admin/food-preparation-manager",
    "description": "Assign real food-preparation orders and staff handoffs."
  },
  {
    "title": "Email Prospect Engine",
    "href": "/admin/email-outreach",
    "description": "Manage authorized email prospect inventory and sending."
  },
  {
    "title": "Outreach Oversight",
    "href": "/admin/outreach",
    "description": "Review the company's active outreach operations."
  },
  {
    "title": "Distribution Studio",
    "href": "/admin/distribution-studio",
    "description": "Manage marketing distribution, social access requests and verified reach."
  }
]},
  {id:"systems",title:"Systems, Media & Loops",purpose:"Maintain deployments, the 3D world, security, media and the distinct company event.",stations:[
  {
    "title": "Infrastructure Workshop",
    "href": "/admin/infrastructure",
    "description": "Inspect infrastructure, Divine Shield and server authority."
  },
  {
    "title": "Release Workshop",
    "href": "/admin/release-workshop",
    "description": "Review release candidates, deployments, rollback and records."
  },
  {
    "title": "Deployment Records",
    "href": "/admin/deployment-records",
    "description": "View actual past production movements."
  },
  {
    "title": "Origin Systems",
    "href": "/admin/origin-systems",
    "description": "Review existing Origin system infrastructure."
  },
  {
    "title": "Development Workshop",
    "href": "/admin/dev-workshop",
    "description": "Operate the existing development workshop."
  },
  {
    "title": "Administration Workshop",
    "href": "/admin/workshop",
    "description": "Open the original Administration workshop."
  },
  {
    "title": "Visual Systems",
    "href": "/admin/visual-systems",
    "description": "Control approved visual systems and environments."
  },
  {
    "title": "File Folder World Releases",
    "href": "/admin/file-folder-world-releases",
    "description": "Review released Client 3D worlds."
  },
  {
    "title": "Loader Workshop",
    "href": "/admin/loader-workshop",
    "description": "Control the loader briefing and company entrance experience."
  },
  {
    "title": "Loop Workshop",
    "href": "/admin/loop-workshop",
    "description": "Create and manage company events and their role instructions."
  },
  {
    "title": "Flame Event Authority",
    "href": "/admin/flame-event",
    "description": "Manage the separate Burning River event environment."
  },
  {
    "title": "Flame Campaign",
    "href": "/admin/campaign-flame",
    "description": "Prepare official Flame Event promotions."
  },
  {
    "title": "Music Studio",
    "href": "/admin/music-studio",
    "description": "Manage authorized original media in the music studio."
  },
  {
    "title": "DJ Workshop",
    "href": "/admin/dj-workshop",
    "description": "Set DJ tracks, playlists and broadcasting."
  },
  {
    "title": "Advertising Workshop",
    "href": "/admin/ad-workshop",
    "description": "Manage company advertising creatives and distribution."
  },
  {
    "title": "Video Ad Workshop",
    "href": "/admin/video-ad-workshop",
    "description": "Prepare official company video advertisements."
  },
  {
    "title": "River Call Settings",
    "href": "/admin/river-call-settings",
    "description": "Manage AI telephone outreach policy and settings."
  },
  {
    "title": "Company Loops",
    "href": "/company/loops",
    "description": "Read the current company loop schedule."
  },
  {
    "title": "Flame Event World",
    "href": "/event",
    "description": "Visit the separate Burning River event ground."
  },
  {
    "title": "Direct Communications",
    "href": "/communications",
    "description": "Continue authorized company conversation."
  },
  {
    "title": "Settings",
    "href": "/settings",
    "description": "Maintain authorized Administration account preferences."
  }
]},
] as const
export const ADMIN_PRESERVED_LEGACY_ROUTES=['/admin','/admin/functions','/admin/hub'] as const
