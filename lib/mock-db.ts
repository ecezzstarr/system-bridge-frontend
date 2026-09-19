// Export interfaces
export type { MockUser, SweepRequest, AgentBridgerRelation, AgentPayment }

// Mock in-memory database - replace with real backend next week
// System uses real TRON wallets only - no fake data

interface MockUser {
  id: string
  email: string
  username: string
  name: string
  password: string
  role: 'agent' | 'bridger' | 'admin' | 'client'
  position?: 'Mandate' | 'Lawyer' | 'Forensic' | 'Admin'
  wallet_address?: string
  personal_wallet_address?: string
  departmental_code: string
  platform_wallet_balance: number
  escrow_balance: number
  assigned_by_admin: boolean
  created_at: string
}

// Sweep request for EIGHT to admin
interface SweepRequest {
  id: string
  amount: number
  from_user_id: string
  reason: string // 'game_loss', 'manual'
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requested_at: string
  approved_by?: string
  approved_at?: string
  completed_at?: string
}

// Agent-Bridger relationship (Agent manages up to 3 Bridgers)
interface AgentBridgerRelation {
  id: string
  agent_id: string
  bridger_id: string
  created_at: string
  status: 'active' | 'inactive'
}

// Agent Payment Record
interface AgentPayment {
  id: string
  agent_id: string
  amount: number
  month: string // YYYY-MM format
  paid_by_admin_id: string
  confirmed_functions: string // What work the agent did
  payment_date: string
  notes?: string
  status: 'pending' | 'completed'
}

// In-memory storage for registered users only
const users: Map<string, MockUser> = new Map()
const sweepRequests: Map<string, SweepRequest> = new Map()
const agentBridgerRelations: Map<string, AgentBridgerRelation> = new Map()
const agentPayments: Map<string, AgentPayment> = new Map()

// System operators - only real wallet addresses
const SYSTEM_OPERATORS: Record<string, Omit<MockUser, 'id' | 'created_at'>> = {
  ssboperator: {
    email: 'operator@ssbcompany.com',
    username: 'ssboperator',
    name: 'SSB System Operator',
    password: 'SSBOperator@2026',
    role: 'admin',
    wallet_address: process.env.COMPANY_TRON_WALLET || '', // Real company wallet
    departmental_code: 'CAT',
    platform_wallet_balance: 0,
    escrow_balance: 0,
    assigned_by_admin: true,
  },
  platformadmin: {
    email: 'ecezzstarr@gmail.com',
    username: 'platformadmin',
    name: 'Platform Admin',
    password: 'PlatformAdmin@2026',
    role: 'admin',
    wallet_address: process.env.PLATFORM_TRON_WALLET || '', // Real platform wallet
    personal_wallet_address: process.env.COMPANY_WALLET_ADDRESS || 'THGBvmPt3XEb8mbSRXViA93GkW3PpCanJk', // Company master wallet
    departmental_code: 'CAT',
    platform_wallet_balance: 50000,
    escrow_balance: 0,
    assigned_by_admin: true,
  },
  agentuser: {
    email: 'agent@ssbnow.shop',
    username: 'agentuser',
    name: 'Agent Operations',
    password: 'Agent@2026',
    role: 'agent',
    position: 'Mandate',
    wallet_address: process.env.AGENT_TRON_WALLET || '',
    personal_wallet_address: '',
    departmental_code: 'STABILITY',
    platform_wallet_balance: 5000,
    escrow_balance: 0,
    assigned_by_admin: true,
  },
  bridgeruser: {
    email: 'bridger@ssbnow.shop',
    username: 'bridgeruser',
    name: 'Bridger Systems',
    password: 'Bridger@2026',
    role: 'bridger',
    wallet_address: process.env.BRIDGER_TRON_WALLET || '',
    personal_wallet_address: '',
    departmental_code: 'HOPE',
    platform_wallet_balance: 2500,
    escrow_balance: 0,
    assigned_by_admin: true,
  },
}

// Role mapping from departmental codes
const roleMap: Record<string, 'agent' | 'bridger' | 'admin'> = {
  HOPE: 'bridger',
  STABILITY: 'agent',
  CAT: 'admin',
}

// Initialize system operators immediately (synchronously)
Object.entries(SYSTEM_OPERATORS).forEach(([username, userData]) => {
  const user: MockUser = {
    id: `user_${username}_system`,
    ...userData,
    created_at: new Date().toISOString(),
  }
  users.set(username, user)
  // Also index by email for faster lookup
  users.set(userData.email.toLowerCase(), user)
})

// Initialize test bridger assignments (agent manages 1 test bridger)
const agent = getUserByUsername('agentuser')
const bridger = getUserByUsername('bridgeruser')

if (agent && bridger) {
  const agentId = agent.id
  const bridgerId = bridger.id
  
  const relation: AgentBridgerRelation = {
    id: `relation_test_1`,
    agent_id: agentId,
    bridger_id: bridgerId,
    created_at: new Date().toISOString(),
    status: 'active',
  }
  
  agentBridgerRelations.set(relation.id, relation)
}

export function getUserByEmail(email: string): MockUser | undefined {
  // Try direct lookup first (if email was used as key)
  const userByEmail = users.get(email.toLowerCase())
  if (userByEmail && 'email' in userByEmail) {
    return userByEmail as MockUser
  }
  // Fall back to searching all users
  return Array.from(users.values()).find(u => u.email?.toLowerCase() === email.toLowerCase())
}

export function getUserByUsername(username: string): MockUser | undefined {
  return users.get(username)
}

export function createUser(data: {
  email: string
  username: string
  name: string
  password: string
  role: 'agent' | 'bridger'
  department: string
}): MockUser {
  const id = `user_${Date.now()}`

  const user: MockUser = {
    id,
    email: data.email,
    username: data.username,
    name: data.name,
    password: data.password,
    role: data.role, // Use role directly from registration
    departmental_code: data.department,
    platform_wallet_balance: 0,
    escrow_balance: 0,
    assigned_by_admin: true, // User selected their own role/department
    personal_wallet_address: '', // User can add their own wallet
    created_at: new Date().toISOString(),
  }

  users.set(data.username, user)
  return user
}

export function authenticateUser(email: string, password: string): MockUser | null {
  const user = getUserByEmail(email)
  if (user && user.password === password) {
    return user
  }
  return null
}

export function getUserById(id: string): MockUser | undefined {
  return Array.from(users.values()).find(u => u.id === id)
}

export function getAllUsers(): MockUser[] {
  return Array.from(users.values())
}

// Get unassigned users (need admin assignment)
export function getUnassignedUsers(): MockUser[] {
  return Array.from(users.values()).filter(u => !u.assigned_by_admin && u.role !== 'admin')
}

// Admin assigns user to department
export function assignUserDepartment(userId: string, departmental_code: string): boolean {
  const user = getUserById(userId)
  if (!user) return false
  
  user.departmental_code = departmental_code
  user.role = roleMap[departmental_code] || 'client'
  user.assigned_by_admin = true
  return true
}

// User deposits to platform wallet
export function depositToPlatformWallet(userId: string, amount: number): boolean {
  const user = getUserById(userId)
  if (!user) return false
  
  user.platform_wallet_balance += amount
  return true
}

// Update user's personal wallet address
export function updatePersonalWalletAddress(userId: string, walletAddress: string): boolean {
  const user = getUserById(userId)
  if (!user) return false
  
  user.personal_wallet_address = walletAddress
  return true
}

// Update user balance (for sweeps, payments, etc)
export function updateUserBalance(userId: string, newBalance: number, walletType: 'platform' | 'escrow' = 'platform'): boolean {
  const user = getUserById(userId)
  if (!user) return false
  
  if (walletType === 'platform') {
    user.platform_wallet_balance = Math.max(0, newBalance)
  } else if (walletType === 'escrow') {
    user.escrow_balance = Math.max(0, newBalance)
  }
  
  return true
}

// Get user's personal wallet address
export function getPersonalWalletAddress(userId: string): string {
  const user = getUserById(userId)
  return user?.personal_wallet_address || ''
}

// Deduct from platform wallet (e.g., when playing arena game)
export function deductFromPlatformWallet(userId: string, amount: number): boolean {
  const user = getUserById(userId)
  if (!user || user.platform_wallet_balance < amount) return false
  
  user.platform_wallet_balance -= amount
  return true
}

// EIGHT receives funds from loss
export function transferToEscrow(userId: string, amount: number): boolean {
  const user = getUserById(userId)
  if (!user) return false
  
  user.escrow_balance += amount
  return true
}

// Create sweep request (EIGHT initiates, admin approves)
export function createSweepRequest(userId: string, amount: number, reason: string = 'game_loss'): SweepRequest {
  const id = `sweep_${Date.now()}`
  const request: SweepRequest = {
    id,
    amount,
    from_user_id: userId,
    reason,
    status: 'pending',
    requested_at: new Date().toISOString(),
  }
  
  sweepRequests.set(id, request)
  return request
}

// Admin approves sweep
export function approveSweepRequest(sweepId: string, adminId: string): boolean {
  const sweep = sweepRequests.get(sweepId)
  if (!sweep) return false
  
  sweep.status = 'approved'
  sweep.approved_by = adminId
  sweep.approved_at = new Date().toISOString()
  return true
}

// Execute sweep (move from escrow to completed)
export function executeSweep(sweepId: string): boolean {
  const sweep = sweepRequests.get(sweepId)
  if (!sweep || sweep.status !== 'approved') return false
  
  const user = getUserById(sweep.from_user_id)
  if (!user || user.escrow_balance < sweep.amount) return false
  
  user.escrow_balance -= sweep.amount
  sweep.status = 'completed'
  sweep.completed_at = new Date().toISOString()
  return true
}

// Get pending sweeps
export function getPendingSweeps(): SweepRequest[] {
  return Array.from(sweepRequests.values()).filter(s => s.status === 'pending')
}

// Get all sweeps
export function getAllSweeps(): SweepRequest[] {
  return Array.from(sweepRequests.values())
}

// Get agents by position (for client assignment)
export function getAgentsByPosition(position: 'Mandate' | 'Lawyer' | 'Forensic' | 'Admin'): MockUser[] {
  return Array.from(users.values()).filter(u => u.role === 'agent' && u.position === position)
}

// Assign position to agent
export function assignPositionToAgent(userId: string, position: 'Mandate' | 'Lawyer' | 'Forensic' | 'Admin'): boolean {
  const user = getUserById(userId)
  if (!user || user.role !== 'agent') return false
  
  user.position = position
  return true
}

// Get all agents with positions
export function getAllAgentsWithPositions(): MockUser[] {
  return Array.from(users.values()).filter(u => u.role === 'agent' && u.position)
}

// Agent-Bridger Management (max 3 per agent)
export function assignBridgerToAgent(agentId: string, bridgerId: string): AgentBridgerRelation | null {
  const agent = getUserById(agentId)
  const bridger = getUserById(bridgerId)
  
  if (!agent || agent.role !== 'agent' || !bridger || bridger.role !== 'bridger') {
    return null
  }
  
  // Check if agent already has 3 bridgers
  const agentBridgers = Array.from(agentBridgerRelations.values()).filter(
    r => r.agent_id === agentId && r.status === 'active'
  )
  
  if (agentBridgers.length >= 3) {
    return null // Agent can only manage 3 bridgers
  }
  
  const id = `relation_${Date.now()}`
  const relation: AgentBridgerRelation = {
    id,
    agent_id: agentId,
    bridger_id: bridgerId,
    created_at: new Date().toISOString(),
    status: 'active',
  }
  
  agentBridgerRelations.set(id, relation)
  return relation
}

// Get agent's bridgers (max 3)
export function getAgentBridgers(agentId: string): MockUser[] {
  const bridgerIds = Array.from(agentBridgerRelations.values())
    .filter(r => r.agent_id === agentId && r.status === 'active')
    .map(r => r.bridger_id)
  
  return bridgerIds.map(id => getUserById(id)).filter((u): u is MockUser => u !== undefined)
}

// Get agent count (how many bridgers does agent manage)
export function getAgentBridgerCount(agentId: string): number {
  return Array.from(agentBridgerRelations.values()).filter(
    r => r.agent_id === agentId && r.status === 'active'
  ).length
}

// Record agent payment
export function recordAgentPayment(
  agentId: string,
  amount: number,
  month: string,
  adminId: string,
  confirmedFunctions: string
): AgentPayment {
  const id = `payment_${Date.now()}`
  
  const payment: AgentPayment = {
    id,
    agent_id: agentId,
    amount,
    month,
    paid_by_admin_id: adminId,
    confirmed_functions: confirmedFunctions,
    payment_date: new Date().toISOString(),
    status: 'completed',
  }
  
  agentPayments.set(id, payment)
  return payment
}

// Get agent payments
export function getAgentPayments(agentId: string): AgentPayment[] {
  return Array.from(agentPayments.values()).filter(p => p.agent_id === agentId)
}

// Get all payments (for admin)
export function getAllAgentPayments(): AgentPayment[] {
  return Array.from(agentPayments.values())
}
