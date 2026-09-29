import { WORLD_RULES } from './world/constants'
import { WEAVE_ARCHITECTURE } from './weave-architecture'

export const CURRENT_TERMS_VERSION = 9

const FLAME_COIN_RATE = WORLD_RULES.TRX_PAYMENT_NGN_FALLBACK_RATE
const FILE_FOLDER_FLAME_COIN = WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
const STANDARD_FILE_FOLDER_MIN = WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN
const PUBLIC_DOOR_THRESHOLD = WORLD_RULES.FILE_FOLDER_PUBLIC_DOOR_THRESHOLD_FLAME_COIN
const FILE_FOLDER_NGN = (FILE_FOLDER_FLAME_COIN * FLAME_COIN_RATE).toLocaleString()
const BRIDGER_30_FLAME_COIN = (FILE_FOLDER_FLAME_COIN * WORLD_RULES.BRIDGER_YIELD_RATE).toLocaleString()
const BRIDGER_30_NGN = (FILE_FOLDER_FLAME_COIN * WORLD_RULES.BRIDGER_YIELD_RATE * FLAME_COIN_RATE).toLocaleString()

export const AGENT_CONTENT = {
  positionTitle: 'AGENT',
  positionSummary:
    'The Agent account is deliberately small. It exists for Agility and for commission created when an assigned Bridger purchases a Prospect package.',
  role: 'Operate Agility and receive the Agent commission from qualifying Bridger Prospect purchases.',
  earningMovements: [
    `You earn ${(WORLD_RULES.AGENT_LEAD_YIELD_RATE * 100).toFixed(0)}% when an assigned Bridger purchases a Prospect package through WEAVE.`,
  ],
  calculations: [
    `Prospect purchase example: 100 Flame Coin purchased by an assigned Bridger → ${(100 * WORLD_RULES.AGENT_LEAD_YIELD_RATE).toFixed(0)} Flame Coin Agent commission.`,
  ],
  movement: 'Agility → real-world distribution. Bridger Prospect purchase → Agent commission. Those are the Agent movements.',
}

export const BRIDGER_CONTENT = {
  positionTitle: 'BRIDGER',
  positionSummary:
    'The Bridger account has six operating places: Bridge AI, Deposit & Withdrawal, Worldwide Number Bay, Prospect Market, Echo and Presences.',
  role: 'Use those six places to acquire Prospect movement, operate the bridge and keep your account value and presence clear.',
  action: 'Prospect Market supplies authorized Prospect packages. Bridge AI carries the crossing interaction. Number Bay supplies authenticated numbers when required. Deposit & Withdrawal handles value movement. Echo and Presences keep intelligence and human presence visible.',
  earnings: [
    `A qualifying Client File Folder movement can still credit the Bridger according to the current ${(WORLD_RULES.BRIDGER_YIELD_RATE * 100).toFixed(0)}% rule; it does not require a separate Bridger account district.`,
  ],
  movement: 'Prospect Market → Bridge AI → recognized movement. Number Bay, value, Echo and Presences support that work when needed.',
  relationship: 'Client ownership stays with the Client. The Bridger account remains focused on the bridge rather than opening a second Client operating environment.',
}

export const FILE_FOLDER_CONTENT = {
  title: 'THE FILE FOLDER',
  subtitle: 'Your place inside System Switch',
  body: `A File Folder is the persistent open-world workshop created for one Client through System Switch. It is where the Client's movement becomes a continuing topic inside ${WEAVE_ARCHITECTURE.subject.name} and meets real blueprints, timed builds, inventory, completed systems, learning districts, people, AI technologies, company functions, records, and supports of Weave. One Client. One File Folder. One continuing environment.`,
  establishment: `When a Prospect purchases either a Standard or Premium File Folder and the payment is verified, their place in System Switch is established. Standard begins at ${STANDARD_FILE_FOLDER_MIN.toLocaleString()} Flame Coin and can be any value below the ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin Premium price. File Folder value establishes starting Build Power. A Client below ${PUBLIC_DOOR_THRESHOLD.toLocaleString()} Flame Coin can cross, learn and begin early builds, but the first public Customer Door stops at a funding gate until later verified Client deposits bring total participation to at least ${PUBLIC_DOOR_THRESHOLD.toLocaleString()} Flame Coin. Higher verified participation increases construction speed. The Folder then carries the Client’s enterprise, decisions, actions, support, learning, builds, Customer Door and continuing systems.`,
}

export const BRIDGE_PLAZA_CONTENT = {
  title: 'BRIDGE PLAZA',
  subtitle: 'Role entrance',
  body: 'Bridge Plaza organizes the places that belong to the current position. Agent and Bridger accounts enter their own small role district instead of inheriting every shared WEAVE surface.',
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
    'WEAVE has four live user roles. Administration governs the institution. Agents operate Agility and Prospect-purchase commissions. Bridgers operate Bridge AI, value movement, Number Bay, Prospect Market, Echo and Presences. Clients operate their Client world and File Folder.',
  institutionalFlow: 'Administration · Agent · Bridger · Client',
  clientFlow: 'Prospect movement → Bridge AI → Client crossing → Client-owned File Folder',
}

export const TERMS_SECTIONS = [
  { title: '1. Acceptance', body: "By accepting your Agent appointment or Bridger partnership, you agree to follow WEAVE's operational rules, policies, confidentiality requirements, and lawful instructions." },
  { title: '2. Agent Status', body: 'An Agent is an employee and authorized representative of WEAVE. The Agent does not receive ownership or partnership rights in the Company unless separately agreed in writing.' },
  { title: '3. Bridger Status', body: 'A Bridger is an independent operational partner and is not an employee of WEAVE. A Bridger does not receive ownership of the Company.' },
  { title: '4. Bridger Earning Movement', body: 'A Bridger earns 30% of the actual verified File Folder purchase value when a prospect they guide becomes a Weave Client. A Standard File Folder may be any value from 180 Flame Coin up to anything below 35,800; the Premium File Folder is fixed at 35,800 Flame Coin.' },
  { title: '5. Agent Earning Movement', body: 'An Agent earns the configured Agent commission when an assigned Bridger purchases a Prospect package through WEAVE. Number Bay purchases, Client deposits and other Bridger activity do not create Agent commission.' },
  { title: '6. The File Folder', body: `The File Folder is the persistent open-world workshop owned and operated by one Client through System Switch. Agent and Bridger accounts do not receive or operate a second Client File Folder surface. Standard access begins at ${STANDARD_FILE_FOLDER_MIN.toLocaleString()} Flame Coin and may be any value below the ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin Premium price. Premium remains fixed at ${FILE_FOLDER_FLAME_COIN.toLocaleString()} Flame Coin. File Folder value establishes starting Build Power. Below ${PUBLIC_DOOR_THRESHOLD.toLocaleString()} Flame Coin, the Client can cross and begin early participation but must add verified Flame Coin before the first public Customer Door opens; additional verified participation can accelerate build timers.` },
  { title: '7. System Switch', body: `System Switch is the Client's crossing into the Main File Folder. Once opened, the File Folder is the persistent world where the Client's personalized workshop continues through blueprints, timed formation, build inventory, active systems, the Library District, support participation and real company work inside the fixed subject: ${WEAVE_ARCHITECTURE.subject.name}.` },
  { title: '8. Bridge Plaza', body: 'Bridge Plaza is role-aware. It organizes the operating places assigned to the current position. Agent and Bridger accounts do not gain extra Client, marketplace, lounge, game or support surfaces merely by entering Bridge Plaza.' },
  { title: '9. Company Information', body: 'Agents and Bridgers must protect confidential Company information, Client information, operational procedures, internal communications, and system information during and after their relationship with WEAVE.' },
  { title: '10. Client Information', body: 'Client contact information supplied or generated through Company operations must be used only for authorized WEAVE activities. It must not be sold, transferred, or misused.' },
  { title: '11. No Unauthorized Representation', body: 'Agents and Bridgers may only represent WEAVE within the authority granted to them. They must not create unauthorized commitments, contracts, promises, or financial obligations on behalf of the Company.' },
  { title: '12. Conduct', body: 'Misconduct, fraud, false information, harassment, misuse of Client information, breach of confidentiality, or conduct that damages the interests of WEAVE may result in suspension or termination.' },
  { title: '13. Termination', body: "The Company may suspend or terminate an Agent's employment or a Bridger's partnership for breach of these terms, Company policies, confidentiality obligations, or operational requirements." },
]

