// Retired Bridger monthly bundle. Old imports remain compatible but cannot debit wallets.
export async function getBridgerSubscribeAllQuote(_userId:string) {
  return {success:true,retired:true,services:[],allActive:true,totalDueFlameCoin:0,availableFlameCoin:0,rateNgnPerFlameCoin:null}
}
export async function subscribeAllBridgerEssentials(_userId:string) {
  return {success:false as const,reason:'retired' as const}
}
