import type {FormationMaterial,GeneratedPartProposal} from './file-folder-generative-formation'
export type FormationNode={id:string;name:string;kind:'foundation'|'structure'|'interface'|'energy'|'environment'|'network';material:FormationMaterial;position:[number,number,number];size:[number,number,number];dependencies:string[]}
export type FormationDesign={version:1;summary:string;nodes:FormationNode[];risks:string[];assumptions:string[];questions:string[];readiness:'conceptual';textureSeed:number}
const patterns=[
 {match:/farm|food|crop|agricultur|garden|fish/i,name:'Cultivation',kind:'environment' as const,material:'vegetation' as const},
 {match:/water|river|sea|ocean|float|underwater/i,name:'Water circulation',kind:'environment' as const,material:'water' as const},
 {match:/power|electric|solar|energy|battery/i,name:'Energy distribution',kind:'energy' as const,material:'energy' as const},
 {match:/market|shop|sell|commerce|store/i,name:'Market interface',kind:'interface' as const,material:'glass' as const},
 {match:/hospital|clinic|health/i,name:'Health operations',kind:'interface' as const,material:'glass' as const},
 {match:/network|communicat|internet|platform|social/i,name:'Connection network',kind:'network' as const,material:'light' as const},
 {match:/transport|vehicle|road|travel|route/i,name:'Movement routes',kind:'network' as const,material:'metal' as const},
 {match:/home|house|building|city|tower|room/i,name:'Habitable structure',kind:'structure' as const,material:'stone' as const},
 {match:/ai|intelligen|automat|robot/i,name:'Intelligence interface',kind:'interface' as const,material:'light' as const},
]
function seed(text:string){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return h>>>0}
export function deriveFormationDesign(proposal:GeneratedPartProposal):FormationDesign{
 const text=proposal.prompt
 const found=patterns.filter(p=>p.match.test(text)).slice(0,8)
 const selected=found.length?found:[{name:'Custom structure',kind:'structure' as const,material:'custom' as const}]
 const base:FormationNode={id:'foundation',name:'Foundation',kind:'foundation',material:proposal.materials[0]||'custom',position:[0,0,0],size:[6,0.5,6],dependencies:[]}
 const nodes=[base,...selected.map((p,i):FormationNode=>({id:'node-'+(i+1),name:p.name,kind:p.kind,material:proposal.materials.find(m=>m===p.material)||p.material,position:[((i%3)-1)*2.3,1+Math.floor(i/3)*1.4,Math.floor(i/3)*1.7-1],size:[1.5,1.3,1.5],dependencies:['foundation']}))]
 const risks=['The visual composition is not a physical engineering validation.']
 if(/float|fly|gravity|teleport|time travel|perpetual|impossible/i.test(text))risks.push('Extraordinary physical behavior requires independent feasibility evidence.')
 if(/hospital|medical|patient|national|government|identity/i.test(text))risks.push('Regulated operation requires qualified oversight and authorization.')
 return {version:1,summary:proposal.purpose,nodes,risks,assumptions:['Dimensions and positions are conceptual visualization units, not construction measurements.'],questions:['What scale and operating conditions are required?','Which real-world capabilities must be verified?'],readiness:'conceptual',textureSeed:seed(text)}
}
