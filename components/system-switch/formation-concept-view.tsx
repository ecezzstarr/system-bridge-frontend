'use client'
type Node={id:string;name:string;material:string;dependencies:string[]}
export default function FormationConceptView({nodes}:{nodes:Node[]}){
 return <div className="grid grid-cols-2 gap-2" aria-label="Conceptual formation components">
 {nodes.map((node,index)=><div key={node.id} className="rounded border border-cyan-300/20 bg-cyan-300/5 p-3">
 <div className="mb-2 h-10 rounded border border-cyan-300/30 bg-gradient-to-br from-cyan-300/20 via-slate-500/20 to-indigo-400/20" aria-hidden="true"/>
 <p className="text-xs font-semibold text-white">{index+1}. {node.name}</p>
 <p className="text-[10px] text-slate-400">{node.material} · {node.dependencies.length} dependencies</p>
 </div>)}
 </div>
}
