/**
 * WEAVE Video Ad Studio · Real Work Demonstrations
 *
 * Only the steps come from WEAVE workflows. Scenes require real footage or
 * licensed photography uploaded into the owner's existing paid production.
 * Numbers are hypothetical illustrations, NEVER actual settled income.
 */
import {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
} from '@/lib/agility-catalog'
import type {VideoAdScene} from '@/lib/video-ad-workshop'

export type WorkDemoKind='agent-agility'|'bridger-outreach'|'client-customer-door'
export type WorkDemoLook='natural'|'documentary'|'cinematic'

export type WorkDemoConfig={
  kind:WorkDemoKind
  quantity:number
  examplePriceNgn:number
  look:WorkDemoLook
}

export const WEAVE_WORK_DEMOS=[
  {id:'agent-agility' as const,name:'Agent · Agility Distribution',tagline:'Order, receive, sell, record',
    detail:'Show how an Agent distributes verified received Agility stock and earns a gross resale margin only after actual sales.'},
  {id:'bridger-outreach' as const,name:'Bridger · Hope Outreach',tagline:'Connect, demonstrate, follow through',
    detail:'Show a Bridger using authorized outreach and private video conversations. A separately quoted paid studio service is only example revenue.'},
  {id:'client-customer-door' as const,name:'Client · File Folder Customer Door',tagline:'Build, list, serve, record',
    detail:'Show a Client building a working offer, opening a Customer Door, handling a paid order and recording gross sales.'},
] as const

export function sanitizeWorkDemoConfig(config:WorkDemoConfig):WorkDemoConfig{
  const kind=WEAVE_WORK_DEMOS.some(x=>x.id===config.kind)?config.kind:'agent-agility'
  const look=['natural','documentary','cinematic'].includes(config.look)?config.look:'documentary'
  const quantity=Math.min(5,Math.max(1,Math.round(Number(config.quantity)||1)))
  const examplePriceNgn=Math.min(1000000,Math.max(1000,Math.round(Number(config.examplePriceNgn)||10000)))
  return {kind,look,quantity,examplePriceNgn}
}

const money=(value:number)=>'₦'+value.toLocaleString('en-NG',{maximumFractionDigits:0})
type Beat={beat:string;caption:string;direction:string;narration:string}
const shot=(beat:string,caption:string,direction:string,narration:string):Beat=>({beat,caption,direction,narration})
export function quoteWorkDemo(input:WorkDemoConfig){
  const config=sanitizeWorkDemoConfig(input)
  if(config.kind==='agent-agility'){
    const units=config.quantity*AGILITY_PACKAGES_PER_BOX
    const stockCost=config.quantity*AGILITY_AGENT_BOX_PRICE_NGN
    const revenue=units*AGILITY_RETAIL_UNIT_PRICE_NGN
    return {units,stockCost,revenue,grossMargin:revenue-stockCost,
      metric:money(revenue-stockCost)+' potential gross margin',
      note:'Hypothetical full sell-out only. Stock must be paid for, verified and received. Unsold stock, delivery and other costs reduce realized results. No income is guaranteed.'}
  }
  return {units:1,stockCost:0,revenue:config.examplePriceNgn,grossMargin:null,
    metric:money(config.examplePriceNgn)+' illustrative gross customer sale',
    note:'Illustrative customer quote, not earned funds or company pay. The customer must actually pay; studio fees, production costs, refunds and other expenses are not deducted. This is not profit.'}
}

export function buildWeaveWorkDemoScenes(source:readonly VideoAdScene[],input:WorkDemoConfig):VideoAdScene[]{
  const config=sanitizeWorkDemoConfig(input)
  const q=quoteWorkDemo(config)
  let beats:Beat[]
  if(config.kind==='agent-agility'){
    beats=[
      shot('THE PERSON','ONE AGENT. ONE WORKDAY.','Film an actual consenting Agent at a real workspace or in a recognisable business setting. Show hands opening the Stability dashboard, not a fabricated payment receipt.','A day of work begins with an Agent in Stability.'),
      shot('ORDER STOCK',money(q.stockCost)+' · '+config.quantity+' CARTON'+(config.quantity>1?'S':''),'Record the Agent selecting Agility stock inside the live WEAVE Distribution workspace. Show the authentic order screen and clearly keep demo data separate from real orders.','The Agent orders Agility stock from Weave at the published stock price.'),
      shot('VERIFY PAYMENT','ADMINISTRATIONS VERIFIES','Film a consenting employee reviewing order proof or show a clearly labeled demonstration status. Never imply a made-up bank transfer has cleared.','Preparation and release follow verified payment.'),
      shot('RECEIVE STOCK',q.units+' PACKAGES TO DISTRIBUTE','Use close-up physical footage of correctly packed Agility stock received by the Agent, filmed in daylight. The stock must be received before sale.','The Agent confirms physical receipt, then can distribute.'),
      shot('CUSTOMER DOOR','CONNECT WITH REAL BUYERS','Record the actual Carrier Customer Door or an authorized real store demonstration. If showing actors, identify the scene as simulated.','The Agent approaches customers and local outlets using Weave systems.'),
      shot('REAL SALES',money(AGILITY_RETAIL_UNIT_PRICE_NGN)+' PER PACKAGE','Show customer service, agreed sales and the proper sale record. Do not fabricate evidence of a paid order.','Each completed sale is recorded. Unsold stock does not become earned income.'),
      shot('EARNINGS EXAMPLE',money(q.grossMargin||0)+' GROSS MARGIN','Use actual working interface footage with a large readable SIMULATION overlay. Show only a hypothetical full sell-out calculation and never call this guaranteed cash earnings.','If all packages sell at the listed price, the gross margin is '+money(q.grossMargin||0)+' before other expenses.'),
      shot('THE NEXT DAY','WORK. SERVE. RECORD.','End on the real Agent workspace with an authentic record and a clear WEAVE logo or site link. No invented paid or settled status.','Weave of Presence. Work is measured by completed activity, not promises.'),
    ]
  }else if(config.kind==='bridger-outreach'){
    beats=[
      shot('HOPE','ONE BRIDGER. ONE CONNECTION.','Film a consenting Bridger opening the Hope workplace on a real phone. Show a human, not a cartoon avatar.','A Bridger opens Hope to begin useful outreach.'),
      shot('FIND PROSPECTS','DISCOVER PROSPECTS','Capture the authorized Prospect Market and a fictionalized training contact. Mask personal phone numbers and messages.','The Bridger identifies people who may want to learn more.'),
      shot('INVITE','A REAL CONVERSATION','Use a consenting scripted two-person WEAVE video call with a purchased background if available. Never show an unsuspecting guest.','A private invitation leads to a conversation, with permission.'),
      shot('DEMONSTRATE','SHOW THE SYSTEM AT WORK','Screen record the actual relevant Studio, Customer Door or File Folder demo. Do not portray a purchase or signup that has not happened.','The Bridger demonstrates how the company systems can be used.'),
      shot('OFFER A SERVICE','CUSTOMER QUOTE · '+money(q.revenue),'Film a separately agreed creative-service quote with a visibly simulated training record. This is not company-paid income and not an automatic commission.','An outside customer may choose to commission video or outreach work.'),
      shot('PRODUCTION','MAKE THE CUSTOMER VIDEO','Show real captured footage and licensed media being edited in WEAVE Video Ad Studio, with actual fee confirmation if paid.','The Bridger produces an approved service using the Studio.'),
      shot('RECORD THE ORDER','PAID ONLY WHEN VERIFIED','Show real completed work and a customer receipt only if authorized. A quote alone is not paid revenue.','Payment and delivery must be recorded; a quote is not income.'),
      shot('HOPE CONTINUES','PRESENCE BECOMES WORK','End with the Hope workplace and a real human leaving for their next task.','Weave of Presence. Your participation creates the opportunity to work.'),
    ]
  }else{
    beats=[
      shot('DREAM LOVELY','THE CLIENT HAS A DREAM','Film a consenting business owner considering their product, shop or workbench, with authentic materials.','A Client begins with an idea for a real business.'),
      shot('FILE FOLDER','BUILD THE BUSINESS SYSTEM','Screen capture the actual private File Folder build process. Do not substitute fantasy screenshots.','Inside the File Folder the Client builds a working system.'),
      shot('CUSTOMER DOOR','OPEN THE CUSTOMER DOOR','Use actual File Folder Customer Door view, showing the real offer with any example order visibly marked simulation.','The Customer Door makes the offer visible to interested customers.'),
      shot('CUSTOMER ENQUIRY','A CUSTOMER ASKS','Record a consented scripted enquiry through the correct Client business channel. Do not display real personal information.','A conversation becomes an enquiry, not yet a sale.'),
      shot('CUSTOMER ORDER','EXAMPLE SALE · '+money(q.revenue),'Use a clearly labelled fictional order for the example. Show the quote and workflow without pretending payment has cleared.','A customer may choose to place an order at the displayed price.'),
      shot('FULFILLMENT','WORK MUST BE DELIVERED','Film real creation, packaging, service delivery or digital work appropriate to the business.','The Client and employed staff complete the agreed work.'),
      shot('RECORD THE VALUE','GROSS SALE ≠ PROFIT','Show actual receipts and completion records only when verified, alongside a simulation label for the worked example.','Gross sales must still cover costs and expenses before profit exists.'),
      shot('DREAM LOVELY','BUSINESS THROUGH TIME','Close on the Client at work and their actual File Folder environment. No promised doubling or guaranteed income.','Weave of Presence. Dream Lovely. Let the work speak through time.'),
    ]
  }
  // Scene slots and total duration are fixed by the existing paid project. Map
  // the 8 production beats proportionally, retain licensed media already added.
  return source.map((scene,index)=>{
    const beat=beats[Math.min(7,Math.floor(index*beats.length/source.length))]
    return {...scene,beat:beat.beat,text:beat.caption.slice(0,160),
      visualDirection:beat.direction.slice(0,700),voiceover:beat.narration.slice(0,700),
      visualStyle:config.look}
  })
}
