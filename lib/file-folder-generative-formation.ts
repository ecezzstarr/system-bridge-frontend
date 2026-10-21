/**
 * Client-directed generative construction foundation.
 * A description becomes a proposed, inspectable part specification;
 * never silently becomes a deployed physical or digital capability.
 */
export type FormationReality='conceptual'|'simulated'|'verified_operational'
export type FormationMaterial='water'|'fire'|'glass'|'stone'|'metal'|'vegetation'|'light'|'fabric'|'energy'|'custom'
export type GeneratedPartProposal={
  id:string
  clientId:string
  fileNumber:string
  prompt:string
  name:string
  purpose:string
  materials:FormationMaterial[]
  geometry:'structure'|'surface'|'path'|'mechanism'|'environment'|'interface'
  textures: Array<{material:FormationMaterial;description:string;scale:number}>
  interfaces:Array<{name:string;input:string;output:string}>
  dependencies:string[]
  openQuestions:string[]
  reality:FormationReality
  requiresHumanReview:boolean
  createdAt:string
}
export const FORMATION_MATERIALS:readonly FormationMaterial[]=[
  'water','fire','glass','stone','metal','vegetation','light','fabric','energy','custom'
]
export const FORMATION_REALITY_RULES={
  conceptual:'Visual model and specification only; no claim of feasibility.',
  simulated:'Tested in a simulation with documented assumptions; no claim of real-world operation.',
  verified_operational:'Requires external implementation evidence, authorized review and repeatable tests.',
} as const
export function createPartProposal(input:{
 clientId:string;fileNumber:string;description:string;name?:string;
 materials?:FormationMaterial[];createdAt?:string
}):GeneratedPartProposal{
 const prompt=input.description.trim()
 if(!input.clientId||!input.fileNumber||prompt.length<15||prompt.length>6000)throw new Error('A Client, File Folder and meaningful description are required.')
 const name=(input.name||prompt.split(/[.!?\n]/)[0]).trim().slice(0,100)||'Unnamed formation'
 const materials=[...new Set((input.materials||['custom']).filter(m=>FORMATION_MATERIALS.includes(m)))]
 const selectedMaterials:FormationMaterial[]=materials.length?materials:['custom']
 const createdAt=input.createdAt||new Date().toISOString()
 return {
   id:'proposal-pending-persistence',clientId:input.clientId,fileNumber:input.fileNumber,
   prompt,name,purpose:prompt,materials:selectedMaterials,
   geometry:'structure',textures:selectedMaterials.map(material=>({material,description:'Client-directed material study; texture generation pending',scale:1})),
   interfaces:[],dependencies:[],openQuestions:['What must this formation do?','What inputs, outputs and constraints must it satisfy?'],
   reality:'conceptual',requiresHumanReview:true,createdAt
 }
}
export function mayClaimOperational(part:GeneratedPartProposal,evidence:{reviewApproved:boolean;testsPassed:boolean;implementationReference?:string}){
 return part.reality==='verified_operational'&&evidence.reviewApproved&&evidence.testsPassed&&Boolean(evidence.implementationReference)
}
