/**
 * Company of Time · offline branding businesses.
 * A kit is an operational route, not a claim that a template automatically
 * produces income, prints physical goods, or posts to a social platform.
 */
import {findImageSample} from '@/lib/weave-image-sample-art'

export const BRANDING_KITS=[
  {id:'apparel',name:'Clothing & custom apparel',short:'T-shirts, hoodies, fashion labels and collections',sampleIds:['brand-tee-classic','brand-tee-limited','brand-hoodie-studio','runway-atelier'],audience:'Clothing labels, creators, schools and local shops',offer:'Personalized clothing concepts and ready-to-show branded merchandise',promotion:'Show an original shirt concept and invite a customer to request their own design.'},
  {id:'merch',name:'Merchandise & gift branding',short:'Tote bags, caps, mugs and phone cases',sampleIds:['brand-tote-atelier','brand-cap-original','brand-mug-personal','brand-phonecase-studio'],audience:'Events, businesses, artists and gift customers',offer:'Custom merchandise concepts for promotion, gifts and team identity',promotion:'Show the same brand applied across a matching merchandise collection.'},
  {id:'packaging',name:'Product labels & packaging',short:'Bottles, product boxes and retail launches',sampleIds:['brand-package-box','brand-package-label','essence-bottle','artisan-collection'],audience:'Food producers, skincare makers, retailers and founders',offer:'Labels and product packaging presentations for emerging businesses',promotion:'Show a before/after concept using original branding, without implying a manufactured product exists.'},
  {id:'artist',name:'Artist images & creative extensions',short:'Release covers, posters, art prints and artist merchandise',sampleIds:['brand-record-release','brand-canvas-art','studio-portrait','opening-night'],audience:'Musicians, illustrators, event organizers and independent artists',offer:'Artist promotion, original cover concepts and merchandise design',promotion:'Show a release poster and an artist tee concept as a collection.'},
  {id:'ads',name:'Business advertising studio',short:'Social campaigns, launches, menus and service posters',sampleIds:['business-launch','service-offer','fresh-supply','grand-opening'],audience:'Restaurants, shops, service providers and local businesses',offer:'Custom promotional visuals and advertising layouts for businesses',promotion:'Use a demonstration ad with a clear customer action and an owned contact link.'},
  {id:'identity',name:'Business identity & presentation',short:'Professional brand stories, events and business art',sampleIds:['citadel-office','founder-profile','chrome-studio','retail-deal'],audience:'Founders, agents, service teams and small enterprises',offer:'Consistent visual identity and professional campaign presentations',promotion:'Show one offer in a coordinated set of business visuals.'},
] as const
export type BrandingKitId=typeof BRANDING_KITS[number]['id']
export function getBrandingKit(value:string){return BRANDING_KITS.find(x=>x.id===value)||null}

export const MATERIAL_MOCKUPS=[
  {sampleId:'brand-tee-classic',title:'T-shirt front',kind:'Apparel',zone:{x:350,y:420,w:300,h:225}},
  {sampleId:'brand-tee-limited',title:'Artist T-shirt',kind:'Apparel',zone:{x:350,y:420,w:300,h:225}},
  {sampleId:'brand-hoodie-studio',title:'Hoodie',kind:'Apparel',zone:{x:371,y:400,w:258,h:205}},
  {sampleId:'brand-tote-atelier',title:'Tote bag',kind:'Merchandise',zone:{x:341,y:485,w:318,h:235}},
  {sampleId:'brand-cap-original',title:'Cap',kind:'Merchandise',zone:{x:363,y:399,w:274,h:145}},
  {sampleId:'brand-mug-personal',title:'Mug',kind:'Merchandise',zone:{x:347,y:430,w:280,h:255}},
  {sampleId:'brand-package-box',title:'Retail box',kind:'Packaging',zone:{x:505,y:445,w:225,h:280}},
  {sampleId:'brand-record-release',title:'Artist record',kind:'Artist',zone:{x:405,y:358,w:190,h:195}},
  {sampleId:'brand-canvas-art',title:'Gallery canvas',kind:'Artist',zone:{x:245,y:205,w:510,h:515}},
  {sampleId:'brand-phonecase-studio',title:'Phone case',kind:'Merchandise',zone:{x:376,y:340,w:245,h:265}},
] as const
export function materialForSample(sampleId:string){return MATERIAL_MOCKUPS.find(x=>x.sampleId===sampleId)||null}

export const BRANDING_LAUNCH_STEPS=[
  {id:'choose',title:'Choose the business you can actually deliver',help:'Choose clothing, merchandise, packaging, artist work, advertising or business identity. Start with one offer and use the included editable templates.',action:'Select a business kit'},
  {id:'prepare',title:'Make your first real example',help:'Edit the brand name, upload an artwork you own if needed, place it on the mockup and produce a watermarked preview. License a finished export before customer delivery.',action:'Produce a branded image'},
  {id:'open',title:'Open your customer service door',help:'Enter the business name, what you sell and a customer price you choose. Save the public Service Door so customers can send requests.',action:'Save and share the Service Door'},
  {id:'advertise',title:'Prepare your first truthful advertisement',help:'The company gives you an editable ad, a message and a customer link. Choose an approved channel and share it yourself. A draft is not verified reach.',action:'Create and share an ad'},
  {id:'deliver',title:'Finish a customer order and record the work',help:'Review an actual request, agree a quote, license the correct production, hand over the finished file, then mark the job complete. Outside payment reports are not confirmed Weave revenue.',action:'Review customer requests'},
  {id:'scale',title:'Repeat with records and company support',help:'Use the Distribution Studio and Video Ad Studio to extend your offer. Track actual requests and completed licenses; contact your verified Manager when you need work support.',action:'Build a repeatable routine'},
] as const

const strip=(v:unknown,max:number)=>String(v??'').trim().replace(/\s+/g,' ').slice(0,max)
export function createBrandingAd(input:{businessName:string;offer:string;kitId:string;audience:string;customerDoor:string;quoteNgn:number|null}){
  const kit=getBrandingKit(input.kitId)
  if(!kit)throw new Error('Choose a valid branding business.')
  const name=strip(input.businessName,100),offer=strip(input.offer,260),audience=strip(input.audience,150)
  if(name.length<3||offer.length<8)throw new Error('Provide a business name and a real service offer.')
  if(input.quoteNgn!==null&&(!Number.isFinite(input.quoteNgn)||input.quoteNgn<0||input.quoteNgn>100000000))throw new Error('Invalid customer quote.')
  const url=strip(input.customerDoor,300)
  const price=input.quoteNgn!==null?'Indicative design quote: ₦'+input.quoteNgn.toLocaleString('en-NG')+'. Final scope and materials are confirmed with you.':'Request a quote for your own design.'
  const lines=[name+' · '+kit.name,offer,price,'For: '+(audience||kit.audience),url?'Send your project brief: '+url:'Contact us to request a design brief.']
  return lines.join('\n\n')
}
export function validateBrandingTemplates(){
  for(const kit of BRANDING_KITS)for(const id of kit.sampleIds)if(!findImageSample(id))throw new Error('Missing Image House template: '+id)
  for(const item of MATERIAL_MOCKUPS)if(!findImageSample(item.sampleId))throw new Error('Missing material mockup template: '+item.sampleId)
  return true
}
