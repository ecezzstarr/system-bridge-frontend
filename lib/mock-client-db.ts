// Mock client database - separate from company agents
// Clients interact with company positions: Mandate, Lawyer, Forensic, Admin

interface ClientUser {
  id: string
  email: string
  phone: string
  name: string
  password: string
  business_name: string
  role?: 'admin' | 'client'
  company_wallet?: string // Admin's company wallet
  created_at: string
}

interface ClientAgentAssignment {
  client_id: string
  position: 'mandate' | 'lawyer' | 'forensic' | 'admin'
  assigned_agent_username: string
  assigned_at: string
}

interface ClientMessage {
  id: string
  client_id: string
  position: 'mandate' | 'lawyer' | 'forensic' | 'admin'
  sender: 'client' | 'agent' // Who sent the message
  sender_name: string
  content: string
  timestamp: string
  read: boolean
}

// In-memory storage
const clients: Map<string, ClientUser> = new Map()
const clientAssignments: Map<string, ClientAgentAssignment[]> = new Map()
const clientMessages: Map<string, ClientMessage[]> = new Map()

// Pre-registered admin account for client system (same as platform admin)
const ADMIN_CLIENT: ClientUser = {
  id: 'client_admin_001',
  email: 'ecezzstarr@gmail.com',
  phone: '+1234567890',
  name: 'Platform Admin',
  password: 'PlatformAdmin@2026',
  business_name: 'System Administration',
  role: 'admin',
  company_wallet: 'THGBvmPt3XEb8mbSRXViA93GkW3PpCanJk', // Company wallet address
  created_at: new Date().toISOString(),
}

// Initialize admin account
clients.set(ADMIN_CLIENT.id, ADMIN_CLIENT)

export function getClientByEmail(email: string): ClientUser | undefined {
  return Array.from(clients.values()).find(c => c.email === email)
}

export function getClientById(id: string): ClientUser | undefined {
  return clients.get(id)
}

export function createClient(data: {
  email: string
  phone: string
  name: string
  password: string
  business_name: string
}): ClientUser {
  const id = `client_${Date.now()}`
  const client: ClientUser = {
    id,
    email: data.email,
    phone: data.phone,
    name: data.name,
    password: data.password,
    business_name: data.business_name,
    role: 'client', // Regular clients
    created_at: new Date().toISOString(),
  }

  clients.set(id, client)
  return client
}

export function getAdminClient(): ClientUser | undefined {
  return ADMIN_CLIENT
}

export function updateAdminCredentials(newName?: string, newPassword?: string): ClientUser {
  if (newName) ADMIN_CLIENT.name = newName
  if (newPassword) ADMIN_CLIENT.password = newPassword
  
  // Update in storage
  clients.set(ADMIN_CLIENT.id, ADMIN_CLIENT)
  
  return ADMIN_CLIENT
}

export function authenticateClient(email: string, password: string): ClientUser | null {
  const client = getClientByEmail(email)
  if (!client) return null
  if (client.password !== password) return null
  return client
}

export function assignAgentToClient(
  clientId: string,
  position: 'mandate' | 'lawyer' | 'forensic' | 'admin',
  agentUsername: string
): boolean {
  const client = getClientById(clientId)
  if (!client) return false

  let assignments = clientAssignments.get(clientId) || []
  
  // Remove existing assignment for this position
  assignments = assignments.filter(a => a.position !== position)
  
  // Add new assignment
  assignments.push({
    client_id: clientId,
    position,
    assigned_agent_username: agentUsername,
    assigned_at: new Date().toISOString(),
  })

  clientAssignments.set(clientId, assignments)
  return true
}

export function getClientAssignments(clientId: string): ClientAgentAssignment[] {
  return clientAssignments.get(clientId) || []
}

export function saveClientMessage(message: Omit<ClientMessage, 'id'>): ClientMessage {
  const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const fullMessage: ClientMessage = { ...message, id }

  const key = `${message.client_id}_${message.position}`
  let messages = clientMessages.get(key) || []
  messages.push(fullMessage)
  clientMessages.set(key, messages)

  return fullMessage
}

export function getClientMessages(
  clientId: string,
  position: 'mandate' | 'lawyer' | 'forensic' | 'admin'
): ClientMessage[] {
  const key = `${clientId}_${position}`
  return clientMessages.get(key) || []
}

// Get agent's assigned clients by position
export function getAgentAssignedClients(agentUsername: string, position: string): string[] {
  const clientIds: string[] = []
  
  for (const [clientId, assignments] of clientAssignments.entries()) {
    const hasAssignment = assignments.some(
      a => a.assigned_agent_username === agentUsername && a.position === position
    )
    if (hasAssignment) clientIds.push(clientId)
  }
  
  return clientIds
}

// Get agent's all messages across assigned clients
export function getAgentMessages(agentUsername: string, position: string): ClientMessage[] {
  const assignedClientIds = getAgentAssignedClients(agentUsername, position)
  const allMessages: ClientMessage[] = []

  for (const clientId of assignedClientIds) {
    const messages = getClientMessages(clientId, position as any)
    allMessages.push(...messages)
  }

  return allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
