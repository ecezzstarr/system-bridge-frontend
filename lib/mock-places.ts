// Mock data for Market, Arena, and Lounge places

export interface MarketItem {
  id: string
  name: string
  description: string
  price: number // in TRX
  seller: string
  sellerAvatar: string
  image?: string
  category: string
  rating: number
}

export interface ArenaGame {
  id: string
  name: string
  description: string
  entryFee: number // in TRX
  players: number
  maxPlayers: number
  status: 'waiting' | 'active' | 'finished'
  host: string
  prizePool: number
  createdAt: string
}

export interface ChatMessage {
  id: string
  sender: string
  senderAvatar: string
  content: string
  timestamp: string
  type: 'public' | 'private'
}

export interface PrivateChat {
  id: string
  participantName: string
  participantAvatar: string
  lastMessage: string
  lastMessageTime: string
  unread: number
}

// Market Items
export const marketItems: MarketItem[] = [
  {
    id: 'market_1',
    name: 'Digital Badge',
    description: 'Exclusive platform membership badge',
    price: 10,
    seller: 'platformadmin',
    sellerAvatar: '👑',
    category: 'badges',
    rating: 4.8,
  },
  {
    id: 'market_2',
    name: 'Presence Boost',
    description: 'Increase your presence strength by 25%',
    price: 25,
    seller: 'ssboperator',
    sellerAvatar: '🌟',
    category: 'boosters',
    rating: 4.9,
  },
  {
    id: 'market_3',
    name: 'Connection Token',
    description: 'Unlock 5 new connections this week',
    price: 15,
    seller: 'agent001',
    sellerAvatar: '🤝',
    category: 'tokens',
    rating: 4.6,
  },
  {
    id: 'market_4',
    name: 'Profile Theme',
    description: 'Exclusive dark neon theme for your profile',
    price: 5,
    seller: 'designer_ray',
    sellerAvatar: '🎨',
    category: 'themes',
    rating: 4.7,
  },
  {
    id: 'market_5',
    name: 'VIP Chat Access',
    description: '30 days of VIP chat rooms access',
    price: 50,
    seller: 'platformadmin',
    sellerAvatar: '👑',
    category: 'access',
    rating: 4.9,
  },
]

// Arena Games
export const arenaGames: ArenaGame[] = [
  {
    id: 'arena_1',
    name: 'Quick Draw - Speed Challenge',
    description: 'Fast-paced reaction game. Winner takes all!',
    entryFee: 5,
    players: 3,
    maxPlayers: 10,
    status: 'active',
    host: 'gamemaster_pro',
    prizePool: 45,
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 'arena_2',
    name: 'Trivia Master Tournament',
    description: 'Test your knowledge. 10 rounds of trivia.',
    entryFee: 10,
    players: 7,
    maxPlayers: 20,
    status: 'active',
    host: 'quiz_legend',
    prizePool: 140,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'arena_3',
    name: 'Dice Roller - Lucky Numbers',
    description: 'Roll the dice and win big! Low risk, high reward.',
    entryFee: 2,
    players: 15,
    maxPlayers: 100,
    status: 'active',
    host: 'lucky_roller',
    prizePool: 300,
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(),
  },
  {
    id: 'arena_4',
    name: 'Memory Challenge',
    description: 'Match pairs faster than your opponents.',
    entryFee: 8,
    players: 0,
    maxPlayers: 8,
    status: 'waiting',
    host: 'memory_king',
    prizePool: 0,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
]

// Public Chat Messages
export const publicChatMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    sender: 'alice_trader',
    senderAvatar: '👤',
    content: 'Just won big in the Trivia Tournament!',
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
    type: 'public',
  },
  {
    id: 'msg_2',
    sender: 'bob_gamer',
    senderAvatar: '🎮',
    content: 'Anyone want to join my Quick Draw game?',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    type: 'public',
  },
  {
    id: 'msg_3',
    sender: 'carol_collector',
    senderAvatar: '✨',
    content: 'Looking to buy that Premium Badge. Anyone selling?',
    timestamp: new Date(Date.now() - 90000).toISOString(),
    type: 'public',
  },
  {
    id: 'msg_4',
    sender: 'dave_hustler',
    senderAvatar: '💼',
    content: 'Presence ecosystem is amazing! Love this platform.',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    type: 'public',
  },
]

// Private Chats List
export const privateChatsList: PrivateChat[] = [
  {
    id: 'chat_1',
    participantName: 'jane_connector',
    participantAvatar: '🌐',
    lastMessage: 'Let me know about those items you mentioned!',
    lastMessageTime: new Date(Date.now() - 5 * 60000).toISOString(),
    unread: 2,
  },
  {
    id: 'chat_2',
    participantName: 'mike_partner',
    participantAvatar: '🤝',
    lastMessage: 'Great game today! Want to play again tomorrow?',
    lastMessageTime: new Date(Date.now() - 45 * 60000).toISOString(),
    unread: 0,
  },
  {
    id: 'chat_3',
    participantName: 'sarah_agent',
    participantAvatar: '📊',
    lastMessage: 'Your presence metrics are looking strong!',
    lastMessageTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    unread: 0,
  },
]

// Online users in Lounge
export const onlineUsers = [
  { name: 'alice_trader', avatar: '👤', status: 'active' },
  { name: 'bob_gamer', avatar: '🎮', status: 'active' },
  { name: 'carol_collector', avatar: '✨', status: 'idle' },
  { name: 'dave_hustler', avatar: '💼', status: 'active' },
  { name: 'jane_connector', avatar: '🌐', status: 'active' },
  { name: 'mike_partner', avatar: '🤝', status: 'away' },
]
