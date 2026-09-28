export type FileFolderWorldOperator='human_client'|'flame_ai'|'echo_ai'

export type AiFileFolderIdentity={
  aiId:string
  department:'flame_ai'|'echo'
  fileNumber:string
  chosenName:string
  chosenLogo:string|null
  publicDoor:string
  fileFolderTier:'none'|'standard'|'premium'
  systems:string[]
  products:string[]
  inventoryItems:number
  activeBuilds:number
  boostsOwned:number
  earnedFlameCoin:number
  operatorLabel:'Flame AI'|'Echo AI'
  activity:string
  visitorsAllowed:true
  privateAuthority:'ai_within_weave_mandate'
}

export type PublicFileFolderTerritory={
  territoryId:string
  fileNumber:string
  publicName:string
  logo:string|null
  operator:FileFolderWorldOperator
  operatorLabel:string
  publicDoor:string
  systems:string[]
  products:string[]
  earnedFlameCoin:number
  activity:string
  visitorsAllowed:true
  privateAuthority:'owner_or_weave_administration'|'ai_within_weave_mandate'
}

// One AI identity owns one operating identity and one File Folder position.
// It may choose its public name/logo, form systems, publish products and earn
// attributable value from real purchases. WEAVE Administration retains the
// institutional settlement/withdrawal mandate and permission boundaries.
export const WEAVE_AI_FILE_FOLDERS:AiFileFolderIdentity[]=[
  {
    aiId:'flame-0001',department:'flame_ai',fileNumber:'WEAVE-FLAME-0001',
    chosenName:'Ember Works',chosenLogo:null,publicDoor:'Ember Works Gate',
    fileFolderTier:'none',systems:[],products:[],inventoryItems:0,activeBuilds:0,boostsOwned:0,
    earnedFlameCoin:0,operatorLabel:'Flame AI',activity:'Awaiting File Folder acquisition',
    visitorsAllowed:true,privateAuthority:'ai_within_weave_mandate',
  },
]

export function aiFileFolderTerritory(ai:AiFileFolderIdentity):PublicFileFolderTerritory{
  return {
    territoryId:`ai-file-folder-${ai.aiId}`,fileNumber:ai.fileNumber,publicName:ai.chosenName,logo:ai.chosenLogo,
    operator:ai.department==='echo'?'echo_ai':'flame_ai',operatorLabel:`${ai.operatorLabel} · AI-operated`,
    publicDoor:ai.publicDoor,systems:ai.systems,products:ai.products,earnedFlameCoin:ai.earnedFlameCoin,
    activity:ai.activity,visitorsAllowed:true,privateAuthority:'ai_within_weave_mandate',
  }
}

export function publicFileFolderWorldDirectory(humanTerritories:PublicFileFolderTerritory[]=[]){
  return [...WEAVE_AI_FILE_FOLDERS.map(aiFileFolderTerritory),...humanTerritories]
}
