'use client'

import {usePathname} from 'next/navigation'

/**
 * Contextual page image composed solely from existing WEAVE assets.
 * A visual is shown only when the route has a grounded, relevant source.
 * Source pictures are not evidence of live stock, delivered orders or built systems.
 * This is orientation before an operating station, not a replacement for its UI.
 */
type Visual={
  eyebrow:string
  title:string
  meaning:string
  pictures:readonly {src:string;alt:string}[]
}

const BRIDGE={src:'/weave/bridge-of-radiance-portrait.svg',alt:'WEAVE approved Bridge of Radiance: water and fire crossing together'}
const RIVER={src:'/weave/flame-event/burning-river-world.svg',alt:'WEAVE existing Burning River water and fire crossing scene'}
const AGILITY={src:'/weave-food/agility.jpeg',alt:'Original WEAVE Agility prepared food image'}
const ELECTROLYTE={src:'/weave-food/electrolyte.jpeg',alt:'Original WEAVE Electrolyte food bowl image'}
const EMBER={src:'/weave-food/ember.jpg',alt:'Original WEAVE Ember prepared food package image'}
const FAMILY={src:'/weave-food/weave-family-products.avif',alt:'WEAVE existing branded household food collection illustration'}
const DAISY={src:'/weave-food/daisy-pastries-original.png',alt:'Existing WEAVE Daisy Pastries cake image'}

const visions:Record<string,Visual>={
  '/weave/lifestyles':{
    eyebrow:'WEAVE · Ways to participate',
    title:'Lifestyle follows your position',
    meaning:'Choose an available working environment. Each opens a real function of WEAVE, not a separate account.',
    pictures:[BRIDGE,RIVER],
  },
  '/weave/lifestyles/food':{
    eyebrow:'WEAVE Lifestyle · Farm to Family',
    title:'Everyday food for households',
    meaning:'A real food catalogue begins with verified Agent supply; artwork alone does not establish available inventory.',
    pictures:[FAMILY],
  },
  '/weave/market/prospects':{
    eyebrow:'Bridger · Prospect Market',
    title:'Hope searches for human response',
    meaning:'Recognize genuine responses before guiding a person toward Client ownership.',
    pictures:[BRIDGE],
  },
  '/company/loops':{
    eyebrow:'WEAVE · Company movement',
    title:'Company loops connect participation',
    meaning:'Company Loop 1 connects real positions and daily activity inside Flame Event.',
    pictures:[RIVER],
  },
  '/referrals':{
    eyebrow:'WEAVE · Referral Movement',
    title:'Your link carries an encounter',
    meaning:'Only eligible verified participation becomes an attributed referral record.',
    pictures:[BRIDGE],
  },
  '/agent/presence':{
    eyebrow:'Agent · Stability',
    title:'Food and people move through Agents',
    meaning:'Stock, customer orders, outlet distribution and Bridger movement remain part of one Agent position.',
    pictures:[AGILITY,ELECTROLYTE,EMBER],
  },
  '/bridger/presence':{
    eyebrow:'Bridger · Hope',
    title:'Hope begins through interaction',
    meaning:'Prospect response and completed Client crossing are distinct stages of the Bridger position.',
    pictures:[BRIDGE],
  },
  '/client/presence':{
    eyebrow:'Client · File Folder ownership',
    title:'Your world begins at System Switch',
    meaning:'Bridge of Radiance opens the way; your actual Client buildings and work state are shown inside your File Folder.',
    pictures:[BRIDGE],
  },
  '/client/loops':{
    eyebrow:'Client · Company Loop',
    title:'Your enterprise participates in Weave',
    meaning:'The Flame Event connects public activities while your File Folder construction remains yours.',
    pictures:[RIVER],
  },
  '/admin/cakes':{
    eyebrow:'Administration · Daisy Pastries',
    title:'Cakes follow a real preparation flow',
    meaning:'Track the existing pastry enquiries, price decisions and confirmed orders.',
    pictures:[DAISY],
  },
  '/admin/agility':{
    eyebrow:'Administration · Agility',
    title:'Food orders lead to fulfillment',
    meaning:'Check the real product against verified preparation and stock records.',
    pictures:[AGILITY],
  },
  '/admin/electrolyte':{
    eyebrow:'Administration · Electrolyte',
    title:'A real bowl, a recorded order',
    meaning:'Keep the product image, actual stock, payments and delivery evidence distinct.',
    pictures:[ELECTROLYTE],
  },
  '/agent/outlet-training':{
    eyebrow:'Agent · Outlet training',
    title:'Know the food that outlets sell',
    meaning:'Use the existing prepared-food visuals while learning Agent carton supply.',
    pictures:[AGILITY,ELECTROLYTE,EMBER],
  },
  '/weave/lifestyles/agentic-bridger':{
    eyebrow:'WEAVE Lifestyle · Hope',
    title:'Bridger work extended by tools',
    meaning:'Prospect recognition, guided crossing and outreach remain connected to the Bridger position.',
    pictures:[BRIDGE],
  },
  '/weave/lifestyles/mandate':{
    eyebrow:'WEAVE Lifestyle · Company Guidance',
    title:'Service has responsibility',
    meaning:'Mandate, Forensics and Attorney support each require Administration approval and a defined remit.',
    pictures:[BRIDGE],
  },
  '/weave/lifestyles/legion':{
    eyebrow:'WEAVE Lifestyle · Client Enterprise',
    title:'A Legion serves a Client',
    meaning:'A Client-owned enterprise invites approved participants into its operating responsibilities.',
    pictures:[BRIDGE],
  },
  '/weave/lifestyles/food-preparation':{
    eyebrow:'WEAVE Lifestyle · Food preparation',
    title:'From approved order to prepared food',
    meaning:'The preparation team receives orders, prepares real products and moves fulfilled stock through Agents.',
    pictures:[AGILITY,ELECTROLYTE,EMBER],
  },
  '/weave/carrier':{
    eyebrow:'WEAVE Carrier · Shared movement',
    title:'Carry the activity into view',
    meaning:'Share a real Weave activity and let its authorized audience encounter it through the Carrier link.',
    pictures:[RIVER],
  },
  '/weave/carrier/food':{
    eyebrow:'WEAVE Carrier · Agent ordering',
    title:'One Agent link. Multiple real foods.',
    meaning:'Agility, Electrolyte, Ember, Daisy Pastries and approved family foods travel through the Agent order flow.',
    pictures:[AGILITY,ELECTROLYTE,EMBER],
  },
  '/agent/work':{
    eyebrow:'Agent · Stability',
    title:'These are the products you move',
    meaning:'Open each product workspace to arrange stock, customer orders, and the daily distribution of WEAVE foods.',
    pictures:[AGILITY,ELECTROLYTE,EMBER],
  },
  '/agent/distribution':{
    eyebrow:'Agent · Supply and outlets',
    title:'Stock reaches stores through Agents',
    meaning:'Purchase company stock, record receipt, then supply outlets in cartons under WEAVE distribution rules.',
    pictures:[AGILITY,ELECTROLYTE,EMBER],
  },
  '/agent/food-order':{
    eyebrow:'Agent · Agility stock',
    title:'Agility is food in movement',
    meaning:'See the prepared product before recording a real purchase, payment and receipt of stock.',
    pictures:[AGILITY],
  },
  '/agent/stability-supply':{
    eyebrow:'Agent · Stability supply',
    title:'Company supply meets field activity',
    meaning:'Recognize the available supply channels and the Bridger movement connected to your position.',
    pictures:[BRIDGE],
  },
  '/agent/bridgers':{
    eyebrow:'Agent · Bridger connections',
    title:'Stability gives Hope a path',
    meaning:'Support the Bridgers attached to your Agent position and their accountable Client-crossing movement.',
    pictures:[BRIDGE],
  },
  '/agent/channels':{
    eyebrow:'Agent · Department channels',
    title:'A channel is a responsibility',
    meaning:'Apply through Administration for authorized company duties instead of treating every channel as open access.',
    pictures:[BRIDGE],
  },
  '/bridger/bridge-ai':{
    eyebrow:'Bridger · Bridge AI',
    title:'A person first encounters the bridge',
    meaning:'Create the Client crossing path, guide a Prospect and keep the actual response linked to the Bridger.',
    pictures:[BRIDGE],
  },
  '/bridger/email-outreach':{
    eyebrow:'Bridger · Prospect outreach',
    title:'Reach out, recognize, continue',
    meaning:'An email is an invitation to interact, not yet proof of interest or a completed Client crossing.',
    pictures:[BRIDGE],
  },
  '/bridger/numbers':{
    eyebrow:'Bridger · Number Bay',
    title:'A number opens communication',
    meaning:'Choose available country numbers, request verification and use only those delivered to your position.',
    pictures:[BRIDGE],
  },
  '/bridger/subscription':{
    eyebrow:'Bridger · Continuance',
    title:'Keep Hope in movement',
    meaning:'Maintain the Bridger subscription that opens Prospect, communication and crossing activities.',
    pictures:[BRIDGE],
  },
  '/bridger/crossing-notebook':{
    eyebrow:'Bridger · Crossing Notebook',
    title:'Recognition becomes guided crossing',
    meaning:'Follow the practical movement from a Prospect response toward Client File Folder ownership.',
    pictures:[BRIDGE],
  },
  '/roles':{
    eyebrow:'WEAVE · Position and identity',
    title:'One institution, distinct responsibilities',
    meaning:'Your account identity stays yours while Administration, Agent, Bridger and Client positions perform different work.',
    pictures:[BRIDGE],
  },
  '/echo':{
    eyebrow:'WEAVE · Echo',
    title:'Intelligence follows interaction',
    meaning:'Echo helps recognize the activity already taking place in your Weave position.',
    pictures:[RIVER],
  },
  '/admin/flame-event':{
    eyebrow:'Administration · Company Loop 1',
    title:'Burning River is the event ground',
    meaning:'Administration controls the event while real Client, Agent and Bridger activities continue.',
    pictures:[RIVER],
  },
  '/admin/visual-systems':{
    eyebrow:'Administration · Visual systems',
    title:'The Weave environment is living',
    meaning:'Visual controls belong to the actual system and its role-aware entrances, not detached decoration.',
    pictures:[RIVER,BRIDGE],
  },
  '/admin/food-bridge':{
    eyebrow:'Administration · Food Bridge',
    title:'Food flows through verified work',
    meaning:'Real products, preparation, Agent movement and delivery records form the company food current.',
    pictures:[AGILITY,ELECTROLYTE,EMBER],
  },
  '/admin/food-escrow':{
    eyebrow:'Administration · Food forensics',
    title:'A completed order has evidence',
    meaning:'Follow receipts and verified food transactions without confusing a published image with actual delivery.',
    pictures:[FAMILY],
  },
  '/admin/distribution-studio':{
    eyebrow:'Administration · Distribution',
    title:'Product supply is organized here',
    meaning:'Company stock, Agents, outlets and fulfilled movements meet in the distribution workflow.',
    pictures:[AGILITY,ELECTROLYTE,EMBER],
  },
  '/admin/agent-channels':{
    eyebrow:'Administration · Company positions',
    title:'Authorize work by responsibility',
    meaning:'Channel appointments connect people to defined activities inside the institution.',
    pictures:[BRIDGE],
  },
}


// Additional WEAVE operating stations. Existing media only; no fabricated state or customers.
const additionalVisions:Record<string,Visual>={
  "/admin/access-recovery": {
    "eyebrow": "Administration · Identity",
    "title": "Access recovery protects ownership",
    "meaning": "Review verified account recovery without exposing passwords or private identities.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/system-formation.svg",
        "alt": "Existing WEAVE System Formation module illustration"
      }
    ]
  },
  "/admin/ad-workshop": {
    "eyebrow": "Administration · Public outreach",
    "title": "Publish the company message",
    "meaning": "Manage real WEAVE campaigns and their approved destinations.",
    "pictures": [
      {
        "src": "/weave/flame-event/burning-river-world.svg",
        "alt": "Existing WEAVE Burning River artwork"
      }
    ]
  },
  "/admin/bridge-ai": {
    "eyebrow": "Administration · Bridge AI",
    "title": "Guide the crossing process",
    "meaning": "Review the actual Bridge AI pathways used to help Prospects become Clients.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/admin/bridge-templates": {
    "eyebrow": "Administration · Bridge Templates",
    "title": "One bridge, consistent guidance",
    "meaning": "Maintain approved crossing templates for Bridgers and the people they guide.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/admin/campaign-flame": {
    "eyebrow": "Administration · Flame campaign",
    "title": "The Flame Event is in motion",
    "meaning": "Control communications that point people toward real Company Loop 1 activities.",
    "pictures": [
      {
        "src": "/weave/flame-event/burning-river-world.svg",
        "alt": "Existing WEAVE Burning River artwork"
      }
    ]
  },
  "/admin/client-build-catalog": {
    "eyebrow": "Administration · Client construction",
    "title": "Tools for Client-made systems",
    "meaning": "Organize actual blueprints and building components available in File Folders.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/blueprint-foundry.svg",
        "alt": "Existing WEAVE Blueprint Foundry module illustration"
      }
    ]
  },
  "/admin/client-deposits": {
    "eyebrow": "Administration · Client payments",
    "title": "Verification before wallet credit",
    "meaning": "Inspect real deposit evidence before authorizing a Client account update.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/admin/client-messages": {
    "eyebrow": "Administration · Client communication",
    "title": "Respond where the Client is",
    "meaning": "Company replies remain linked to the Client relationship and the actual request.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/customer-door.svg",
        "alt": "Existing WEAVE Client Customer Door module illustration"
      }
    ]
  },
  "/admin/client-vault": {
    "eyebrow": "Administration · Client vaults",
    "title": "Private balances have records",
    "meaning": "Client funds and transactions are controlled by verified records, not estimates.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/admin/company-guidance": {
    "eyebrow": "Administration · Company Guidance",
    "title": "One institution, accountable answers",
    "meaning": "Review requests and responses routed to authorized Weave staff.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/admin/customer-door-settlements": {
    "eyebrow": "Administration · Customer payments",
    "title": "Products connect to settlement",
    "meaning": "Audit real Customer Door payments and fulfillment before recording completion.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/admin/departmental-registration": {
    "eyebrow": "Administration · Work positions",
    "title": "Assign responsibility carefully",
    "meaning": "Review applications for defined company duties and access.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/operations-module.svg",
        "alt": "Existing WEAVE operations module illustration"
      }
    ]
  },
  "/admin/deployment-records": {
    "eyebrow": "Administration · System releases",
    "title": "Changes leave a release record",
    "meaning": "Record actual technical deployments and what became available in WEAVE.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/system-formation.svg",
        "alt": "Existing WEAVE System Formation module illustration"
      }
    ]
  },
  "/admin/dev-workshop": {
    "eyebrow": "Administration · Development",
    "title": "Build the system before release",
    "meaning": "Use the existing Weave workshop to organize technical changes.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/blueprint-foundry.svg",
        "alt": "Existing WEAVE Blueprint Foundry module illustration"
      }
    ]
  },
  "/admin/development-agents": {
    "eyebrow": "Administration · Development agents",
    "title": "Assign builds to defined work",
    "meaning": "Development assignments connect requested improvements with accountable implementation.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/ai-automation.svg",
        "alt": "Existing WEAVE AI automation module illustration"
      }
    ]
  },
  "/admin/dj-workshop": {
    "eyebrow": "Administration · Sound",
    "title": "Broadcast belongs to the world",
    "meaning": "Control the sound of shared Flame Event experiences without interrupting work.",
    "pictures": [
      {
        "src": "/weave/flame-event/burning-river-world.svg",
        "alt": "Existing WEAVE Burning River artwork"
      }
    ]
  },
  "/admin/email-outreach": {
    "eyebrow": "Administration · Prospect communication",
    "title": "Send only accountable outreach",
    "meaning": "Outreach records show actual sending, response and the next permitted action.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/admin/ember": {
    "eyebrow": "Administration · Food fulfillment",
    "title": "Ember is a real food product",
    "meaning": "Review evening food stock and orders through the existing operations flow.",
    "pictures": [
      {
        "src": "/weave-food/ember.jpg",
        "alt": "Original WEAVE Ember product image"
      }
    ]
  },
  "/admin/enterprise-dream": {
    "eyebrow": "Administration · Client enterprise",
    "title": "Enterprise grows from real systems",
    "meaning": "Review completed Client capabilities before authorizing enterprise progression.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/enterprise-expansion.svg",
        "alt": "Existing WEAVE Enterprise Expansion module illustration"
      }
    ]
  },
  "/admin/enterprise-systems": {
    "eyebrow": "Administration · Client-built systems",
    "title": "Building becomes capability",
    "meaning": "Review operating systems clients can construct and use.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/system-formation.svg",
        "alt": "Existing WEAVE System Formation module illustration"
      }
    ]
  },
  "/admin/environment-organizer": {
    "eyebrow": "Administration · Weave environment",
    "title": "One environment, organized districts",
    "meaning": "Organize where real functions appear without replacing their controllers.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/network-module.svg",
        "alt": "Existing WEAVE network systems module illustration"
      }
    ]
  },
  "/admin/file-folder-sales-manager": {
    "eyebrow": "Administration · File Folder distribution",
    "title": "A purchase opens Client ownership",
    "meaning": "Review recognized File Folder movement and authorized seller responsibilities.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/customer-door.svg",
        "alt": "Existing WEAVE Client Customer Door module illustration"
      }
    ]
  },
  "/admin/food-preparation-manager": {
    "eyebrow": "Administration · Preparation oversight",
    "title": "Orders reach the preparation team",
    "meaning": "Review preparation work, staffing and recorded dispatches.",
    "pictures": [
      {
        "src": "/weave-food/agility.jpeg",
        "alt": "Original WEAVE Agility product image"
      },
      {
        "src": "/weave-food/electrolyte.jpeg",
        "alt": "Original WEAVE Electrolyte product image"
      },
      {
        "src": "/weave-food/ember.jpg",
        "alt": "Original WEAVE Ember product image"
      }
    ]
  },
  "/admin/guidance-staff": {
    "eyebrow": "Administration · Guidance staffing",
    "title": "Assign the person who can respond",
    "meaning": "Manage who is authorized to give company support.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/operations-module.svg",
        "alt": "Existing WEAVE operations module illustration"
      }
    ]
  },
  "/admin/infrastructure": {
    "eyebrow": "Administration · Stability",
    "title": "The Weave system must remain available",
    "meaning": "Monitor deployed services and maintenance while protecting ongoing work.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/operations-module.svg",
        "alt": "Existing WEAVE operations module illustration"
      }
    ]
  },
  "/admin/legion-releases": {
    "eyebrow": "Administration · Legion employment",
    "title": "Employment has a recorded ending",
    "meaning": "Review approved Legion releases and restored position access.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/enterprise-expansion.svg",
        "alt": "Existing WEAVE Enterprise Expansion module illustration"
      }
    ]
  },
  "/admin/loop-workshop": {
    "eyebrow": "Administration · Company Loops",
    "title": "Formation precedes publication",
    "meaning": "Prepare and release the company loop that organizes real participation.",
    "pictures": [
      {
        "src": "/weave/flame-event/burning-river-world.svg",
        "alt": "Existing WEAVE Burning River artwork"
      }
    ]
  },
  "/admin/orders": {
    "eyebrow": "Administration · Order inbox",
    "title": "Every order deserves attention",
    "meaning": "Follow actual Agent, Bridger and Client order and payment alerts.",
    "pictures": [
      {
        "src": "/weave-food/agility.jpeg",
        "alt": "Original WEAVE Agility product image"
      },
      {
        "src": "/weave-food/electrolyte.jpeg",
        "alt": "Original WEAVE Electrolyte product image"
      },
      {
        "src": "/weave-food/ember.jpg",
        "alt": "Original WEAVE Ember product image"
      }
    ]
  },
  "/admin/origin-systems": {
    "eyebrow": "Administration · Weave foundation",
    "title": "One source, many functions",
    "meaning": "See how System Switch, Client activity and company operations fit together.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/admin/outreach": {
    "eyebrow": "Administration · Outreach",
    "title": "Move the message to people",
    "meaning": "Company outreach follows approved destinations and the resulting response.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/admin/payments": {
    "eyebrow": "Administration · Payment records",
    "title": "Value is recorded and verified",
    "meaning": "Keep payments linked to valid transaction evidence and approvals.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/admin/prospect-engine": {
    "eyebrow": "Administration · Prospects",
    "title": "A possible relationship is not yet a Client",
    "meaning": "Manage actual prospect distribution and resulting responses.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/admin/subscriptions": {
    "eyebrow": "Administration · Continuance",
    "title": "Access follows its real status",
    "meaning": "Track subscription activity and permitted account access.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/admin/system-store": {
    "eyebrow": "Administration · Store control",
    "title": "A system purchase must be fulfilled",
    "meaning": "Review verified store orders and published system availability.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/system-formation.svg",
        "alt": "Existing WEAVE System Formation module illustration"
      }
    ]
  },
  "/admin/video-ad-workshop": {
    "eyebrow": "Administration · Creative work",
    "title": "Visuals accompany real businesses",
    "meaning": "Prepare customer video advertisements without inventing product claims.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/blueprint-foundry.svg",
        "alt": "Existing WEAVE Blueprint Foundry module illustration"
      }
    ]
  },
  "/admin/weave-flame-coin-sales": {
    "eyebrow": "Administration · Flame Coin sales",
    "title": "Payment and credit need evidence",
    "meaning": "Verify the real Flame Coin purchase flow before recording a balance.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/admin/weave-trx-sales": {
    "eyebrow": "Administration · Exchange desk",
    "title": "Purchases require clear settlement",
    "meaning": "Record supported payment evidence before releasing digital value.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/admin/workshop": {
    "eyebrow": "Administration · Workbench",
    "title": "Organize the work of WEAVE",
    "meaning": "Use the institution's existing workshops for real operating changes.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/operations-module.svg",
        "alt": "Existing WEAVE operations module illustration"
      }
    ]
  },
  "/agent/bridge-radiance": {
    "eyebrow": "Agent · Bridge",
    "title": "Carry the Client crossing forward",
    "meaning": "Follow an actual Client referral without taking ownership of their File Folder.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/agent/commissions": {
    "eyebrow": "Agent · Earned commission",
    "title": "Value follows verified participation",
    "meaning": "Commission is calculated from real qualifying activity, not impressions.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/agent/creative": {
    "eyebrow": "Agent · Visual creation",
    "title": "Show the product a customer can buy",
    "meaning": "Create advertising from the existing WEAVE product and business assets.",
    "pictures": [
      {
        "src": "/weave-food/agility.jpeg",
        "alt": "Original WEAVE Agility product image"
      },
      {
        "src": "/weave-food/electrolyte.jpeg",
        "alt": "Original WEAVE Electrolyte product image"
      },
      {
        "src": "/weave-food/ember.jpg",
        "alt": "Original WEAVE Ember product image"
      }
    ]
  },
  "/agent/store": {
    "eyebrow": "Agent · Product stock",
    "title": "Stock becomes an orderable product",
    "meaning": "Keep Agent inventory and the daily sale of actual WEAVE foods connected.",
    "pictures": [
      {
        "src": "/weave-food/agility.jpeg",
        "alt": "Original WEAVE Agility product image"
      },
      {
        "src": "/weave-food/electrolyte.jpeg",
        "alt": "Original WEAVE Electrolyte product image"
      },
      {
        "src": "/weave-food/ember.jpg",
        "alt": "Original WEAVE Ember product image"
      }
    ]
  },
  "/authority": {
    "eyebrow": "WEAVE · Authority",
    "title": "Work within defined authority",
    "meaning": "Real responsibility and approved boundaries determine what can be done.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/operations-module.svg",
        "alt": "Existing WEAVE operations module illustration"
      }
    ]
  },
  "/authority/workshops": {
    "eyebrow": "WEAVE · Authority workshops",
    "title": "Formation follows permitted work",
    "meaning": "The workshop turns authorized decisions into accountable movement.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/blueprint-foundry.svg",
        "alt": "Existing WEAVE Blueprint Foundry module illustration"
      }
    ]
  },
  "/client-interactions": {
    "eyebrow": "WEAVE · Client relationship",
    "title": "Interaction creates practical next steps",
    "meaning": "Move from a real Client request to the function that can serve it.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/customer-door.svg",
        "alt": "Existing WEAVE Client Customer Door module illustration"
      }
    ]
  },
  "/client/enterprise/legions": {
    "eyebrow": "Client · Enterprise Legions",
    "title": "Client-owned work creates positions",
    "meaning": "Legion assignments belong to the Client enterprise and its authorized operations.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/enterprise-expansion.svg",
        "alt": "Existing WEAVE Enterprise Expansion module illustration"
      }
    ]
  },
  "/clients": {
    "eyebrow": "WEAVE · Client records",
    "title": "A Client owns the business",
    "meaning": "The Client relationship supports ownership, purchases and practical use.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/customer-door.svg",
        "alt": "Existing WEAVE Client Customer Door module illustration"
      }
    ]
  },
  "/communications": {
    "eyebrow": "WEAVE · Communication",
    "title": "The conversation continues",
    "meaning": "Reach a real participant through the communication channel available to your position.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/company-chat": {
    "eyebrow": "WEAVE · Company Guidance",
    "title": "Position-aware support",
    "meaning": "Ask the appropriate staff department about work inside WEAVE.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/distribution-studio": {
    "eyebrow": "WEAVE · Social presence",
    "title": "Make actual activity visible",
    "meaning": "Publish communication connected to real Weave functions and their audience.",
    "pictures": [
      {
        "src": "/weave/flame-event/burning-river-world.svg",
        "alt": "Existing WEAVE Burning River artwork"
      }
    ]
  },
  "/fund-wall": {
    "eyebrow": "WEAVE · Family support",
    "title": "Care has accountable records",
    "meaning": "Record family support payments and their intended beneficiaries.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/ledger": {
    "eyebrow": "WEAVE · Transaction ledger",
    "title": "Every movement leaves evidence",
    "meaning": "Review recorded economic movements and their verified origin.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/lounge": {
    "eyebrow": "WEAVE · Conversation",
    "title": "People meet through participation",
    "meaning": "Continue approved conversations and shared movement.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/manager/dashboard": {
    "eyebrow": "WEAVE · Distribution management",
    "title": "Daily work needs clear oversight",
    "meaning": "Coordinate real operating responsibilities and distribution records.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/operations-module.svg",
        "alt": "Existing WEAVE operations module illustration"
      }
    ]
  },
  "/marketplace": {
    "eyebrow": "WEAVE · Enterprise Systems",
    "title": "Systems become available for use",
    "meaning": "Explore Client-building capabilities without treating previews as completed installations.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/system-formation.svg",
        "alt": "Existing WEAVE System Formation module illustration"
      }
    ]
  },
  "/private-ground": {
    "eyebrow": "WEAVE · Private activity",
    "title": "Private space stays protected",
    "meaning": "This operating ground is controlled by actual account authorization.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/profiles": {
    "eyebrow": "WEAVE · Presences",
    "title": "People carry their own activities",
    "meaning": "Locate available participant profiles and the activity they choose to make public.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/receipts": {
    "eyebrow": "WEAVE · Receipts",
    "title": "Evidence belongs to each payment",
    "meaning": "Use recorded receipts to understand what was paid, approved and fulfilled.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/search": {
    "eyebrow": "WEAVE · Find a place",
    "title": "Navigate the operating system",
    "meaning": "Find real people, districts and available workspaces in the Weave environment.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/network-module.svg",
        "alt": "Existing WEAVE network systems module illustration"
      }
    ]
  },
  "/settings": {
    "eyebrow": "WEAVE · Preferences",
    "title": "Control your own account",
    "meaning": "Adjust the settings that apply to your authenticated identity.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/operations-module.svg",
        "alt": "Existing WEAVE operations module illustration"
      }
    ]
  },
  "/video-ad-studio": {
    "eyebrow": "WEAVE · Creative studio",
    "title": "Create what customers can recognize",
    "meaning": "Produce media from real Client and company product material.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/blueprint-foundry.svg",
        "alt": "Existing WEAVE Blueprint Foundry module illustration"
      }
    ]
  },
  "/video-feed": {
    "eyebrow": "WEAVE · Published video",
    "title": "Watch real available activity",
    "meaning": "Media becomes meaningful through its real source and permission to publish.",
    "pictures": [
      {
        "src": "/weave/flame-event/burning-river-world.svg",
        "alt": "Existing WEAVE Burning River artwork"
      }
    ]
  },
  "/wallet": {
    "eyebrow": "WEAVE · Account value",
    "title": "Money remains accountable",
    "meaning": "Balances, transfers and deposits reflect real transaction records.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/wallet/deposit-withdraw": {
    "eyebrow": "WEAVE · Deposit and withdrawal",
    "title": "Payment requests are verified",
    "meaning": "Use the existing supported payment flow; illustrative artwork is not a receipt.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/weave/lifestyles/ace": {
    "eyebrow": "WEAVE Lifestyle · Ace",
    "title": "Playing is an activity in Weave",
    "meaning": "Arena and Carrier participation follow the actual subscription and game state.",
    "pictures": [
      {
        "src": "/weave/flame-event/burning-river-world.svg",
        "alt": "Existing WEAVE Burning River artwork"
      }
    ]
  },
  "/weave/lifestyles/mandate/forensic-food": {
    "eyebrow": "WEAVE · Food forensics",
    "title": "Evidence moves money correctly",
    "meaning": "Verify physical food orders before recording money distribution.",
    "pictures": [
      {
        "src": "/weave-food/agility.jpeg",
        "alt": "Original WEAVE Agility product image"
      },
      {
        "src": "/weave-food/electrolyte.jpeg",
        "alt": "Original WEAVE Electrolyte product image"
      },
      {
        "src": "/weave-food/ember.jpg",
        "alt": "Original WEAVE Ember product image"
      }
    ]
  },
  "/weave/lifestyles/mandate/inbox": {
    "eyebrow": "WEAVE · Guidance inbox",
    "title": "Reply within approved authority",
    "meaning": "Only appointed staff act on requests in their authorized department.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/operations-module.svg",
        "alt": "Existing WEAVE operations module illustration"
      }
    ]
  },
  "/weave/standing": {
    "eyebrow": "WEAVE · Standing",
    "title": "Position and contribution are recorded",
    "meaning": "Standing follows eligible work rather than decorative rank.",
    "pictures": [
      {
        "src": "/weave/bridge-of-radiance-portrait.svg",
        "alt": "Approved WEAVE Bridge of Radiance artwork"
      }
    ]
  },
  "/client/admin-chat": {
    "eyebrow": "Client · Company support",
    "title": "Your work connects to a response",
    "meaning": "Ask company staff for help while keeping ownership of your File Folder.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/customer-door.svg",
        "alt": "Existing WEAVE Client Customer Door module illustration"
      }
    ]
  },
  "/client/deposit": {
    "eyebrow": "Client · File Folder value",
    "title": "Fund the world you own",
    "meaning": "Deposit and verified credits support the actual systems you choose to build.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  },
  "/client/functions": {
    "eyebrow": "Client · Available functions",
    "title": "Your capabilities are connected",
    "meaning": "Operate the tools that belong to your Client account and File Folder.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/system-formation.svg",
        "alt": "Existing WEAVE System Formation module illustration"
      }
    ]
  },
  "/client/settings": {
    "eyebrow": "Client · Preferences",
    "title": "Control your Client identity",
    "meaning": "Account settings protect your own operating environment.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/operations-module.svg",
        "alt": "Existing WEAVE operations module illustration"
      }
    ]
  },
  "/client/system-store": {
    "eyebrow": "Client · Build resources",
    "title": "Make the next capability practical",
    "meaning": "Choose systems and components that can be installed through the File Folder.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/blueprint-foundry.svg",
        "alt": "Existing WEAVE Blueprint Foundry module illustration"
      }
    ]
  },
  "/client/withdraw": {
    "eyebrow": "Client · Account value",
    "title": "Value leaves through verification",
    "meaning": "Withdrawals follow real balance and approval rules.",
    "pictures": [
      {
        "src": "/weave/file-folder/assets/payments-module.svg",
        "alt": "Existing WEAVE payments module illustration"
      }
    ]
  }
}

/** Existing finished immersive worlds and already illustrated food homes are untouched. */
export function WeaveExistingPageImage(){
  const pathname=usePathname()
  const visual=pathname?(visions[pathname]||additionalVisions[pathname]):undefined
  if(!visual)return null
  const pictures=visual.pictures
  return <figure
    className="relative mx-auto my-3 grid w-full max-w-7xl grid-cols-1 overflow-hidden rounded-2xl border border-amber-200/20 bg-[#081725] text-white shadow-[0_18px_55px_rgba(0,0,0,.19)] sm:my-5 sm:grid-cols-[minmax(0,.85fr)_minmax(0,1fr)]"
    data-weave-page-original-visual={pathname}
  >
    <div className="relative flex h-44 items-center overflow-hidden bg-[#102b3a] sm:h-auto sm:min-h-[230px]">
      <div className="grid h-full w-full" style={{gridTemplateColumns:`repeat(${pictures.length},minmax(0,1fr))`}}>
        {pictures.map((picture,index)=><img key={picture.src} src={picture.src}
          alt={picture.alt} loading={index===0?'eager':'lazy'} decoding="async"
          className="h-44 w-full object-cover object-center sm:h-full sm:min-h-[230px]" />)}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#081725]/40" aria-hidden="true"/>
    </div>
    <figcaption className="flex min-w-0 flex-col justify-center px-3 py-4 sm:px-8 sm:py-7">
      <p className="text-[9px] font-black uppercase tracking-[.14em] text-amber-200 sm:text-[10px]">{visual.eyebrow}</p>
      <h2 className="mt-2 text-lg font-black leading-tight tracking-tight text-white sm:text-3xl">{visual.title}</h2>
      <p className="mt-2 text-[11px] leading-[1.6] text-sky-100/85 sm:text-sm sm:leading-6">{visual.meaning}</p>
    </figcaption>
  </figure>
}
