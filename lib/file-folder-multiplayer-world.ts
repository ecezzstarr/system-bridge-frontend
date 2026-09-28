export type FileFolderWorldOperator='human_client'|'weave_ai_agent'

export type PublicFileFolderTerritory={
  territoryId:string
  fileNumber:string
  publicName:string
  operator:FileFolderWorldOperator
  operatorLabel:string
  purpose:string
  publicDoor:string
  systems:string[]
  activity:string
  visitorsAllowed:true
  privateAuthority:'owner_or_weave_administration'
}

// WEAVE-operated territories keep the multiplayer world active and demonstrate
// what can be formed without pretending an AI Agent is a human Client.
export const WEAVE_AI_DEMONSTRATION_TERRITORIES:PublicFileFolderTerritory[]=[
  {
    territoryId:'weave-ai-commerce',fileNumber:'WEAVE-AI-0001',publicName:'WEAVE Commerce Foundry',
    operator:'weave_ai_agent',operatorLabel:'WEAVE AI-operated',
    purpose:'Demonstrates a public Customer Door, service intake, order movement and fulfilment records.',
    publicDoor:'Commerce Foundry Gate',systems:['Customer Door','Commerce Storefront','Service Queue','Fulfilment Route'],
    activity:'Receiving visitors · demonstrating customer movement',visitorsAllowed:true,privateAuthority:'owner_or_weave_administration',
  },
  {
    territoryId:'weave-ai-systems',fileNumber:'WEAVE-AI-0002',publicName:'WEAVE Systems Atelier',
    operator:'weave_ai_agent',operatorLabel:'WEAVE AI-operated',
    purpose:'Demonstrates how parts, automation and connected systems become a working technology territory.',
    publicDoor:'Systems Atelier Gate',systems:['Formation Yard','Automation System','Integration Weave','Route Station'],
    activity:'Forming systems · connecting capabilities',visitorsAllowed:true,privateAuthority:'owner_or_weave_administration',
  },
  {
    territoryId:'weave-ai-media',fileNumber:'WEAVE-AI-0003',publicName:'WEAVE Living Broadcast',
    operator:'weave_ai_agent',operatorLabel:'WEAVE AI-operated',
    purpose:'Demonstrates a Client-scale public media operation with programs, audience movement and service routes.',
    publicDoor:'Living Broadcast Gate',systems:['Creator Booth','Broadcast Studio','Streaming Gate','Audience Route'],
    activity:'Programming · audience participation',visitorsAllowed:true,privateAuthority:'owner_or_weave_administration',
  },
]

export function publicFileFolderWorldDirectory(humanTerritories:PublicFileFolderTerritory[]=[]){
  return [...WEAVE_AI_DEMONSTRATION_TERRITORIES,...humanTerritories]
}
