import { WORLD_RULES } from './world/constants'
import { WEAVE_ARCHITECTURE } from './weave-architecture'

export const CURRENT_TERMS_VERSION = 7

const TRX_RATE = WORLD_RULES.TRX_NGN_RATE
const FILE_FOLDER_TRX = WORLD_RULES.FILE_FOLDER_PRICE_TRX
const FILE_FOLDER_NGN = (FILE_FOLDER_TRX * TRX_RATE).toLocaleString()
const BRIDGER_30_TRX = (FILE_FOLDER_TRX * WORLD_RULES.BRIDGER_YIELD_RATE).toLocaleString()
const BRIDGER_30_NGN = (FILE_FOLDER_TRX * WORLD_RULES.BRIDGER_YIELD_RATE * TRX_RATE).toLocaleString()
const AGENT_5_TRX = (FILE_FOLDER_TRX * WORLD_RULES.AGENT_CROSSING_YIELD_RATE).toLocaleString()
const AGENT_5_NGN = (FILE_FOLDER_TRX * WORLD_RULES.AGENT_CROSSING_YIELD_RATE * TRX_RATE).toLocaleString()

export const AGENT_CONTENT = {
  positionTitle: 'YOUR POSITION IN WEAVE',
  positionSummary:
    "Weave is an interactional company. This whole platform is an interaction in motion real life gaming operating system for human presence. We create services, instruments, and systems that turn human participation into organized work, value, and opportunity. Weave of Presence builds systems, services and instruments around human participation. We work with people and their existing movement to create organized functions, work and value. As an Agent, you have a place inside that movement as a Weave employee.",
  role: 'Your role is to build, manage and support Bridgers who work with Weave.',
  earningMovements: [
    `You earn ${(WORLD_RULES.AGENT_LEAD_YIELD_RATE * 100).toFixed(0)}% whenever your Bridger purchases a prospect lead from the marketplace.`,
    `When that prospect becomes a Weave Client through the ${FILE_FOLDER_TRX.toLocaleString()} TRX File Folder, you earn 5% of Weave's 40% company percentage from that purchase.`,
  ],
  calculations: [
    `At ₦${TRX_RATE} per TRX:`,
    `File Folder: ${FILE_FOLDER_TRX.toLocaleString()} TRX = ₦${FILE_FOLDER_NGN}`,
    `Bridger's 30%: ${BRIDGER_30_TRX} TRX = ₦${BRIDGER_30_NGN}`,
    `Weave's 40% company percentage: ${(FILE_FOLDER_TRX * 0.4).toLocaleString()} TRX`,
    `Agent's 5%: ${AGENT_5_TRX} TRX = ₦${AGENT_5_NGN}`,
  ],
  movement: 'Build Bridgers → Bridger purchases prospects → support the movement → prospect becomes Client → earn from both movements. This is Loop 1 for the Weave Agent.',
  folderWork: 'Open Bridge Plaza. Select the Client\'s File Folder. Enter the environment. See what is moving. Participate where your function is required. Use Bridge AI where it extends the movement. Bring in the appropriate company support. Record what happens. Continue the relationship.',
}

export const BRIDGER_CONTENT = {
  positionTitle: 'YOUR POSITION IN WEAVE',
  positionSummary:
    'Weave is an interactional company. This whole platform is an interaction in motion real life gaming operating system for human presence. We create services, instruments, and systems that turn human participation into organized work, value, and opportunity. Weave of Presence builds systems, services and instruments around human participation. We work with people and their existing movement to create organized functions, work and value. As a Bridger, you have a place within that movement as a partner working with Weave.',
  role: 'Your role is to take a prospect provided through Weave, make the human connection, introduce the person to Weave and guide the interaction toward participation.',
  action: `You purchase prospects from the marketplace and use the available outreach system to contact them. When your prospect purchases the ${FILE_FOLDER_TRX.toLocaleString()} TRX File Folder, that prospect becomes a Client of Weave.`,
  earnings: [
    `At ₦${TRX_RATE} per TRX:`,
    `File Folder: ${FILE_FOLDER_TRX.toLocaleString()} TRX = ₦${FILE_FOLDER_NGN}`,
    `Your Bridger earning is ${(WORLD_RULES.BRIDGER_YIELD_RATE * 100).toFixed(0)}% of the File Folder price: ${BRIDGER_30_TRX} TRX = ₦${BRIDGER_30_NGN}`,
  ],
  movement: `Purchase prospect → make contact → bridge the prospect → prospect participates → File Folder purchase → prospect becomes Client → earn ${BRIDGER_30_TRX} TRX / ₦${BRIDGER_30_NGN}. This closes Loop 1 for the Bridger.`,
  relationship: 'The Bridger accompanies the Client beyond the first introduction. The File Folder gives that relationship a persistent place inside System Switch. You can return to the Client\'s environment, understand what has moved, communicate, coordinate support, and continue the bridge.',
}

export const FILE_FOLDER_CONTENT = {
  title: 'THE FILE FOLDER',
  subtitle: 'Your place inside System Switch',
  body: `A File Folder is the persistent workshop created for one Client at System Switch. It is where the Client's movement becomes a continuing topic inside ${WEAVE_ARCHITECTURE.subject.name} and meets the people, AI technologies, company functions, systems, records, and supports of Weave. One Client. One File Folder. One continuing environment.`,
  establishment: 'When a Prospect purchases a File Folder, their place in System Switch is established. The Folder then becomes the environment through which their enterprise, decisions, actions, needs, support, and progress can continue to move. Your File Folder is not a document. It is your working environment inside Weave.',
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
  clientFlow: 'WEAVE → Bridger relationship → Client entry → File Folder → File Number → Vault → Test Movement → Arena / Casino / Company services → continued relationship',
}

export const TERMS_SECTIONS = [
  { title: '1. Acceptance', body: "By accepting your Agent appointment or Bridger partnership, you agree to follow WEAVE's operational rules, policies, confidentiality requirements, and lawful instructions." },
  { title: '2. Agent Status', body: 'An Agent is an employee and authorized representative of WEAVE. The Agent does not receive ownership or partnership rights in the Company unless separately agreed in writing.' },
  { title: '3. Bridger Status', body: 'A Bridger is an independent operational partner and is not an employee of WEAVE. A Bridger does not receive ownership of the Company.' },
  { title: '4. Bridger Earning Movement', body: 'A Bridger earns 30% of the 35,800 TRX File Folder price when a prospect they guide becomes a Weave Client. This closes Loop 1 for the Bridger partnership.' },
  { title: '5. Agent Earning Movement', body: 'An Agent earns 30% on Bridger prospect lead purchases and 5% of Weave\'s 40% company percentage from File Folder purchases. This establishes Loop 1 for the Agent role.' },
  { title: '6. The File Folder', body: 'The File Folder is the persistent workshop at System Switch containing one Client and the Weave support assembled around that Client. It is issued upon purchase and establishes the Client\'s crossing.' },
  { title: '7. System Switch', body: `System Switch is the Client's crossing environment. It carries the Client and the current topic into the fixed subject: ${WEAVE_ARCHITECTURE.subject.name}. The Client's enterprise, workshop, store, problem, build, or other movement can continue there as the topic develops.` },
  { title: '8. Bridge Plaza', body: 'Bridge Plaza is the support entrance for Agents and Bridgers. It is where they select which File Folder environment to enter and visit.' },
  { title: '9. Company Information', body: 'Agents and Bridgers must protect confidential Company information, Client information, operational procedures, internal communications, and system information during and after their relationship with WEAVE.' },
  { title: '10. Client Information', body: 'Client contact information supplied or generated through Company operations must be used only for authorized WEAVE activities. It must not be sold, transferred, or misused.' },
  { title: '11. No Unauthorized Representation', body: 'Agents and Bridgers may only represent WEAVE within the authority granted to them. They must not create unauthorized commitments, contracts, promises, or financial obligations on behalf of the Company.' },
  { title: '12. Conduct', body: 'Misconduct, fraud, false information, harassment, misuse of Client information, breach of confidentiality, or conduct that damages the interests of WEAVE may result in suspension or termination.' },
  { title: '13. Termination', body: "The Company may suspend or terminate an Agent's employment or a Bridger's partnership for breach of these terms, Company policies, confidentiality obligations, or operational requirements." },
]

