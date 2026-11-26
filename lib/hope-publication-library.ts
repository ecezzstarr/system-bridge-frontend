export const departments=['Hope','Stability','Dream Lovely','A Time'] as const
export type Department=typeof departments[number]
export type Publication={id:string;department:Department;title:string;caption:string;image:string;style:number;active:boolean;original?:boolean}
const w='/images/workshops/'
const topics:Record<Department,[string,string,string][]> = {
 Hope:[
 ['Your story deserves an audience','A Bridger helps businesses introduce their work to people who may genuinely need it. What do you create?',w+'studio.webp'],
 ['Meet the Bridger','Hope is the department of publicity, meaningful conversations and prospect development. Interested in learning how the role works?','/images/hope-working-hall.webp'],
 ['From attention to conversation','A useful publication starts a conversation. Tell us what your business needs to communicate.',w+'contacts.webp'],
 ['Show what you make','A product deserves a clear explanation and a real audience. Let us explore how your business presents its work.',w+'market.webp'],
 ['Build a public presence','Consistency and useful stories help people discover your business. Explore how Hope supports public presence.',w+'bridge.webp'],
 ['Find the right audience','A prospect is a real person with a relevant need, not a number. Tell us who your business serves.',w+'contacts.webp'],
 ['Create with purpose','Social Studio connects creative publication with practical follow-up. What would you like your audience to understand?',w+'studio.webp'],
 ['A conversation is a beginning','We listen first, understand a business need and explore a suitable next step. What are you working on?',w+'bridge.webp'],
 ['Discover the File Folder','Bridgers introduce prospective Clients to Weave File Folders and their business tools. Ask for a preview.','/weave/file-folder/official/weave-pro-file-folder-official.webp'],
 ['Work through participation','Hope brings daily outreach and accountable publication together. Ask about the Bridger position.','/images/hope-working-hall.webp']],
 Stability:[
 ['From store to doorstep','Agents support physical product distribution and delivery. Tell us what you need delivered.',w+'depot.webp'],
 ['Meet the Agent','Stability connects products with real customers through physical distribution. Ask about the Agent position.',w+'market.webp'],
 ['Farm to family','Explore how producers and households can connect through practical distribution.',w+'farm.webp'],
 ['A better supply routine','Local shops need dependable supply. Tell us what products your shop needs.',w+'store.webp'],
 ['Discover Agility','Explore the Agility product and ask about availability in your area.','/public-placeholder'.replace('/public-placeholder','/weave-food/agility.jpeg')],
 ['Discover Electrolyte','Ask a Weave representative about Electrolyte product availability.','/weave-food/electrolyte.jpeg'],
 ['Discover Ember','Explore Ember and ask about available products and delivery options.','/weave-food/ember.jpg'],
 ['Daisy Pastries','Discover Daisy Pastries and ask about ordering and delivery.','/weave-food/daisy-pastries.jpg'],
 ['Every order matters','Stability connects practical customer needs with product supply and delivery.',w+'kitchen.webp'],
 ['Physical work, real customers','Agents help distribute products and serve customers in the physical world. Explore the role.',w+'depot.webp']],
 'Dream Lovely':[
 ['Your business, your File Folder','Explore a File Folder as a space for organizing business tools, products and participation. Ask for a preview.','/weave/file-folder/official/weave-pro-file-folder-official.webp'],
 ['Open a Customer Door','A Customer Door helps introduce your products or services to customers. What do you sell?',w+'store.webp'],
 ['Bring your workshop to life','Explore tools for organizing the work behind your business.',w+'foundry.webp'],
 ['A store for your ideas','Dream Lovely is the department of Clients. Tell us what you want to build or sell.',w+'market.webp'],
 ['Your own business presence','A File Folder brings business activities into an organized environment. Request a demonstration.',w+'estate.webp'],
 ['Creative work has a home','Explore creative workshops and business tools in Weave.',w+'studio.webp'],
 ['From materials to a product','A business begins with something useful. Tell us what you make and how you reach customers.',w+'foundry.webp'],
 ['Build your customer experience','Consider how customers discover, understand and access your offerings.',w+'bridge.webp'],
 ['Explore the Pro File Folder','Discover the Pro File Folder and ask about current features and eligibility.','/weave/file-folder/official/weave-pro-file-folder-official.webp'],
 ['Explore the Plus world','Ask for a demonstration of the Plus File Folder environment and current terms.','/weave/plus-file-folder-white-official.webp']],
 'A Time':[
 ['Meet Administrations','A Time organizes company operations, records and events. Explore the company and its departments.',w+'control.webp'],
 ['An organized company','Weave brings Hope, Stability, Dream Lovely and A Time into one operating environment.','/images/department-pavilions.webp'],
 ['Work through a system','Administrations maintains workshops and company infrastructure. Discover how Weave is organized.',w+'accounts.webp'],
 ['A time for creation','Explore the company workshops that support practical activities and creative work.',w+'foundry.webp'],
 ['Discover Burning River','Explore Burning River, the Weave company event, and ask about current participation.','/weave/flame-event/burning-river-open-world-official.webp'],
 ['Records and accountability','Company operations need clear records and review. Discover the role of Administrations.',w+'archive.webp'],
 ['Explore company ground','Visit Weave and discover its four departments.','/weave/open-world/weave-open-world-official.jpg'],
 ['Events and participation','A Time coordinates company events and announcements. Explore current company information.',w+'stage.webp'],
 ['Technology in service of work','Weave organizes human activities into practical work through its systems and departments.',w+'control.webp'],
 ['Interaction in motion','Discover a company connecting publicity, physical distribution, business systems and administration.','/images/weave-official-hybrid-home.jpg']]
}
export const palettes=['#ddc18a','#75e3e9','#ffb897','#c7b7ff','#b8e0b5','#f3e1b5']
const hooks=['Discover','Explore','A closer look','In practice','Start a conversation','The next step']
export const starterPublications:Publication[]=departments.flatMap((department,d)=>topics[department].flatMap(([title,caption,image],t)=>palettes.map((_,style)=>({id:'seed-'+d+'-'+t+'-'+style,department,title,caption:hooks[style]+': '+caption+'\n\nVisit https://weavingsystem.online or message me to learn more. #WeaveOfPresence #'+department.replace(/ /g,''),image,style,active:true}))))
