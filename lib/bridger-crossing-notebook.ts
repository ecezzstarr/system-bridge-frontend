import { FILE_FOLDER_PRICING } from '@/lib/file-folder-pricing'

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
const STANDARD_MAX = FILE_FOLDER_PRICING.standardMaximumFlameCoin
const PRO_START = FILE_FOLDER_PRICING.proStartingFlameCoin
const PRO_NEGOTIATED_MIN = FILE_FOLDER_PRICING.proNegotiatedMinimumFlameCoin
const PREMIUM = FILE_FOLDER_PRICING.premiumFlameCoin

export const BRIDGER_CROSSING_RULES = [
  'Human first. Do not begin with a File Folder price.',
  'Listen before explaining WEAVE.',
  'Never promise income, customers, profit or a guaranteed result.',
  'Never present a File Folder as an investment.',
  'Do not send the Bridge until the prospect understands why the next step is relevant.',
  'For prospect sales, explain Pro and Premium truthfully. Standard is the normal WEAVE building-power range after entry, not the default external sales offer.',
  'Every purchased File Folder includes Customer Door construction; do not invent a separate Customer Door funding threshold.',
  'The Bridger accompanies the crossing. The Client owns the private File Folder.',
] as const

export const BRIDGER_CROSSING_STEPS: BridgerCrossingStep[] = [
  {
    key: 'meet-human',
    phase: 'Human',
    title: 'Meet the Human',
    meaning: 'Begin with ordinary human contact. Discover what is already moving in the person’s life, work, skill, business or idea before presenting WEAVE.',
    say: [
      'Hello [Name]. My name is [Bridger Name]. I’m a Bridger with WEAVE.',
      'I work with people around something they are already trying to build, sell, organize or move forward in their life or work.',
      'Can I ask what you currently do, or what you’re trying to make work better?',
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
    meaning: 'Stay with what the prospect actually said. Ask one simple question that helps you understand the existing movement.',
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
    meaning: 'Name the useful thing that already exists so the prospect can see what WEAVE would be working with rather than starting from zero.',
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
    moveWhen: 'The prospect agrees that you understood what is actually moving.',
  },
  {
    key: 'connect-weave',
    phase: 'Recognition',
    title: 'Connect WEAVE',
    meaning: 'Explain only the part of WEAVE that is relevant to the movement you just recognized.',
    say: [
      'WEAVE gives real human movement an operating environment where it can be organized, built and continued.',
      'For what you described, the useful part is giving that movement a place where systems can be formed around it.',
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
    meaning: 'The Bridge is the next movement, not the first message. Ask permission and keep the prospect in control.',
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
    key: 'file-folder',
    phase: 'File Folder',
    title: 'Introduce the File Folder',
    meaning: 'The File Folder is the Client’s persistent operating environment inside System Switch, not an ordinary digital folder or passive membership.',
    say: [
      'The next crossing is the File Folder.',
      'It establishes your Client position and gives your movement a persistent operating environment inside System Switch.',
      'After payment is verified, Administration issues your File Number and the included Customer Door construction begins.',
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
    meaning: 'Connect the File Folder to real operating functions already present in the Client environment and to the prospect’s movement.',
    say: [
      'Inside the File Folder, Clients can work from blueprints, obtain materials and parts, form systems, accelerate builds and operate completed systems.',
      'The File Folder also carries the Customer Door, products and services, customer activity, Bridge AI and later enterprise growth.',
      'Your File Folder develops around your own movement rather than becoming a copy of another Client’s business.',
    ],
    doNotSay: [
      'Do not promise that every system is instantly completed at entry.',
      'Do not promise customers merely because a Customer Door is included.',
      'Do not describe unfinished functions as completed outcomes.',
    ],
    moveWhen: 'The prospect understands what the operating environment is for and asks about value or the next movement.',
  },
  {
    key: 'pro',
    phase: 'Value',
    title: 'Explain Pro Properly',
    meaning: `Pro is the File Folder WEAVE sells to prospects. Its normal starting value is ${PRO_START.toLocaleString()} Flame Coin. Administration may negotiate an external Pro sale down to ${PRO_NEGOTIATED_MIN.toLocaleString()} Flame Coin.`,
    say: [
      `Pro normally starts at ${PRO_START.toLocaleString()} Flame Coin.`,
      `If there is a real negotiation, Administration can approve Pro as low as ${PRO_NEGOTIATED_MIN.toLocaleString()} Flame Coin.`,
      'A negotiated Pro sale remains Pro even when its amount overlaps the 3,000 Flame Coin Standard maximum.',
    ],
    doNotSay: [
      `Do not present ${PRO_NEGOTIATED_MIN.toLocaleString()} Flame Coin as the normal Pro starting price.`,
      'Do not secretly lower a Pro price without the negotiation being part of the sales movement.',
      'Do not promise a financial return from buying Pro.',
    ],
    moveWhen: 'The prospect understands the normal Pro starting value and that a lower Pro value is a negotiated sale, not the default price.',
  },
  {
    key: 'standard',
    phase: 'Value',
    title: 'Keep Standard in Its Proper Place',
    meaning: `Standard is the normal WEAVE building-power range from ${STANDARD_MIN.toLocaleString()} to ${STANDARD_MAX.toLocaleString()} Flame Coin. It is distinct from the external Pro sales movement.`,
    say: [
      `Inside the normal WEAVE process, Standard building power runs from ${STANDARD_MIN.toLocaleString()} to ${STANDARD_MAX.toLocaleString()} Flame Coin.`,
      `At exactly ${STANDARD_MAX.toLocaleString()} Flame Coin, a normal WEAVE purchase can be Standard while an explicitly negotiated external sale can be Pro.`,
      'The system preserves that distinction by recording the sale classification, not only the amount.',
    ],
    doNotSay: [
      `Do not call values above ${STANDARD_MAX.toLocaleString()} Flame Coin Standard.`,
      'Do not use Standard to erase an explicitly negotiated Pro sale at the overlap point.',
      'Do not invent a Customer Door threshold; the purchased File Folder includes Customer Door construction.',
    ],
    moveWhen: 'The Bridger can distinguish the internal Standard building-power range from the prospect-facing Pro sales product.',
  },
  {
    key: 'premium',
    phase: 'Value',
    title: 'Explain Premium Properly',
    meaning: `Premium is fixed at ${PREMIUM.toLocaleString()} Flame Coin and establishes the File Folder at the full Premium starting value.`,
    say: [
      `Premium is fixed at ${PREMIUM.toLocaleString()} Flame Coin.`,
      'Premium is not a negotiated Pro sale; it is the fixed Premium File Folder position.',
      'Whether Premium makes sense depends on what the person genuinely wants to build and carry.',
    ],
    doNotSay: [
      'Do not claim Premium guarantees a financial return.',
      'Do not make Premium compulsory.',
      'Do not invent Premium benefits that are not present in the system.',
    ],
    moveWhen: 'The prospect understands the difference between negotiated Pro and fixed Premium and can decide without pressure.',
  },
  {
    key: 'money-question',
    phase: 'Truth',
    title: 'Answer the Money Question',
    meaning: 'Separate operating capability from financial outcome. WEAVE must not be sold as guaranteed income.',
    say: [
      'I cannot truthfully promise you income simply because you purchase a File Folder.',
      'The File Folder gives you an operating environment for building and running systems around real movement.',
      'What comes from it depends on what you build, operate, offer people and how that movement performs in real life.',
    ],
    doNotSay: [
      'Do not promise a return on the File Folder value.',
      'Do not promise customers, sales or profit.',
      'Do not call the File Folder an investment product.',
    ],
    moveWhen: 'The prospect understands that purchase establishes an operating environment, not a guaranteed financial result.',
  },
  {
    key: 'establish',
    phase: 'Crossing',
    title: 'Establish the File Folder',
    meaning: 'When the prospect chooses to continue, guide them through the actual Company payment movement. The Bridger does not replace the WEAVE payment and Administration verification system.',
    say: [
      'Choose the File Folder position you genuinely want to establish.',
      'WEAVE will show the movement amount, Company TRX wallet and where to submit the transaction hash.',
      'Inside the current system, 1 Flame Coin represents 1 TRX.',
    ],
    doNotSay: [
      'Do not substitute a personal wallet for the Company wallet shown by WEAVE.',
      'Do not alter the agreed Pro or fixed Premium value after the payment movement begins.',
      'Do not claim payment is approved before Administration verifies it.',
    ],
    moveWhen: 'The prospect deliberately chooses the File Folder sale and submits the actual payment movement through WEAVE.',
  },
  {
    key: 'file-number',
    phase: 'Client',
    title: 'File Number Issued',
    meaning: 'After Administration verifies the File Folder, the File Number carries the person from Prospect into Client establishment.',
    say: [
      'Your File Folder has been verified and your File Number has been issued.',
      'That File Number now carries this movement into your Client position.',
      'The next step is to establish your Client identity and enter System Switch.',
    ],
    doNotSay: [
      'Do not treat the File Number as a public password.',
      'Do not claim approval before WEAVE reports it.',
      'Do not keep the person in a Prospect-only conversation after Client establishment begins.',
    ],
    moveWhen: 'The person has established their Client identity and can enter System Switch.',
  },
  {
    key: 'continuity',
    phase: 'Continuity',
    title: 'Remain the Bridger',
    meaning: 'Crossing is not abandonment. The Bridger remains an authorized human relationship while the Client owns and operates the private File Folder.',
    say: [
      'I remain your Bridger for crossing and continuity support.',
      'If the next movement needs another WEAVE position, I will help you reach the right place rather than pretending to own that function.',
      'Your File Folder stays private to your Client position. Your completed Customer Door is the public boundary people can enter.',
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
