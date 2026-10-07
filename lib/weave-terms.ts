import { WORLD_RULES } from './world/constants'
import { WEAVE_ARCHITECTURE } from './weave-architecture'

export const CURRENT_TERMS_VERSION = 11

const FLAME_COIN_RATE = WORLD_RULES.TRX_PAYMENT_NGN_FALLBACK_RATE
const FILE_FOLDER_FLAME_COIN = WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
const STANDARD_FILE_FOLDER_MIN = WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN
const FILE_FOLDER_NGN = (FILE_FOLDER_FLAME_COIN * FLAME_COIN_RATE).toLocaleString()
const BRIDGER_30_FLAME_COIN = (FILE_FOLDER_FLAME_COIN * WORLD_RULES.BRIDGER_YIELD_RATE).toLocaleString()
const BRIDGER_30_NGN = (FILE_FOLDER_FLAME_COIN * WORLD_RULES.BRIDGER_YIELD_RATE * FLAME_COIN_RATE).toLocaleString()

export const AGENT_CONTENT = {
  positionTitle: 'YOUR POSITION IN WEAVE',
  positionSummary:
    "WEAVE gives the Agent a working position inside the company. Your daily function is Agility and the value movement connected to the Bridgers attached to you.",
  role: 'Your role is to move Agility and receive commissions when assigned Bridgers make qualifying Prospect purchases through Weave.',
  earningMovements: [
    `You earn ${(WORLD_RULES.AGENT_LEAD_YIELD_RATE * 100).toFixed(0)}% whenever an attached Bridger makes a qualifying Prospect purchase through the Prospect Market.`,
    `When that Bridger converts a Prospect through a verified Client File Folder purchase, you earn ${(WORLD_RULES.AGENT_CROSSING_YIELD_RATE * 100).toFixed(0)}% of the File Folder value, which is 5% of WEAVE's 40% company share.`,
    'Agility is the Agent real-world distribution function. Its ordering and fulfillment movement remains separate from commission calculations.',
  ],
  calculations: [
    `Reference value: 1 Flame Coin = 1 TRX (₦${FLAME_COIN_RATE} per TRX at the configured reference rate):`,
    `Premium File Folder example: ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin = ₦${FILE_FOLDER_NGN}`,
    `Agent Prospect-purchase share: ${(WORLD_RULES.AGENT_LEAD_YIELD_RATE * 100).toFixed(0)}% of the qualifying attached Bridger Prospect purchase.`,
    `Agent File Folder share: ${(WORLD_RULES.AGENT_CROSSING_YIELD_RATE * 100).toFixed(0)}% of the verified File Folder value (5% of WEAVE's 40% company share).`,
    `Ordinary Bridger File Folder share outside Agentic-Bridger: ${(WORLD_RULES.BRIDGER_YIELD_RATE * 100).toFixed(0)}% of the verified File Folder value.`,
  ],
  movement: 'Agility + attached Bridger activity → qualifying share → verified File Folder crossing → File Folder share → record.',
  folderWork: 'The Agent account does not own or operate a Client File Folder. Presence explains the Agent position; Agility and Commissions are the Agent working environments.',
}

export const BRIDGER_CONTENT = {
  positionTitle: 'YOUR POSITION IN WEAVE',
  positionSummary:
    'Hope is the Bridger Department. WEAVE gives the Bridger a working position at the human crossing: work from possibility, attempt the connection, recognize what is actually present, and carry a real response toward the part of WEAVE that can serve it.',
  role: 'Your role in Hope is to work with Prospect candidates provided through WEAVE, attempt the human connection, introduce WEAVE when contact becomes real, and guide willing participation toward the crossing. A Prospect is a candidate or guess, not a verified person, verified contact, promised response, or promised conversion.',
  action: `You acquire Prospect tools through the Prospect Market, WhatsApp movement, or Email Prospect movement and use the authorized outreach system to attempt contact. Buying or receiving a Prospect gives you a candidate and its WEAVE reference; it does not certify that the phone number, WhatsApp account, email address, person, business, reachability, interest, or response has been verified. Verification begins only through real outreach and response. A responding prospect may enter through a Standard File Folder from ${STANDARD_FILE_FOLDER_MIN.toLocaleString()} Flame Coin up to anything below ${FILE_FOLDER_FLAME_COIN.toLocaleString()}, or through the Premium File Folder at ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin. Once the File Folder is verified, that prospect becomes a Client of Weave and their included Customer Door construction begins automatically with all required functional Door parts already supplied. Flame Coin is the internal wrapper for TRX value; OPay funding is converted using the current TRX/NGN rate.`,
  earnings: [
    `Reference value: 1 Flame Coin = 1 TRX (₦${FLAME_COIN_RATE} per TRX at the configured reference rate):`,
    `File Folder: ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin = ₦${FILE_FOLDER_NGN}`,
    `Ordinary Bridger earning is ${(WORLD_RULES.BRIDGER_YIELD_RATE * 100).toFixed(0)}% of the File Folder price: ${BRIDGER_30_FLAME_COIN} Flame Coin = ₦${BRIDGER_30_NGN} at the Premium example.`,
    'Agentic-Bridger is the Bridger-only lifestyle inside Ace. Active Bridger Continuance opens Ace and the Agentic-Bridger 45% rate for eligible File Folder and Arena activity. If Continuance expires, Ace access closes and the person returns to ordinary Bridger operation and ordinary Bridger rates until Continuance is active again.',
  ],
  movement: `Acquire Prospect candidate → attempt contact → recognize a real response → bridge the responding prospect → prospect participates → Standard or Premium File Folder purchase → prospect becomes Client → included Customer Door construction begins → earn the applicable verified Bridger share. This closes Loop 1 for the Bridger.`,
  relationship: 'The Bridger accompanies the Client beyond the first introduction through direct communication and authorized continuity. The Client\'s System Switch remains private. After the included Customer Door finishes construction, the Bridger can encounter that public enterprise through the Customer Market or when Flame Event carries the Door into the shared event current.',
}

export const FILE_FOLDER_CONTENT = {
  title: 'THE FILE FOLDER',
  subtitle: 'Your place inside System Switch',
  body: `One Client. One File Folder. It is the Client-owned world inside System Switch where a thought, need, business or possibility can meet blueprints, materials, builds, systems, people, AI support, records and company functions without starting again on every visit.`,
  establishment: `When a Prospect purchases either a Standard or Premium File Folder and the payment is verified, their place in System Switch is established and the included Customer Door construction begins automatically. The Door receives its foundation, Client identity, customer intake, service interface, fulfilment interface and public commissioning parts from the File Folder purchase, but construction time remains real. The Client can allow that construction to finish naturally or apply compatible boosts to reduce the remaining time. The public Door opens after construction completes. Standard begins at ${STANDARD_FILE_FOLDER_MIN.toLocaleString()} Flame Coin and can be any value below the ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin Premium price. File Folder value establishes starting Build Power for later construction; higher verified participation can increase later construction speed and capacity, but it does not determine whether the purchased Customer Door is included. The Folder then carries the Client’s enterprise, decisions, actions, support, learning, further builds and continuing systems.`,
}

export const CUSTOMER_MARKET_CONTENT = {
  title: 'CUSTOMER MARKET',
  subtitle: 'Enter through a Client Customer Door',
  body: 'A Client private File Folder remains inside that Client position. Verification of the File Folder begins the included Customer Door build; after its construction completes, that Door becomes the outward public boundary. Public visitors discover completed Customer Doors from the WEAVE homepage/Customer Market or from a Client-shared direct Door link. Logged-in Administration, Agents and Bridgers meet those completed Customer Doors inside Flame Event and enter the public enterprise from that event current.',
}

export const MOVEMENT_CONTENT = {
  title: 'THE MOVEMENT',
  body: 'The Client enters with something already present: a need, thought, business, dream, problem or work. The File Folder keeps what matters available while the right people, functions, AI and systems can meet it. The next interaction does not have to begin from zero.',
  footer: 'Interaction in Motion.',
}

export const COMPANY_SUPPORT = [
  { name: 'Administration', detail: 'Recognition and activation.' },
  { name: 'Attorney', detail: 'Clarity and guidance.' },
  { name: 'Mandate', detail: 'Execution and setup.' },
  { name: 'Forensics', detail: 'Confirmation and records.' },
  { name: 'Technical Support', detail: 'Systems and operations.' },
  { name: 'Enterprise Support', detail: 'Workshops, stores, and organizations.' },
]

export const HOW_WEAVE_WORKS = {
  summary:
    'WEAVE is the institution.\n\nAdministration governs the system.\nAgents move Agility and receive their defined shares from attached Bridger Prospect purchases and verified Client File Folder crossings.\nHope is the Bridger Department. Bridgers work with unverified Prospect candidates, attempt connection and carry real responses toward crossing; they receive their defined File Folder share when a guided Prospect becomes a Client. Agentic-Bridger is a Bridger-only Ace lifestyle available only while Bridger Continuance is active.\nClients own and operate their File Folder worlds.\n\nThe Client is the game player inside System Switch, where the Client’s real-life movement forms the continuing game. Shared participation systems do not change a user’s institutional position. The Company provides authorized support positions that help Clients continue without taking ownership of the Client world.',
  institutionalFlow: 'Administration → Agent → Hope / Bridger → Client',
  clientFlow: 'WEAVE → Prospect candidate → Bridger outreach → real response → Bridger relationship → Prospect movement → File Folder → File Number → System Switch → Client World + Customer Door construction → completed Customer Door → build + learn + participate → outside patronage → Enterprise → Client Vault / Siblings Funds Wallet / Main Client Wallet → continued systems and livelihood',
}

export const TERMS_SECTIONS = [
  { title: '1. Acceptance', body: "By accepting your Agent appointment or Bridger partnership, you agree to follow WEAVE's operational rules, policies, confidentiality requirements, and lawful instructions." },
  { title: '2. Agent Status', body: 'An Agent is an employee and authorized representative of WEAVE. The Agent does not receive ownership or partnership rights in the Company unless separately agreed in writing.' },
  { title: '3. Bridger Status', body: 'Hope is the Bridger Department. A Bridger is an independent operational partner and is not an employee of WEAVE. A Bridger does not receive ownership of the Company.' },
  { title: '4. Prospect Nature', body: 'Prospects supplied, generated, assigned, claimed, purchased or acquired through WEAVE are prospecting tools and unverified candidates. They may be guesses formed from number or email patterns or other candidate sources. WEAVE does not promise that a Prospect identifies a real person or business, that a phone number, WhatsApp account or email address exists or is reachable, or that the recipient will respond, participate or convert. Prospect verification begins only through real outreach and response. A Prospect fee pays for access to the candidate movement and WEAVE reference, not for verification or guaranteed conversion.' },
  { title: '5. Bridger Earning Movement', body: 'An ordinary Bridger earns 30% of the actual verified File Folder purchase value when a prospect they guide becomes a Weave Client. Agentic-Bridger is a Bridger-only lifestyle inside Ace and uses 45% for eligible File Folder and Arena activity only while Bridger Continuance is active. If Continuance expires, Ace access and Agentic-Bridger end and the person returns to ordinary Bridger operation and rates. A Standard File Folder may be any value from 180 Flame Coin up to anything below 35,800; the Premium File Folder is fixed at 35,800 Flame Coin.' },
  { title: '6. Agent Earning Movement', body: `An Agent earns ${(WORLD_RULES.AGENT_LEAD_YIELD_RATE * 100).toFixed(0)}% on qualifying Prospect purchases made by attached Bridgers and ${(WORLD_RULES.AGENT_CROSSING_YIELD_RATE * 100).toFixed(0)}% of a verified Client File Folder purchase completed through that Bridger, equal to 5% of WEAVE's 40% company share. Agility remains the Agent real-world distribution function; File Folder ownership and operation belong to Clients.` },
  { title: '7. The File Folder', body: `The File Folder is the persistent open-world workshop at System Switch owned and operated by one Client. Administration, Agents, Bridgers and other Clients do not enter another Client's private File Folder. Verification of a Standard or Premium File Folder automatically starts its included Customer Door construction with foundation, Client identity, customer intake, service interface, fulfilment interface and public commissioning parts supplied. Construction time remains active and the Client may either wait for natural completion or use compatible boosts. The Customer Door becomes publicly reachable after construction completes. Public visitors then reach that Door from the WEAVE homepage/Customer Market or a Client-shared direct Door link; logged-in staff meet the public enterprise inside Flame Event. Standard access begins at ${STANDARD_FILE_FOLDER_MIN.toLocaleString()} Flame Coin and may be any value below the ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin Premium price. Premium remains fixed at ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin. File Folder value establishes starting Build Power for later construction; additional verified participation can accelerate later build timers and capacity but does not gate inclusion of the purchased Customer Door.` },
  { title: '8. System Switch', body: `System Switch is the Client's crossing into the Main File Folder. Once opened, the File Folder is the persistent world where the Client's personalized workshop continues through blueprints, timed formation, build inventory, active systems, the Library District, support participation and real company work inside the fixed subject: ${WEAVE_ARCHITECTURE.subject.name}.` },
  { title: '9. Customer Door Visibility', body: 'A Client owns the private System Switch and File Folder environment. Administration, Agents, Bridgers and other Clients do not enter another Client private File Folder. The verified File Folder starts the included Customer Door construction automatically. The Door becomes the outward public boundary only after that construction completes. Logged-in staff then meet completed Customer Doors inside Flame Event. Public visitors reach completed Customer Doors from the WEAVE homepage/Customer Market or a Client-shared direct Door link.' },
  { title: '10. Company Information', body: 'Agents and Bridgers must protect confidential Company information, Client information, operational procedures, internal communications, and system information during and after their relationship with WEAVE.' },
  { title: '11. Prospect and Client Information', body: 'Prospect and Client contact information supplied or generated through Company operations must be used only for authorized WEAVE activities. Candidate data must not be represented as verified until real outreach establishes that fact. Contact information must not be sold, transferred, or misused outside authorized WEAVE movement.' },
  { title: '12. No Unauthorized Representation', body: 'Agents and Bridgers may only represent WEAVE within the authority granted to them. They must not create unauthorized commitments, contracts, promises, or financial obligations on behalf of the Company.' },
  { title: '13. Conduct', body: 'Misconduct, fraud, false information, harassment, misuse of Prospect or Client information, breach of confidentiality, or conduct that damages the interests of WEAVE may result in suspension or termination.' },
  { title: '14. Termination', body: "The Company may suspend or terminate an Agent's employment or a Bridger's partnership for breach of these terms, Company policies, confidentiality obligations, or operational requirements." },
]
