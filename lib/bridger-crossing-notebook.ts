import { FILE_FOLDER_PRICING } from '@/lib/file-folder-pricing'
import { WORLD_RULES } from '@/lib/world/constants'

export type BridgerCrossingStep = {
  key: string
  phase: string
  title: string
  meaning: string
  say: string[]
  doNotSay: string[]
  moveWhen: string
}

const STANDARD_MIN = FILE_FOLDER_PRICING.standardMinimumFlameCoin
const PREMIUM = FILE_FOLDER_PRICING.premiumFlameCoin
const PUBLIC_DOOR = WORLD_RULES.FILE_FOLDER_PUBLIC_DOOR_THRESHOLD_FLAME_COIN

export const BRIDGER_CROSSING_RULES = [
  'Human first. Do not begin with a File Folder price.',
  'Listen before explaining WEAVE.',
  'Never promise income, customers, profit or a guaranteed result.',
  'Never present a File Folder as an investment.',
  'Do not send the Bridge until the prospect understands why the next step is relevant.',
  'Tell the truth about Standard, Premium and the Customer Door threshold.',
  'The Bridger accompanies the crossing. The Client owns the private File Folder.',
] as const

export const BRIDGER_CROSSING_STEPS: BridgerCrossingStep[] = [
  {
    key: 'meet-human',
    phase: 'Human',
    title: 'Meet the Human',
    meaning: 'Begin with ordinary human contact. Your first job is not to sell. Your first job is to discover what is already moving in this person\'s life, work, skill, business or idea.',
    say: [
      'Hello [Name]. My name is [Bridger Name]. I\'m a Bridger with WEAVE.',
      'I work with people around something they are already trying to build, sell, organize or move forward in their life or work.',
      'Can I ask what you currently do, or what you\'re trying to make work better?',
    ],
    doNotSay: [
      'Do not open with a price.',
      'Do not send a Bridge link in the first sentence.',
      'Do not tell the person they were specially selected or verified unless that is actually known.',
    ],
    moveWhen: 'The prospect has answered with something real about their life, work, business, idea or present need.',
  },
  {
    key: 'listen',
    phase: 'Human',
    title: 'Listen',
    meaning: 'Stay with what the prospect actually said. Ask one simple question that helps you understand the existing movement instead of giving a long WEAVE explanation.',
    say: [
      'How does that work for you today?',
      'How do people currently find you, buy from you or work with you?',
      'What part of it are you trying to make better right now?',
    ],
    doNotSay: [
      'Do not answer a simple need with ten solutions.',
      'Do not redirect the conversation toward WEAVE before you understand the person.',
      'Do not manufacture urgency.',
    ],
    moveWhen: 'You can describe in one sentence what the prospect is already doing and what they want to improve.',
  },
  {
    key: 'recognize',
    phase: 'Recognition',
    title: 'Recognize the Movement',
    meaning: 'Name the useful thing that already exists. A person may already have a business, skill, audience, customers, work pattern or idea that needs more room rather than a complete restart.',
    say: [
      'You already have something moving.',
      'What I am hearing is that [repeat the real movement] is working, but [repeat the real limitation] is where you want more room.',
      'That gives us something real to work with.',
    ],
    doNotSay: [
      'Do not exaggerate what the prospect has.',
      'Do not tell them WEAVE will automatically solve the problem.',
      'Do not convert their words into a money promise.',
    ],
    moveWhen: 'The prospect agrees that you have understood what is actually moving.',
  },
  {
    key: 'connect-weave',
    phase: 'Recognition',
    title: 'Connect WEAVE',
    meaning: 'Explain only the part of WEAVE that is relevant to the movement you just recognized. The prospect should understand why WEAVE might fit before hearing about crossing.',
    say: [
      'WEAVE is an interactional company. It gives real human movement an operating environment where it can be organized, built and continued.',
      'For what you just described, the useful part is not starting over. It is giving that movement a place where systems can be formed around it.',
      'If that is useful to you, I can open the next part and let WEAVE begin from what you are actually trying to do.',
    ],
    doNotSay: [
      'Do not describe every WEAVE department.',
      'Do not overload the prospect with internal language.',
      'Do not make the company sound like a guaranteed earning scheme.',
    ],
    moveWhen: 'The prospect understands the relevance and wants to see or continue.',
  },
  {
    key: 'open-bridge',
    phase: 'Bridge',
    title: 'Ask Before Opening the Bridge',
    meaning: 'The Bridge is the next movement, not the first message. Ask permission. This keeps the prospect in control of the crossing.',
    say: [
      'Rather than giving you a long explanation, I can open your WEAVE Bridge.',
      'The Bridge begins with what you are actually trying to do. Opening it does not force you to purchase anything.',
      'Would you like me to send it?',
    ],
    doNotSay: [
      'Do not send the Bridge before the prospect agrees.',
      'Do not imply that clicking the link creates an obligation.',
      'Do not call the Bridge a payment link.',
    ],
    moveWhen: 'The prospect says yes or clearly asks to enter the Bridge.',
  },
  {
    key: 'bridge-radiance',
    phase: 'Bridge',
    title: 'Accompany Bridge Radiance',
    meaning: 'After the prospect enters, remain present. Bridge AI supports the movement, but the Bridger still carries the human relationship.',
    say: [
      'You should now be inside Bridge Radiance.',
      'Begin with what is actually moving in your own life or work. You do not need to understand every part of WEAVE at once.',
      'What did you enter with, and what are you trying to build, solve or move forward?',
    ],
    doNotSay: [
      'Do not disappear immediately after sending the Bridge.',
      'Do not speak as if Bridge AI replaces the Bridger relationship.',
      'Do not rush the prospect from arrival straight into payment.',
    ],
    moveWhen: 'The prospect has engaged with the Bridge and understands the movement they want to carry forward.',
  },
  {
    key: 'file-folder',
    phase: 'File Folder',
    title: 'Introduce the File Folder',
    meaning: 'Now explain the Client crossing. The File Folder is the Client\'s persistent operating environment inside System Switch, not an ordinary digital folder.',
    say: [
      'The next crossing is the File Folder.',
      'The File Folder establishes your Client position and gives your movement a persistent operating environment inside System Switch.',
      'After the movement is verified, Administration issues your File Number. You establish your Client identity and enter your own System Switch environment.',
    ],
    doNotSay: [
      'Do not describe the File Folder as a passive membership.',
      'Do not say the Bridger owns or controls the Client File Folder.',
      'Do not hide that payment must be verified before the File Number is issued.',
    ],
    moveWhen: 'The prospect can explain back that the File Folder becomes their continuing Client operating environment.',
  },
  {
    key: 'what-builds',
    phase: 'File Folder',
    title: 'Explain What Can Be Built',
    meaning: 'Connect the File Folder to real operating functions already present in the Client environment. Keep the explanation tied to the prospect\'s movement.',
    say: [
      'Inside the File Folder, Clients can work from blueprints, obtain build materials and parts, form systems, accelerate builds and operate completed systems.',
      'The current environment also carries Market + Customers, Customer Door development and enterprise growth when those movements become relevant.',
      'Your File Folder does not need to become the same business as another Client\'s. It develops around your own movement.',
    ],
    doNotSay: [
      'Do not promise that every system is instantly available at entry.',
      'Do not promise customers merely because a Customer Door can be built.',
      'Do not describe unfinished functions as completed outcomes.',
    ],
    moveWhen: 'The prospect understands what the operating environment is for and asks about entry value or the next movement.',
  },
  {
    key: 'standard',
    phase: 'Value',
    title: 'Explain Standard Properly',
    meaning: `Standard can establish a File Folder from ${STANDARD_MIN.toLocaleString()} Flame Coin up to any amount below Premium. The amount establishes starting Build Power, but a low Standard entry does not immediately open every public function.`,
    say: [
      `Standard begins at ${STANDARD_MIN.toLocaleString()} Flame Coin and can be any value below ${PREMIUM.toLocaleString()} Flame Coin.`,
      `You can cross, enter the File Folder, learn the environment and begin early building from a smaller Standard position.`,
      `The first public Customer Door remains gated until verified participation reaches ${PUBLIC_DOOR.toLocaleString()} Flame Coin.`,
    ],
    doNotSay: [
      `Do not tell somebody that ${STANDARD_MIN.toLocaleString()} Flame Coin gives the same starting position as Premium.`,
      'Do not hide the Customer Door threshold.',
      'Do not pressure the prospect to choose a higher amount than they can genuinely carry.',
    ],
    moveWhen: 'The prospect understands both what Standard opens and what remains gated below the Customer Door threshold.',
  },
  {
    key: 'premium',
    phase: 'Value',
    title: 'Explain Premium Properly',
    meaning: `Premium is the fixed ${PREMIUM.toLocaleString()} Flame Coin File Folder position. It establishes substantially more starting Build Power than a low Standard entry and currently enables the private Premium Sound Room/DJ environment.`,
    say: [
      `Premium is fixed at ${PREMIUM.toLocaleString()} Flame Coin.`,
      'It establishes the File Folder at that full starting value instead of beginning from a smaller Standard position.',
      'Whether Premium makes sense depends on what you are actually trying to build and the position you genuinely want to establish.',
    ],
    doNotSay: [
      'Do not claim Premium guarantees a financial return.',
      'Do not make Premium sound compulsory when Standard is valid.',
      'Do not invent Premium benefits that are not present in the system.',
    ],
    moveWhen: 'The prospect understands the difference and can decide without pressure.',
  },
  {
    key: 'money-question',
    phase: 'Truth',
    title: 'Answer the Money Question',
    meaning: 'When a prospect asks whether they will make money, separate operating capability from financial outcome. WEAVE must not be sold as guaranteed income.',
    say: [
      'I cannot truthfully promise you income simply because you purchase a File Folder.',
      'The File Folder gives you an operating environment for building and running systems around real movement.',
      'What comes from it depends on what you build, what you operate, what you offer people and how that movement performs in the real world.',
    ],
    doNotSay: [
      'Do not promise a return on the File Folder value.',
      'Do not promise customers, sales or profit.',
      'Do not call the File Folder an investment product.',
    ],
    moveWhen: 'The prospect understands that purchase establishes an operating environment, not a guaranteed financial result.',
  },
  {
    key: 'objections',
    phase: 'Truth',
    title: 'Handle Objections Without Pressure',
    meaning: 'An objection is information. Answer it directly and preserve the person\'s freedom to decide.',
    say: [
      'If Premium is too much, do not begin there simply because Premium exists. Standard exists so a person can establish a smaller starting position.',
      'The reason to establish a File Folder is to move from only looking at WEAVE into your own Client operating environment.',
      'We should look at what you are actually trying to do and what level of participation you can genuinely carry.',
    ],
    doNotSay: [
      'Do not shame hesitation.',
      'Do not use fake deadlines or scarcity.',
      'Do not tell the prospect to borrow money or overextend themselves.',
    ],
    moveWhen: 'The prospect either chooses to continue or clearly chooses not to. Both outcomes must be respected.',
  },
  {
    key: 'establish',
    phase: 'Crossing',
    title: 'Establish the File Folder',
    meaning: 'When the prospect chooses to continue, guide them through the actual File Folder environment. The system—not a private Bridger wallet—shows the Company movement details.',
    say: [
      'Choose the File Folder position you genuinely want to begin with.',
      'The File Folder environment will show the movement amount, the Company TRX wallet and where to submit the transaction hash.',
      'Inside the current system, 1 Flame Coin represents 1 TRX.',
    ],
    doNotSay: [
      'Do not substitute a personal wallet for the Company wallet shown by WEAVE.',
      'Do not alter the displayed File Folder amount outside the permitted Standard or Premium rules.',
      'Do not ask the prospect to send payment evidence outside the authorized crossing if the environment accepts it.',
    ],
    moveWhen: 'The prospect has deliberately chosen a tier/value and submitted the actual payment movement through WEAVE.',
  },
  {
    key: 'verification',
    phase: 'Crossing',
    title: 'Wait for Verification',
    meaning: 'Submission is not approval. Administration must verify the movement before the File Number can be issued.',
    say: [
      'Your File Folder movement has been submitted.',
      'Administration now has to verify the transaction.',
      'Do not send another payment simply because verification is still pending.',
    ],
    doNotSay: [
      'Do not tell the prospect the File Folder is approved before Administration confirms it.',
      'Do not ask for a duplicate payment while the first movement is pending.',
      'Do not invent a verification result.',
    ],
    moveWhen: 'WEAVE reports that Administration approved the File Folder and issued a File Number.',
  },
  {
    key: 'file-number',
    phase: 'Client',
    title: 'File Number Issued',
    meaning: 'The verified File Folder movement now has an institutional identity. The File Number carries the person from Prospect position into Client establishment.',
    say: [
      'Your File Folder has been verified and your File Number has been issued.',
      'That File Number now carries this movement into your Client position.',
      'The next step is to establish your Client identity with that File Number.',
    ],
    doNotSay: [
      'Do not treat the File Number as a public password.',
      'Do not claim the Client environment is active before the registration/crossing completes.',
      'Do not keep the prospect in a Prospect-only conversation after Client establishment begins.',
    ],
    moveWhen: 'The person has established their Client identity and can enter System Switch.',
  },
  {
    key: 'client-crossing',
    phase: 'Client',
    title: 'Client Crossing',
    meaning: 'The person is now entering their own Client world. The Bridger supports continuity but does not take ownership of the private File Folder.',
    say: [
      'From this point, this becomes your Client environment.',
      'Enter System Switch with your Client identity and File Number and begin from the movement you already established.',
      'Your Bridger remains connected to you, but your private File Folder belongs to your Client position.',
    ],
    doNotSay: [
      'Do not ask for access to the Client\'s private File Folder credentials.',
      'Do not operate the Client world as if it belongs to the Bridger.',
      'Do not end the human relationship merely because the purchase completed.',
    ],
    moveWhen: 'The Client has entered System Switch and knows where to continue their File Folder movement.',
  },
  {
    key: 'continuity',
    phase: 'Continuity',
    title: 'Remain the Bridger',
    meaning: 'Crossing is not abandonment. The Bridger remains an authorized human relationship while Bridge AI and WEAVE functions support the Client\'s continuing movement.',
    say: [
      'I remain your Bridger for crossing and continuity support.',
      'If the next movement needs another WEAVE position, I will help you reach the right place rather than pretending to own that function.',
      'Your File Folder stays private to your Client position. When you open public Customer Doors, those public enterprise surfaces can be encountered through WEAVE.',
    ],
    doNotSay: [
      'Do not create dependency on the Bridger.',
      'Do not claim authority belonging to Administration, Forensics, Mandate or Attorney.',
      'Do not treat the Client relationship as finished after commission is earned.',
    ],
    moveWhen: 'The relationship has moved from conversion into truthful Client continuity.',
  },
]

export const BRIDGER_CROSSING_NOTEBOOK = {
  title: 'Bridger Crossing Notebook',
  subtitle: 'Human → recognition → Bridge → File Folder → Client continuity',
  instruction: 'Read one step. Practice the words. Move only when the human movement is ready. Turn the page manually.',
  steps: BRIDGER_CROSSING_STEPS,
} as const
