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

const BRIDGE={src:'/weave/bridge-of-radiance-approved-scene.svg',alt:'WEAVE approved Bridge of Radiance: water and fire crossing together'}
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

/** Existing finished immersive worlds and already illustrated food homes are untouched. */
export function WeaveExistingPageImage(){
  const pathname=usePathname()
  const visual=pathname?visions[pathname]:undefined
  if(!visual)return null
  const pictures=visual.pictures
  return <figure
    className="relative mx-auto my-3 grid w-full max-w-7xl grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] overflow-hidden rounded-2xl border border-amber-200/20 bg-[#081725] text-white shadow-[0_18px_55px_rgba(0,0,0,.19)] sm:my-5 sm:grid-cols-[minmax(0,.85fr)_minmax(0,1fr)]"
    data-weave-page-original-visual={pathname}
  >
    <div className="relative flex min-h-[150px] items-center overflow-hidden bg-[#102b3a] sm:min-h-[230px]">
      <div className="grid h-full w-full" style={{gridTemplateColumns:`repeat(${pictures.length},minmax(0,1fr))`}}>
        {pictures.map((picture,index)=><img key={picture.src} src={picture.src}
          alt={picture.alt} loading={index===0?'eager':'lazy'} decoding="async"
          className="h-full min-h-[150px] w-full object-cover object-center sm:min-h-[230px]" />)}
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
