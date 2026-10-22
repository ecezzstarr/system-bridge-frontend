export type EnterpriseLegionAudience = 'all' | 'client' | 'agent' | 'bridger' | 'worker'

export type EnterpriseLegionPage = {
  key: string
  phase: string
  audience: EnterpriseLegionAudience
  title: string
  story: string
  meaning: string
  action: string[]
  caution: string[]
  moveWhen: string
}

export const ENTERPRISE_LEGION_RULES = [
  'The Client owns the enterprise, File Folder, Customer Door, pricing and products.',
  'Client subscription and Lord/Lady standing are managed in the Client account; employment applicants do not need Client billing amounts.',
  'Real Client product sales fund expenses, agreed Legion compensation, operations and expansion; there is no guaranteed surplus.',
  'Lord or Lady is the Client title; General means enterprise leadership, never military authority.',
  'Only an approved enterprise with active Legion Quarters recruits Legions.',
  'Agents qualify through their active position; Bridgers require the one-time 11 Flame Coin Agentic-Bridger purchase.',
  'Applications and invitations are voluntary and do not guarantee employment.',
  'Active Legions serve one Client enterprise exclusively inside WEAVE.',
  'Employment and earning terms must be clear; do not promise automatic sales or income.',
  'Every real order, payout and departure must remain traceable and truthful.',
] as const

export const ENTERPRISE_LEGION_PAGES: EnterpriseLegionPage[] = [
  {
    "key": "banner",
    "phase": "Prologue",
    "audience": "all",
    "title": "The Banner of Enterprise",
    "story": "Ancient generals assembled people around a clear purpose. Alexander's campaigns are remembered for coordinated movement. WEAVE borrows the image of organization—not conquest, violence or obedience over a person's life.",
    "meaning": "A File Folder is the Client's world. The Enterprise Legions notebook teaches how people voluntarily enter a Client-owned enterprise to carry real work.",
    "action": [
      "Open the book as a Lord or Lady, Agent, or Bridger.",
      "Read one page at a time and move only after understanding the employment movement."
    ],
    "caution": [
      "A Legion is a worker, not property or a soldier.",
      "A Client is an enterprise leader, not a military ruler."
    ],
    "moveWhen": "The reader knows that the Legion is a civilian employment and participation system."
  },
  {
    "key": "general",
    "phase": "Client · Lord / Lady",
    "audience": "client",
    "title": "The Lord or Lady Is the General",
    "story": "The field begins with its builder. The General gives the enterprise its direction, just as a leader once gave a camp its purpose.",
    "meaning": "After the Client activates their monthly subscription, their registered gender determines Lord or Lady standing. The Client then stands as the General (CEO) of their own enterprise. Separate business-plan approval is required to open the Enterprise Dream Workshop and recruit Legions. They own the business, brand, products, pricing, and Customer Door; Legion workers do not become owners merely by working there.",
    "action": [
      "Name the enterprise and what it will produce or provide.",
      "Define what belongs to the Client and what work can be delegated."
    ],
    "caution": [
      "Ownership stays with the Client.",
      "The General cannot bypass company verification or employment protections."
    ],
    "moveWhen": "The Client can state the enterprise's objective in one clear sentence."
  },
  {
    "key": "blueprint",
    "phase": "Client · Blueprint",
    "audience": "client",
    "title": "Draw the Blueprint",
    "story": "No competent general marches without knowing the route. Here the route is a business plan, not a battlefield. A Client begins with their own product or service, not promised wealth.",
    "meaning": "List the Client's own product or service, target customers, selling price, production and delivery costs, worker earnings, operating expenses, expected surplus, and how results will be recorded. Any excess from real sales may support the Client's livelihood, continued operation and WEAVE expansion.",
    "action": [
      "Write what the business sells and why customers need it.",
      "Set stock or service capacity, delivery plan, and customer support.",
      "Choose the jobs that real workers can perform."
    ],
    "caution": [
      "Do not recruit workers into an undefined promise.",
      "A File Folder alone does not generate sales."
    ],
    "moveWhen": "There is a practical work plan and a clear customer path."
  },
  {
    "key": "workshop",
    "phase": "Client · Formation",
    "audience": "client",
    "title": "Open the Enterprise Dream Workshop",
    "story": "A camp needs a working headquarters. The Enterprise Dream Workshop is the Client's operating command, not a mere card.",
    "meaning": "After the required enterprise formation and Administration approval, the Client uses the Enterprise Dream Workshop to manage their own business growth, tools and personnel.",
    "action": [
      "Complete the relevant File Folder development and enterprise application.",
      "Wait for actual Administration approval and access.",
      "Open the enterprise's workshop before recruiting."
    ],
    "caution": [
      "Do not represent an unapproved enterprise as active.",
      "A Client cannot employ Legions just by naming them."
    ],
    "moveWhen": "The enterprise is actually approved and its management functions are available."
  },
  {
    "key": "quarters",
    "phase": "Client · Formation",
    "audience": "client",
    "title": "Build Legion Quarters",
    "story": "The old camp organized its people in quarters. The WEAVE enterprise must first create capacity for real workers.",
    "meaning": "Legion Quarters establish the places and capacity for exclusive Legion employment. Current enterprise capacity can begin with three positions and expand through additional supported capacity.",
    "action": [
      "Construct and activate Legion Quarters.",
      "Inspect open capacity and the functions needed.",
      "Only recruit as many workers as the system actually permits."
    ],
    "caution": [
      "Quarters must be completed before recruitment opens.",
      "Do not invent unlimited workers or paid posts."
    ],
    "moveWhen": "Legion capacity is active and there is an available place."
  },
  {
    "key": "call",
    "phase": "Agent / Bridger · Discovery",
    "audience": "worker",
    "title": "Hear the Call",
    "story": "The banner is visible, but joining it is a choice.",
    "meaning": "Open WEAVE Lifestyle and the Legion employment ground. Available enterprises with open quarters may receive applications from eligible Agents and Bridgers.",
    "action": [
      "Read the enterprise's identity, sector and stated work.",
      "Decide whether the business matches your ability and interest."
    ],
    "caution": [
      "Do not apply to enterprises that are not actually available.",
      "Joining must be voluntary."
    ],
    "moveWhen": "The worker finds a genuine enterprise to consider."
  },
  {
    "key": "agent-door",
    "phase": "Agent · Eligibility",
    "audience": "agent",
    "title": "The Agent Enters Through Stability",
    "story": "An experienced carrier already knows how to bring work to people.",
    "meaning": "An active Agent is eligible through the Agent company position. The existing Legion Lifestyle does not require an extra monthly Agent subscription.",
    "action": [
      "Sign in through the active Agent position.",
      "Enter Lifestyle → Legion to view employment opportunities."
    ],
    "caution": [
      "Do not claim every Agent will be employed.",
      "Do not require an invented additional Agent subscription."
    ],
    "moveWhen": "The Agent is eligible, available and not already serving another Client as a Legion."
  },
  {
    "key": "bridger-door",
    "phase": "Bridger · Eligibility",
    "audience": "bridger",
    "title": "The Bridger Enters Through Hope",
    "story": "A Bridger who carries human possibility can also choose to carry one Client's enterprise.",
    "meaning": "A Bridger needs purchased Agentic-Bridger Lifestyle access to apply for Legion employment. Once accepted, the Bridger's normal outreach and position work are suspended for the exclusive Client assignment.",
    "action": [
      "Check permanent Agentic-Bridger ownership / Lifestyle access.",
      "Enter Lifestyle → Legion and inspect available enterprises."
    ],
    "caution": [
      "Do not promise Legion eligibility with an Agentic-Bridger not yet purchased.",
      "Do not continue normal Bridger work after exclusive activation."
    ],
    "moveWhen": "The Bridger has valid eligibility and a specific enterprise to consider."
  },
  {
    "key": "apply",
    "phase": "Agent / Bridger · Application",
    "audience": "worker",
    "title": "Apply for a Legion Position",
    "story": "The worker approaches the gate with their skills, not empty promises.",
    "meaning": "An eligible Agent or Bridger selects an enterprise with active quarters, sends an application and a short note about useful work they can do.",
    "action": [
      "Choose the enterprise in Lifestyle → Legion.",
      "Explain relevant skills or experience in the application note.",
      "Send the application and await a decision."
    ],
    "caution": [
      "Applying does not mean employment.",
      "Do not leave existing work until the employment has actually been accepted and activated."
    ],
    "moveWhen": "The application is registered as pending."
  },
  {
    "key": "invite",
    "phase": "Client · Recruitment",
    "audience": "client",
    "title": "The General Searches the Field",
    "story": "A good general knows which person can carry which mission. The Client chooses workers for their actual capacities.",
    "meaning": "Inside Enterprise Dream Workshop → Legion Recruitment, the Client can search available Agents and eligible Bridgers, invite them to apply, and review incoming applications.",
    "action": [
      "Search by name or company role.",
      "Review the fit between skills, function and available quota.",
      "Send an invitation or consider an application."
    ],
    "caution": [
      "An invitation is not automatic employment.",
      "Do not recruit someone who is already an exclusive Legion."
    ],
    "moveWhen": "The chosen person has an active invitation or application."
  },
  {
    "key": "terms",
    "phase": "All · Employment Terms",
    "audience": "all",
    "title": "Set the Terms Before Allegiance",
    "story": "The general's word is written before the banner is accepted.",
    "meaning": "Define enterprise function, expected tasks, location or online work, compensation or profit participation, attribution, settlement basis, work standards, contact channel, review, and exit conditions. Current recruitment fields include function title and profit participation; additional terms must be made explicit rather than assumed to be enforced automatically.",
    "action": [
      "Client writes understandable duties and earning terms.",
      "Worker reads and accepts or declines freely.",
      "Confirm whether payment is salary, commission, profit share, or an agreed combination, and what triggers it."
    ],
    "caution": [
      "Never invent a guaranteed salary or guaranteed customers.",
      "Never hide costs, terms, or obligations.",
      "Exclusive work must be a clear and voluntary agreement."
    ],
    "moveWhen": "Both parties understand and accept the actual terms, not a vague income promise."
  },
  {
    "key": "accept",
    "phase": "All · Formation",
    "audience": "all",
    "title": "Two Sides Confirm the Appointment",
    "story": "A true command begins with mutual agreement, not a unilateral declaration.",
    "meaning": "Two existing paths form Legion employment: Client accepts a worker's application, or worker accepts a Client's invitation. The system activates the employment and assigns the Legion to that enterprise.",
    "action": [
      "Client may accept a pending qualified application.",
      "Agent or Bridger may accept a Client invitation.",
      "Confirm activation and the assigned enterprise."
    ],
    "caution": [
      "A pending request is not an active appointment.",
      "Do not claim the role changed unless the system confirms it."
    ],
    "moveWhen": "Legion status is active for the specific Client enterprise."
  },
  {
    "key": "exclusive",
    "phase": "Agent / Bridger · Transition",
    "audience": "worker",
    "title": "From Position to Exclusive Legion",
    "story": "The worker enters one enterprise's formation and carries one defined responsibility.",
    "meaning": "The original Agent or Bridger account and position remain beneath the appointment, but ordinary Agent/Bridger work is locked while Legion employment is active. The Legion serves one Client enterprise inside WEAVE.",
    "action": [
      "Stop ordinary role activities when activation is confirmed.",
      "Use only the Client-authorized Legion work area and customer routes.",
      "Preserve account identity and records."
    ],
    "caution": [
      "Do not represent yourself as free to serve multiple Clients at once.",
      "Exclusivity concerns WEAVE platform activity and agreed terms; it is not ownership of a person's life."
    ],
    "moveWhen": "The Legion can enter their assigned workspace and knows what tasks are permitted."
  },
  {
    "key": "assignment",
    "phase": "All · Daily Work",
    "audience": "all",
    "title": "Assign the Mission",
    "story": "An army without coordinated tasks becomes a crowd. An enterprise without defined work becomes confusion.",
    "meaning": "The Client assigns real commercial functions: customer discovery, sales, content, product demonstration, order handling, delivery coordination or support, within the available systems and agreed scope.",
    "action": [
      "Client gives a clear deliverable and a point of contact.",
      "Legion accepts tasks within their actual ability and agreement.",
      "Record each assignment and its outcome."
    ],
    "caution": [
      "Do not promise or force work outside the agreed function.",
      "Never expose Client vaults, passwords or private customer data without authorization."
    ],
    "moveWhen": "A task is assigned, understood and ready for lawful execution."
  },
  {
    "key": "doors",
    "phase": "All · Customer Reach",
    "audience": "all",
    "title": "Carry the Customer Door",
    "story": "Every messenger needs a road; every customer needs the rightful gate.",
    "meaning": "The enterprise remains Client-owned. A Legion's attributed Carrier or sales link can lead customers to the Client's products or Customer Door while preserving the Legion's contribution.",
    "action": [
      "Client publishes approved products, services, prices and terms.",
      "Legion carries an authorized Carrier or sales route.",
      "Customer enters the Client's environment, not a worker-owned imitation."
    ],
    "caution": [
      "Do not change the Client's price or ownership without permission.",
      "Do not claim a Customer Door automatically creates customers."
    ],
    "moveWhen": "A verified customer route is functioning for the assigned product or service."
  },
  {
    "key": "orders",
    "phase": "All · Trade",
    "audience": "all",
    "title": "Serve the Customer",
    "story": "A banner matters only if people receive the value promised beneath it.",
    "meaning": "Customer interest becomes a recorded order, with payment verification, fulfilment responsibility, status updates and support. The Client owns the products and enterprise earnings; they must pay actual costs and agreed Legion compensation before treating the remaining amount as operating surplus.",
    "action": [
      "Confirm the actual customer order and price.",
      "Verify payment status before treating an order as paid.",
      "Arrange legitimate delivery, service and customer support."
    ],
    "caution": [
      "Never fabricate payments or fulfilled orders.",
      "Do not promise stock, delivery or timing not confirmed by the Client."
    ],
    "moveWhen": "The customer receives the agreed product or service and the order record reflects reality."
  },
  {
    "key": "earnings",
    "phase": "All · Earnings",
    "audience": "all",
    "title": "Share the Value by Record",
    "story": "An enterprise should know which work produced which value.",
    "meaning": "Sales attribution, revenue, commissions and agreed profit participation are measured from actual eligible transactions according to the enterprise agreement. Legions do not own Client revenue merely because they carried the sale.",
    "action": [
      "Track Legion sales codes and valid orders.",
      "Show the worker the agreed earning basis and status.",
      "Make any approved settlement traceable with a receipt."
    ],
    "caution": [
      "Do not guarantee profit, salary or sales unless explicitly funded and contractually supported.",
      "Do not invent an automatic payout rule or percentage."
    ],
    "moveWhen": "The ledger and agreements can explain what was earned and what remains pending."
  },
  {
    "key": "watch",
    "phase": "Client · Management",
    "audience": "client",
    "title": "The General Watches the Work",
    "story": "The wise leader studies the field, not only the applause.",
    "meaning": "The Client can review Legion posts, order counts, paid orders, expenses, worker earnings, operating surplus, customer issues and recruitment capacity within the tools actually available. WEAVE helps the Client use proceeds from their own products to maintain and expand the enterprise.",
    "action": [
      "Inspect active Legions and the work they have completed.",
      "Resolve customer and worker problems without guessing.",
      "Revise assignments and evaluate whether additional capacity is justified."
    ],
    "caution": [
      "Orders are not the same as paid orders.",
      "Do not use surveillance or intimidation in place of work records."
    ],
    "moveWhen": "Daily activity is recorded and the next practical task is clear."
  },
  {
    "key": "support",
    "phase": "All · Protection",
    "audience": "all",
    "title": "When a Dispute Reaches the Camp",
    "story": "Strong leadership makes room for questions and correction.",
    "meaning": "A dispute may concern work scope, commission, fulfilment, an unauthorized instruction, compensation or an attempt to change the Client's enterprise without consent.",
    "action": [
      "Preserve the relevant agreement and receipts.",
      "Use the Client's and WEAVE's authorized support channels.",
      "Keep disputed funds and statuses accurate pending review."
    ],
    "caution": [
      "Never retaliate against a worker who raises a concern.",
      "Do not claim Administration approved a change without verification."
    ],
    "moveWhen": "The issue is documented, assigned for review and the appropriate decision can be communicated."
  },
  {
    "key": "departure",
    "phase": "All · Exit",
    "audience": "all",
    "title": "The Legion Returns From Service",
    "story": "A completed tour is not abandonment. People leave with their identity and earned standing intact.",
    "meaning": "A Legion appointment can end by agreed release, termination or authorized administrative action, subject to recorded terms and applicable law. The original Agent/Bridger position should become available again only when the system records a complete release and the role is otherwise eligible.",
    "action": [
      "Record notice, effective date, reason and outstanding work.",
      "Preserve all earned commissions and receipts, reconcile unpaid work outside the release action, and return Client materials or permissions.",
      "End exclusive Legion access, stop future Carrier attribution, and verify Agent/Bridger access under the original role requirements."
    ],
    "caution": [
      "Use the real Release Legion control: either the Client or worker may end the appointment with a recorded reason, even if a Lifestyle account is closed.",
      "Do not erase earned commissions or Client orders on departure."
    ],
    "moveWhen": "The employment is ended in the real system and all outstanding responsibilities are documented."
  },
  {
    "key": "continuity",
    "phase": "Epilogue",
    "audience": "all",
    "title": "The Enterprise Continues",
    "story": "The point of the formation is not a single campaign: it is the lasting world that the Lord or Lady is building.",
    "meaning": "Client → Enterprise Workshop → Legion Quarters → applications and invitations → mutual employment → tasks and Carriers → customers → orders → attributed value → settlement → continuation or release.",
    "action": [
      "Client returns to Enterprise Dream Workshop and sets the next practical objective.",
      "Legion continues serving only within an active, agreed appointment.",
      "All parties measure genuine work, not promised success."
    ],
    "caution": [
      "Legions do not replace the Client's ownership.",
      "This notebook teaches the flow; operational actions must be confirmed in the live interfaces."
    ],
    "moveWhen": "The next work cycle begins from real operating results."
  }
]

export const ENTERPRISE_LEGIONS_NOTEBOOK = {
  title: 'Enterprise Legions',
  subtitle: 'The Lord or Lady → Enterprise → Legion Quarters → Employment → Customers → Value',
  instruction: 'Read each page in order. Move manually. History inspires the formation; people are free workers, not soldiers.',
  pages: ENTERPRISE_LEGION_PAGES,
} as const
