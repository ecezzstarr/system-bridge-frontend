/**
 * Flame Presence expansion: a capability and authority contract, not a claim
 * that an AI identity has external credentials or autonomous execution.
 * Every movement is tied to a Client-owned world and an accountable position.
 */
export type FlamePosition = 'administration'|'forensics'|'mandate'|'attorney'|'bridger'|'legion'|'flame_ai'
export type FlameExpansionStage = 'identity'|'authorized'|'connected'|'ready'|'operating'|'paused'
export type FlameConnection = 'creative_generation'|'social_publishing'|'prospect_inbox'|'customer_door'|'order_attribution'|'forensic_receipts'
export type FlameExpansionAuthority = {
  clientId: string
  fileNumber: string
  aiId: string
  approvedBy: string
  approvedAt: string
  allowedCountries: string[]
  allowedProducts: string[]
  allowedConnections: FlameConnection[]
  budgetFlameCoin: number
  expiresAt: string
}
export type FlameConnectionStatus = { connection: FlameConnection; configured: boolean; verified: boolean; lastVerifiedAt?: string }
export type FlameExpansionMovement = {
  id: string
  aiId: string
  fileNumber: string
  kind: 'research'|'creative'|'publish'|'engage'|'door_visit'|'order'|'settlement'
  state: 'proposed'|'awaiting_approval'|'queued'|'running'|'verified'|'failed'
  sourceReference?: string
  destinationReference?: string
  recordedAt: string
  responsiblePosition: FlamePosition
}
export const FLAME_REQUIRED_CONNECTIONS: FlameConnection[] = [
  'creative_generation','social_publishing','prospect_inbox',
  'customer_door','order_attribution','forensic_receipts',
]
export const FLAME_POSITION_RESPONSIBILITIES: Record<FlamePosition,string> = {
  administration:'Approves AI identity, budgets, and operating assignments.',
  forensics:'Independently verifies payments, receipts, and settlements.',
  mandate:'Enforces the approved scope and escalates exceptions.',
  attorney:'Reviews agreements and refers regulated legal matters to qualified professionals.',
  bridger:'Supports human crossing, introduction, and continuity.',
  legion:'Carries Client-authorized enterprise work into practical markets.',
  flame_ai:'Prepares and executes only connected, authorized digital movements.',
}
function validAuthority(authority:FlameExpansionAuthority,now:number){
  const approved=Date.parse(authority.approvedAt),expires=Date.parse(authority.expiresAt)
  return Number.isFinite(now)&&Number.isFinite(approved)&&Number.isFinite(expires)&&approved<=now&&expires>now
    &&Boolean(authority.clientId&&authority.fileNumber&&authority.aiId&&authority.approvedBy)
    &&Number.isFinite(authority.budgetFlameCoin)&&authority.budgetFlameCoin>=0
}
export function assessFlameExpansion(input:{
  identityExists:boolean
  authority?:FlameExpansionAuthority|null
  connections:FlameConnectionStatus[]
  now?:string
}):{stage:FlameExpansionStage;ready:boolean;missing:FlameConnection[];reason:string}{
  if(!input.identityExists)return {stage:'identity',ready:false,missing:FLAME_REQUIRED_CONNECTIONS,reason:'No registered AI identity.'}
  if(!input.authority)return {stage:'identity',ready:false,missing:FLAME_REQUIRED_CONNECTIONS,reason:'Administration has not approved an operating mandate.'}
  const now=Date.parse(input.now||new Date().toISOString())
  if(!validAuthority(input.authority,now))return {stage:'paused',ready:false,missing:[],reason:'Operating mandate is invalid, incomplete or expired.'}
  const missing=FLAME_REQUIRED_CONNECTIONS.filter(connection=>!input.authority!.allowedConnections.includes(connection)||!input.connections.some(status=>status.connection===connection&&status.configured&&status.verified))
  if(missing.length)return {stage:'connected',ready:false,missing,reason:'External capabilities are not all verified.'}
  return {stage:'ready',ready:true,missing:[],reason:'Connections verified; an independent scheduled executor is still required for autonomous operation.'}
}
export function canExecuteFlameMovement(authority:FlameExpansionAuthority,movement:FlameExpansionMovement,now=new Date().toISOString()){
  if(authority.aiId!==movement.aiId||authority.fileNumber!==movement.fileNumber)return false
  if(!validAuthority(authority,Date.parse(now)))return false
  if(movement.kind==='publish'||movement.kind==='engage')return authority.allowedConnections.includes(movement.kind==='publish'?'social_publishing':'prospect_inbox')
  if(movement.kind==='settlement')return false // Forensics must verify independently.
  return true
}
