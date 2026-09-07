// Legacy compatibility layer. Production identity, balances and authorization must use PostgreSQL.
export type { MockUser, SweepRequest, AgentBridgerRelation, AgentPayment }

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

interface SweepRequest {
  id: string
  amount: number
  from_user_id: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requested_at: string
  approved_by?: string
  approved_at?: string
  completed_at?: string
}

interface AgentBridgerRelation {
  id: string
  agent_id: string
  bridger_id: string
  created_at: string
  status: 'active' | 'inactive'
}

interface AgentPayment {
  id: string
  agent_id: string
  amount: number
  month: string
  paid_by_admin_id: string
  confirmed_functions: string
  payment_date: string
  notes?: string
  status: 'pending' | 'completed'
}

const users: Map<string, MockUser> = new Map()
const sweepRequests: Map<string, SweepRequest> = new Map()
const agentBridgerRelations: Map<string, AgentBridgerRelation> = new Map()
const agentPayments: Map<string, AgentPayment> = new Map()

const roleMap: Record<string, 'agent' | 'bridger' | 'admin'> = {
  HOPE: 'bridger',
  STABILITY: 'agent',
  CAT: 'admin',
}

export function getUserByEmail(email: string): MockUser | undefined {
  const userByEmail = users.get(email.toLowerCase())
  if (userByEmail && 'email' in userByEmail) return userByEmail
  return Array.from(users.values()).find(u => u.email?.toLowerCase() === email.toLowerCase())
}

export function getUserByUsername(username: string): MockUser | undefined {
  return users.get(username)
}

export function createUser(data: { email: string; username: string; name: string; password: string; role: 'agent' | 'bridger'; department: string }): MockUser {
  const user: MockUser = {
    id: `user_${Date.now()}`,
    email: data.email,
    username: data.username,
    name: data.name,
    password: data.password,
    role: data.role,
    departmental_code: data.department,
    platform_wallet_balance: 0,
    escrow_balance: 0,
    assigned_by_admin: true,
    personal_wallet_address: '',
    created_at: new Date().toISOString(),
  }
  users.set(data.username, user)
  return user
}

export function authenticateUser(email: string, password: string): MockUser | null {
  const user = getUserByEmail(email)
  return user && user.password === password ? user : null
}

export function getUserById(id: string): MockUser | undefined {
  return Array.from(users.values()).find(u => u.id === id)
}

export function getAllUsers(): MockUser[] { return Array.from(users.values()) }
export function getUnassignedUsers(): MockUser[] { return Array.from(users.values()).filter(u => !u.assigned_by_admin && u.role !== 'admin') }

export function assignUserDepartment(userId: string, departmental_code: string): boolean {
  const user = getUserById(userId)
  if (!user) return false
  user.departmental_code = departmental_code
  user.role = roleMap[departmental_code] || 'client'
  user.assigned_by_admin = true
  return true
}

export function depositToPlatformWallet(userId: string, amount: number): boolean {
  const user = getUserById(userId)
  if (!user || !Number.isFinite(amount) || amount <= 0) return false
  user.platform_wallet_balance += amount
  return true
}

export function updatePersonalWalletAddress(userId: string, walletAddress: string): boolean {
  const user = getUserById(userId)
  if (!user) return false
  user.personal_wallet_address = walletAddress
  return true
}

export function updateUserBalance(userId: string, newBalance: number, walletType: 'platform' | 'escrow' = 'platform'): boolean {
  const user = getUserById(userId)
  if (!user || !Number.isFinite(newBalance)) return false
  if (walletType === 'platform') user.platform_wallet_balance = Math.max(0, newBalance)
  else user.escrow_balance = Math.max(0, newBalance)
  return true
}

export function getPersonalWalletAddress(userId: string): string { return getUserById(userId)?.personal_wallet_address || '' }

export function deductFromPlatformWallet(userId: string, amount: number): boolean {
  const user = getUserById(userId)
  if (!user || !Number.isFinite(amount) || amount < 0 || user.platform_wallet_balance < amount) return false
  user.platform_wallet_balance -= amount
  return true
}

export function transferToEscrow(userId: string, amount: number): boolean {
  const user = getUserById(userId)
  if (!user || !Number.isFinite(amount) || amount <= 0) return false
  user.escrow_balance += amount
  return true
}

export function createSweepRequest(userId: string, amount: number, reason = 'game_loss'): SweepRequest {
  const request: SweepRequest = { id: `sweep_${Date.now()}`, amount, from_user_id: userId, reason, status: 'pending', requested_at: new Date().toISOString() }
  sweepRequests.set(request.id, request)
  return request
}

export function approveSweepRequest(sweepId: string, adminId: string): boolean {
  const sweep = sweepRequests.get(sweepId)
  if (!sweep) return false
  sweep.status = 'approved'; sweep.approved_by = adminId; sweep.approved_at = new Date().toISOString()
  return true
}

export function executeSweep(sweepId: string): boolean {
  const sweep = sweepRequests.get(sweepId)
  if (!sweep || sweep.status !== 'approved') return false
  const user = getUserById(sweep.from_user_id)
  if (!user || user.escrow_balance < sweep.amount) return false
  user.escrow_balance -= sweep.amount; sweep.status = 'completed'; sweep.completed_at = new Date().toISOString()
  return true
}

export function getPendingSweeps(): SweepRequest[] { return Array.from(sweepRequests.values()).filter(s => s.status === 'pending') }
export function getAllSweeps(): SweepRequest[] { return Array.from(sweepRequests.values()) }
export function getAgentsByPosition(position: 'Mandate' | 'Lawyer' | 'Forensic' | 'Admin'): MockUser[] { return Array.from(users.values()).filter(u => u.role === 'agent' && u.position === position) }

export function assignPositionToAgent(userId: string, position: 'Mandate' | 'Lawyer' | 'Forensic' | 'Admin'): boolean {
  const user = getUserById(userId)
  if (!user || user.role !== 'agent') return false
  user.position = position
  return true
}

export function getAllAgentsWithPositions(): MockUser[] { return Array.from(users.values()).filter(u => u.role === 'agent' && u.position) }

export function assignBridgerToAgent(agentId: string, bridgerId: string): AgentBridgerRelation | null {
  const agent = getUserById(agentId), bridger = getUserById(bridgerId)
  if (!agent || agent.role !== 'agent' || !bridger || bridger.role !== 'bridger') return null
  const count = Array.from(agentBridgerRelations.values()).filter(r => r.agent_id === agentId && r.status === 'active').length
  if (count >= 3) return null
  const relation: AgentBridgerRelation = { id: `relation_${Date.now()}`, agent_id: agentId, bridger_id: bridgerId, created_at: new Date().toISOString(), status: 'active' }
  agentBridgerRelations.set(relation.id, relation)
  return relation
}

export function getAgentBridgers(agentId: string): MockUser[] {
  return Array.from(agentBridgerRelations.values()).filter(r => r.agent_id === agentId && r.status === 'active').map(r => getUserById(r.bridger_id)).filter((u): u is MockUser => !!u)
}

export function getAgentBridgerCount(agentId: string): number { return Array.from(agentBridgerRelations.values()).filter(r => r.agent_id === agentId && r.status === 'active').length }

export function recordAgentPayment(agentId: string, amount: number, month: string, adminId: string, confirmedFunctions: string): AgentPayment {
  const payment: AgentPayment = { id: `payment_${Date.now()}`, agent_id: agentId, amount, month, paid_by_admin_id: adminId, confirmed_functions: confirmedFunctions, payment_date: new Date().toISOString(), status: 'completed' }
  agentPayments.set(payment.id, payment)
  return payment
}

export function getAgentPayments(agentId: string): AgentPayment[] { return Array.from(agentPayments.values()).filter(p => p.agent_id === agentId) }
export function getAllAgentPayments(): AgentPayment[] { return Array.from(agentPayments.values()) }
