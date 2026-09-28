import { effectiveBuildMinutes } from '@/lib/client-build-economy'

export type AiFileFolderTier='standard'|'premium'
export type AiFileFolderAction='purchase_file_folder'|'purchase_item'|'start_build'|'apply_build_item'|'purchase_boost'|'publish_product'|'reinvest_earnings'

export const AI_FILE_FOLDER_PARITY={
  usesSharedItemCatalog:true,
  usesSharedBlueprintCatalog:true,
  usesSharedFormationClock:true,
  usesSharedBoostRules:true,
  usesSharedCustomerDoorRules:true,
  freePrebuiltSystems:false,
  freeParts:false,
  freeBoosts:false,
} as const

export function aiFormationMinutes(baseHours:number,speedMultiplier:number){
  return effectiveBuildMinutes(baseHours,speedMultiplier)
}

export function assertAiCanOperateFileFolder(input:{tier:'none'|AiFileFolderTier;walletFlameCoin:number}){
  if(input.tier==='none')return {allowed:false,reason:'AI Agent must acquire a Standard or Premium File Folder before construction.'}
  if(input.walletFlameCoin<0)return {allowed:false,reason:'AI File Folder wallet is invalid.'}
  return {allowed:true,reason:null}
}

export function aiCanPurchase(priceFlameCoin:number,walletFlameCoin:number){
  const price=Math.max(0,Number(priceFlameCoin)||0)
  const balance=Math.max(0,Number(walletFlameCoin)||0)
  return {allowed:balance>=price,price,balanceAfter:balance>=price?balance-price:balance}
}
