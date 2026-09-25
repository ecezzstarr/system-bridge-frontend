import { WORLD_RULES } from './world/constants'
import { WEAVE_ARCHITECTURE } from './weave-architecture'

export const CURRENT_TERMS_VERSION = 8

const FLAME_COIN_RATE = WORLD_RULES.TRX_PAYMENT_NGN_FALLBACK_RATE
const FILE_FOLDER_FLAME_COIN = WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
const STANDARD_FILE_FOLDER_MIN = WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN
const PUBLIC_DOOR_THRESHOLD = WORLD_RULES.FILE_FOLDER_PUBLIC_DOOR_THRESHOLD_FLAME_COIN
const FILE_FOLDER_NGN = (FILE_FOLDER_FLAME_COIN * FLAME_COIN_RATE).toLocaleString()
const BRIDGER_30_FLAME_COIN = (FILE_FOLDER_FLAME_COIN * WORLD_RULES.BRIDGER_YIELD_RATE).toLocaleString()
const BRIDGER_30_NGN = (FILE_FOLDER_FLAME_COIN * WORLD_RULES.BRIDGER_YIELD_RATE * FLAME_COIN_RATE).toLocaleString()
const AGENT_5_FLAME_COIN = (FILE_FOLDER_FLAME_COIN * WORLD_RULES.AGENT_CROSSING_YIELD_RATE).toLocaleString()
const AGENT_5_NGN = (FILE_FOLDER_FLAME_COIN * WORLD_RULES.AGENT_CROSSING_YIELD_RATE * FLAME_COIN_RATE).toLocaleString()

export const AGENT_CONTENT = {
  positionTitle: 'YOUR POSITION IN WEAVE',
  positionSummary:
    "Weave is an interactional company. This whole platform is an interaction in motion real life gaming operating system for human presence. We create services, instruments, and systems that turn human participation into organized work, value, and opportunity. Weave of Presence builds systems, services and instruments around human participation. We work with people and their existing movement to create organized functions, work and value. As an Agent, you have a place inside that movement as a Weave employee.",
  role: 'Your role is to build, manage and support Bridgers who work with Weave.',
  earningMovements: [
    `You earn ${(WORLD_RULES.AGENT_LEAD_YIELD_RATE * 100).toFixed(0)}% whenever your Bridger purchases a Prospect through the Prospect Market.`,
    `When that prospect becomes a Weave Client through a Standard or Premium File Folder, you earn 5% of Weave's 40% company percentage from the actual File Folder purchase value.`,
  ],
  calculations: [
    `Reference value: 1 Flame Coin = 1 TRX (₦${FLAME_COIN_RATE} per TRX at the configured reference rate):`,
    `Premium File Folder example: ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin = ₦${FILE_FOLDER_NGN}`,
    `Bridger's 30% on the Premium example: ${BRIDGER_30_FLAME_COIN} Flame Coin = ₦${BRIDGER_30_NGN}`,
    `Weave's 40% company percentage: ${(FILE_FOLDER_FLAME_COIN * 0.4).toLocaleString()} Flame Coin`,
    `Agent's 5% on the Premium example: ${AGENT_5_FLAME_COIN} Flame Coin = ₦${AGENT_5_NGN}`,
  ],
  movement: 'Build Bridgers → Bridger purchases prospects → support the movement → prospect becomes Client → earn from both movements. This is Loop 1 for the Weave Agent.',
  folderWork: 'Open Bridge Plaza. Select the Client\'s File Folder. Enter the environment. See what is moving. Participate where your function is required. Use Bridge AI where it extends the movement. Bring in the appropriate company support. Record what happens. Continue the relationship.',
}

export const BRIDGER_CONTENT = {
  positionTitle: 'YOUR POSITION IN WEAVE',
  positionSummary:
    'Weave is an interactional company. This whole platform is an interaction in motion real life gaming operating system for human presence. We create services, instruments, and systems that turn human participation into organized work, value, and opportunity. Weave of Presence builds systems, services and instruments around human participation. We work with people and their existing movement to create organized functions, work and value. As a Bridger, you have a place within that movement as a partner working with Weave.',
  role: 'Your role is to take a prospect provided through Weave, make the human connection, introduce the person to Weave and guide the interaction toward participation.',
  action: `You acquire Prospects through the Prospect Market and use the authorized outreach system to contact them. A prospect may enter through a Standard File Folder from ${STANDARD_FILE_FOLDER_MIN.toLocaleString()} Flame Coin up to anything below ${FILE_FOLDER_FLAME_COIN.toLocaleString()}, or through the Premium File Folder at ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin. Once the File Folder is verified, that prospect becomes a Client of Weave. Flame Coin is the internal wrapper for TRX value; OPay funding is converted using the current TRX/NGN rate.`,
  earnings: [
    `Reference value: 1 Flame Coin = 1 TRX (₦${FLAME_COIN_RATE} per TRX at the configured reference rate):`,
    `File Folder: ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin = ₦${FILE_FOLDER_NGN}`,
    `Your Bridger earning is ${(WORLD_RULES.BRIDGER_YIELD_RATE * 100).toFixed(0)}% of the File Folder price: ${BRIDGER_30_FLAME_COIN} Flame Coin = ₦${BRIDGER_30_NGN}`,
  ],
  movement: `Purchase prospect → make contact → bridge the prospect → prospect participates → Standard or Premium File Folder purchase → prospect becomes Client → earn 30% of the actual verified File Folder purchase value. This closes Loop 1 for the Bridger.`,
  relationship: 'The Bridger accompanies the Client beyond the first introduction. The File Folder gives that relationship a persistent place inside System Switch. You can return to the Client\'s environment, understand what has moved, communicate, coordinate support, and continue the bridge.',
}

export const FILE_FOLDER_CONTENT = {
  title: 'THE FILE FOLDER',
  subtitle: 'Your place inside System Switch',
  body: `A File Folder is the persistent open-world workshop created for one Client through System Switch. It is where the Client's movement becomes a continuing topic inside ${WEAVE_ARCHITECTURE.subject.name} and meets real blueprints, timed builds, inventory, completed systems, learning districts, people, AI technologies, company functions, records, and supports of Weave. One Client. One File Folder. One continuing environment.`,
  establishment: `When a Prospect purchases either a Standard or Premium File Folder and the payment is verified, their place in System Switch is established. Standard begins at ${STANDARD_FILE_FOLDER_MIN.toLocaleString()} Flame Coin and can be any value below the ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin Premium price. File Folder value establishes starting Build Power. A Client below ${PUBLIC_DOOR_THRESHOLD.toLocaleString()} Flame Coin can cross, learn and begin early builds, but the first public Customer Door stops at a funding gate until later verified Client deposits bring total participation to at least ${PUBLIC_DOOR_THRESHOLD.toLocaleString()} Flame Coin. Higher verified participation increases construction speed. The Folder then carries the Client’s enterprise, decisions, actions, support, learning, builds, Customer Door and continuing systems.`,
}

export const BRIDGE_PLAZA_CONTENT = {
  title: 'BRIDGE PLAZA',
  subtitle: 'Enter the Client you are supporting',
  body: 'Bridge Plaza is where the movement of support begins. Agents and Bridgers do not enter System Switch into an undefined space. They enter through a File Folder. Choose the File Folder of the Client you are visiting.',
}

export const MOVEMENT_CONTENT = {
  title: 'THE MOVEMENT',
  body: 'A Client does not come into the File Folder merely to look around. Something is moving. A thought becomes a word. A word becomes an interaction. An interaction becomes an action. An action creates a result. The result creates another movement. That continuing movement is the Client\'s current topic. The File Folder keeps the topic inside a persistent environment where the appropriate people, functions, AI, and systems can participate.',
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
    'WEAVE is the institution.\n\nAdministration governs the system.\nAgents develop Bridgers.\nBridgers build and maintain Client relationships.\nClients are the center of the experience.\n\nThe Client is the game player inside System Switch, where the Client’s real-life movement forms the continuing game. Arena and Casino are separate shared platform experiences available across user roles; participation in them does not change a user’s institutional position. The Company also provides Client-facing Company positions that serve Clients, present curated experiences, and help resolve private matters.\n\nThe Client remains connected to WEAVE through the relationship with the Bridger and through the experience provided by the Company.',
  institutionalFlow: 'Administration → Agent → Bridger → Client',
  clientFlow: 'WEAVE → Bridger relationship → Prospect movement → File Folder → File Number → System Switch → Client World → build + learn + participate → Customer Door → outside patronage → Enterprise → Client Vault / Siblings Funds Wallet / Main Client Wallet → continued systems and livelihood',
}

export const TERMS_SECTIONS = [
  { title: '1. Acceptance', body: "By accepting your Agent appointment or Bridger partnership, you agree to follow WEAVE's operational rules, policies, confidentiality requirements, and lawful instructions." },
  { title: '2. Agent Status', body: 'An Agent is an employee and authorized representative of WEAVE. The Agent does not receive ownership or partnership rights in the Company unless separately agreed in writing.' },
  { title: '3. Bridger Status', body: 'A Bridger is an independent operational partner and is not an employee of WEAVE. A Bridger does not receive ownership of the Company.' },
  { title: '4. Bridger Earning Movement', body: 'A Bridger earns 30% of the actual verified File Folder purchase value when a prospect they guide becomes a Weave Client. A Standard File Folder may be any value from 180 Flame Coin up to anything below 35,800; the Premium File Folder is fixed at 35,800 Flame Coin.' },
  { title: '5. Agent Earning Movement', body: 'An Agent earns 30% on Bridger prospect lead purchases and 5% of Weave\'s 40% company percentage from File Folder purchases. This establishes Loop 1 for the Agent role.' },
  { title: '6. The File Folder', body: `The File Folder is the persistent open-world workshop at System Switch containing one Client and the WEAVE support assembled around that Client. It carries personalized formation, blueprints, timed builds, learning, operational systems and a public Customer Door. Standard access begins at ${STANDARD_FILE_FOLDER_MIN.toLocaleString()} Flame Coin and may be any value below the ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin Premium price. Premium remains fixed at ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin. File Folder value establishes starting Build Power. Below ${PUBLIC_DOOR_THRESHOLD.toLocaleString()} Flame Coin, the Client can cross and begin early participation but must add verified Flame Coin before the first public Customer Door opens; additional verified participation can accelerate build timers.` },
  { title: '7. System Switch', body: `System Switch is the Client's crossing into the Main File Folder. Once opened, the File Folder is the persistent world where the Client's personalized workshop continues through blueprints, timed formation, build inventory, active systems, the Library District, support participation and real company work inside the fixed subject: ${WEAVE_ARCHITECTURE.subject.name}.` },
  { title: '8. Bridge Plaza', body: 'Bridge Plaza is the support entrance for authorized Agents, Bridgers and Administration. They select a Client File Number there and travel into that same persistent Main File Folder world without returning the Client to the prospect Bridge.' },
  { title: '9. Company Information', body: 'Agents and Bridgers must protect confidential Company information, Client information, operational procedures, internal communications, and system information during and after their relationship with WEAVE.' },
  { title: '10. Client Information', body: 'Client contact information supplied or generated through Company operations must be used only for authorized WEAVE activities. It must not be sold, transferred, or misused.' },
  { title: '11. No Unauthorized Representation', body: 'Agents and Bridgers may only represent WEAVE within the authority granted to them. They must not create unauthorized commitments, contracts, promises, or financial obligations on behalf of the Company.' },
  { title: '12. Conduct', body: 'Misconduct, fraud, false information, harassment, misuse of Client information, breach of confidentiality, or conduct that damages the interests of WEAVE may result in suspension or termination.' },
  { title: '13. Termination', body: "The Company may suspend or terminate an Agent's employment or a Bridger's partnership for breach of these terms, Company policies, confidentiality obligations, or operational requirements." },
]

