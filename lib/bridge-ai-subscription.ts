// Retired monthly Bridge AI subscriptions. Each new template path is charged once
// in app/api/bridger/bridge-ai/route.ts as one atomic purchase.
export async function ensureBridgeAiContinuanceTable() { return true }
export async function getBridgeAiContinuance(_userId:string) { return null }
export async function hasActiveBridgeAiContinuance(_userId:string):Promise<boolean> { return false }
export async function subscribeToBridgeAi(_userId:string) {
  return {success:false as const,reason:'retired' as const}
}
