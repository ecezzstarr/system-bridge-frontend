import {AGENT_SPACES} from '@/lib/agent-workplace-catalog'
import {BRIDGER_WORKPLACE_SPACES} from '@/lib/bridger-workplace-catalog'
import {ADMIN_SPACES} from '@/lib/admin-workplace-catalog'
import {getRolePlaces} from '@/lib/weave-role-districts'

type PageCopy={title:string;purpose:string}
const pages=new Map<string,PageCopy>()
const normalize=(route:string)=>route.split(/[?#]/)[0].replace(/\/+$/,'')||'/'
const add=(route:string,title:string,purpose:string)=>{
  const key=normalize(route)
  if(!pages.has(key))pages.set(key,{title,purpose})
}
// Navigation, search and the loader share the actual workplace descriptions.
// This directory grants no access and contains no account or business records.
for(const space of AGENT_SPACES)for(const item of space.stations)add(item.href,item.title,item.description)
for(const space of BRIDGER_WORKPLACE_SPACES)for(const item of space.places)add(item.href,item.label,item.detail)
for(const space of ADMIN_SPACES)for(const item of space.stations)add(item.href,item.title,item.description)
for(const role of ['agent','bridger','client','admin'])for(const item of getRolePlaces(role))add(item.href,item.label,item.detail)

const entrances:readonly (readonly [string,string,string])[]=[
  ['/','The Company of Time','Give your work a place and your dreams a living form through the people, services and systems of Weave.'],
  ['/admin','Administrations · A Time','Return to your company responsibilities, decisions and working records.'],
  ['/agent/dashboard','Stability · Your Workplace','Serve customers, supply outlets and carry today’s work forward through your Agent systems.'],
  ['/agent/functions','Stability · Working Systems','Find the product, service or record you need for the next part of your work.'],
  ['/agent/store','Stability · Product Store','Explore the company products and check current ordering and delivery requirements.'],
  ['/agent/bridge-radiance','Bridge of Radiance · Stability','Support the conversations and Client work connected to your assigned Bridgers.'],
  ['/agent-chat/[clientId]/[position]','Client Conversation','Continue the conversation with the Client and company position assigned to this room.'],
  ['/authority','Weave Authority','Review the company structures, responsibilities and decisions available to your position.'],
  ['/bridger/bridge-radiance','Bridge of Radiance · Hope','Help an interested person understand Weave and choose their next step.'],
  ['/bridger/clients','Client Relationships','Return to the people you have introduced and the Client relationships you support.'],
  ['/bridger/dashboard','Hope · Your Workplace','Find a prospect, open a useful conversation and guide an informed crossing into Weave.'],
  ['/bridger/video-studio','Hope · Video Studio','Build your permanent collection of paid live backgrounds and face looks before entering a private video conversation.'],
  ['/bridger/functions','Hope · Outreach Instruments','Choose the outreach instrument, conversation or support record your work needs.'],
  ['/bridger/subscription','Bridger Participation','Continue your core Bridger work and review the separate terms of optional instruments.'],
  ['/casino','Pattern Ground','Review the participation rules, eligibility and stakes before entering a game.'],
  ['/client/enterprise/legions','Enterprise Legions','Review available people and arrange authorized employment under the Client agreement.'],
  ['/client-interactions','Client Conversations','Open the Client relationship that needs a reply, clarification or a useful next step.'],
  ['/clients','Client Relationships','Keep each Client’s conversations, needs and company support together.'],
  ['/company-chat/[position]','Company Guidance','Speak with the company position responsible for your question and follow the response.'],
  ['/dashboard','Your Weave Workplace','Return to the department, people and working systems attached to your position.'],
  ['/district/[district]','Your Working District','Choose a place in this district and continue the work available to your position.'],
  ['/image-workshop/ai','Your Previous Artwork','Return to saved artwork and review the production options available for each piece.'],
  ['/lounge','Weave Lounge','Meet the people of the company and continue the conversations available to you.'],
  ['/places','Places in Weave','Find the district, workshop or public place you want to enter.'],
  ['/private-ground','Private Conversation','Continue an authorized private conversation with its messages and shared context together.'],
  ['/roles','Your Company Position','Understand your identity, active role and the responsibilities attached to it.'],
  ['/search/cadences','Human Cadences','Discover attributed thoughts, experiences and lessons shared by their human authors.'],
  ['/system-switch/flame-event','Flame Event · Burning River','Enter the shared company event and continue through your own position.'],
  ['/video-feed','Weave Video Feed','Explore published videos and the people, services and businesses behind them.'],
  ['/video-call/[id]','WEAVE Private Video Invitation','Accept a private invitation from a Bridger, grant camera and microphone permission, and speak securely face to face. No AI or charges are involved.'],
  ['/weave/file-folder/[fileNumber]','Client File Folder','Open the File Folder linked to this File Number through the access available to your position.'],
  ['/weave/lifestyles/pro-regional-manager','Pro Regional Manager','Review the separate company appointment, Pro File Folder and business-plan requirements before applying.'],
  ['/weave/lifestyles/pro-regional-manager/activation','Pro Regional Manager Activation','Follow the approval, agreement and payment verification required to open your approved Pro workspace.'],
  ['/weave/lifestyles/pro-regional-manager/workspace','Pro Regional Manager Workspace','Direct your approved regional responsibilities and operate the business in your Pro File Folder.'],
  ['/weave','Your Place in Weave','Return to your position and choose the work you want to continue.'],
  ['/client-register','Client Registration','Establish Client access using the File Number issued to you by Weave.'],
  ['/forgot-password','Access Recovery','Recover access to your existing account through the verification route available here.'],
  ['/login','Welcome to Weave','Sign in to return to your department and continue your work.'],
  ['/manager/login','Manager Access','Sign in with your existing account to return to your approved management responsibilities.'],
  ['/manager/register','Manager Application','Read the position requirements and apply through your existing company identity.'],
  ['/register','Your Beginning in Weave','Choose your department, understand its work and complete the entry requirements.'],
  ['/reset-password','Restore Your Access','Complete the password recovery process and return to your existing account.'],
  ['/bridge/[code]','Bridge of Radiance','Begin with what you know, what you need and the business you hope to build.'],
  ['/carrier/ace/[matchId]','Ace · Public Match','Review the published match and its participation rules.'],
  ['/carrier/food/[code]/bridger','Hope · Your Beginning','Understand Bridger outreach and the steps from a useful conversation to an informed Client choice.'],
  ['/carrier/food/[code]','Weave Food · Customer Door','Explore this Agent’s published food offer and follow the order and payment instructions.'],
  ['/client/admin-chat','Client Company Support','Speak with Administrations about your File Folder, account or company responsibilities.'],
  ['/client/arena','Client Arena','Review the available activities and their eligibility before participating.'],
  ['/client/casino','Client Pattern Ground','Read the game rules and stakes before choosing to participate.'],
  ['/client/chat/[position]','Client Support Conversation','Continue your conversation with the company position responsible for this work.'],
  ['/client/dashboard','Dream Lovely · Your Business','Return to your File Folder, welcome customers and guide your business’s next step.'],
  ['/client/district/[district]','Your Business District','Enter the workshop, service or record connected to this part of your business.'],
  ['/client/functions','Your Business Systems','Find the systems, customer services and records available in your Client account.'],
  ['/client/login','Return to Your Business','Sign in with your File Number and password to continue your work.'],
  ['/client','Dream Lovely · Client Entrance','Return to your Client account or begin with your issued File Number.'],
  ['/client/pro-activation','Pro File Folder Verification','Review your issued File Number, company appointment and the verification required for activation.'],
  ['/client/pro-verification','Pro Regional Manager · Verification','Name your business, submit its plan and follow the approval and one-time activation process.'],
  ['/client/register','Your Business Begins Here','Connect your issued File Number with your Client identity and secure access details.'],
  ['/client/staff-workspace','Your Company Position','Review your approved Client staff appointment, agreed salary terms and assigned company work.'],
  ['/client/system-switch','Your Private File Folder','Beyond System Switch, a verified Client enters their own private File Folder. Direct construction, commissioned systems, customer offers and business records under your ownership.'],
  ['/client/system-switch/flame-event','Flame Event · Dream Lovely','Enter Burning River and discover the company’s shared work before returning to your File Folder.'],
  ['/client-login','Client Access','Return to your Client account with your issued File Number and password.'],
  ['/download','Weave on Your Device','Install Weave on a supported device and keep your company workplace close at hand.'],
  ['/enterprise/[slug]','Client Enterprise','Explore this enterprise’s published systems, offers and customer entrances.'],
  ['/enterprise','Enterprise Territory','Discover Client enterprises and the public doors they have commissioned.'],
  ['/file-folder','Your File Folder','Choose the environment for your business and review its purchase and verification requirements.'],
  ['/file-folder-preview','The File Folder Collection','Explore Standard, Pro, Premium and Plus: distinct places for the business you are building.'],
  ['/flame-event','Burning River · The River that Burns','Enter the current company event and discover the work carried by its people and departments.'],
  ['/flame-event/world','Burning River · Open World','Explore the shared event world, public Client places and published Customer Doors.'],
  ['/image-service/[code]','Image Production · Customer Door','Describe the work you need and send your request to this producer under the displayed terms.'],
  ['/lifestyle','Work and Lifestyle','Explore company positions, services and participation paths, each with its own eligibility and terms.'],
  ['/market/[slug]','Client Customer Door','Explore the business’s published products and services, then follow its ordering instructions.'],
  ['/market','Weave Customer Market','Discover Client businesses, visit open Customer Doors and find the work they offer.'],
  ['/privacy','Your Privacy in Weave','Read how Weave handles information, account access and the records created through participation.'],
  ['/river/connect','River · Company Guidance','Tell River what you want to understand and continue from the guidance available to your position.'],
  ['/store/[slug]','Client Store','Explore this published Client storefront and its available offers.'],
  ['/stream/[slug]','Client Streaming Channel','Watch this Client’s published channel and review the broadcasts available here.'],
  ['/stream','Weave Stream Network','Discover public channels commissioned inside Client File Folders.'],
  ['/system-store/[slug]','Client System Offer','Inspect the published system, its capabilities and the terms attached to the offer.'],
  ['/system-switch/bridge-radiance/flame-coin','System Switch Purchase','Review the current company quote and follow the payment and verification instructions.'],
  ['/system-switch/bridge-radiance/trx','System Switch Purchase','Continue through the company’s supported purchase and verification route.'],
  ['/system-switch/customer-doors/[slug]','Client Customer Door','Visit the Client’s published offer; private systems remain under their owner’s control.'],
  ['/system-switch/customer-doors','Open Customer Doors','Discover the Client businesses that have opened a public entrance.'],
  ['/system-switch/world','File Folder Open World','Explore public Client places and enter only the private systems available to your position.'],
  ['/terms','Terms of Participation','Read the rights, responsibilities and conditions that govern your use of Weave.'],
  ['/video-service/[code]','Video Production · Customer Door','Share your brief and follow this producer’s quoted scope, payment and delivery terms.'],
  ['/weave-register','Your Beginning in Weave','Choose the company position that fits your work and review its entry requirements.'],
]
for(const [route,title,purpose] of entrances)pages.set(route,{title,purpose})
const dynamic=[...pages].filter(([route])=>route.includes('[')).map(([route,copy])=>({
  pattern:new RegExp('^'+route.split('/').map(part=>part.startsWith('[')?'[^/]+':part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('/')+'$'),copy,
}))
export function weavePageCopyForPath(pathname:string):PageCopy|undefined {
  const route=normalize(pathname)
  return pages.get(route)||dynamic.find(item=>item.pattern.test(route))?.copy
}
