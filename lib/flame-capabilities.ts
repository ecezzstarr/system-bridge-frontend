/** Role-scoped discovery; never an authorization or model execution mechanism. */
export type FlameCapability={id:string;title:string;detail:string;available:boolean;command?:string;href?:string;compose?:boolean}
export type FlameCapabilities={modelStatus:string;actions:FlameCapability[]}
export function flameCapabilities(role:string,webConfigured:boolean,creative:{image:boolean;text:boolean}):FlameCapabilities{
 const roles=['admin','bridger','agent','client','legion']
 if(!roles.includes(role))return {modelStatus:'Weave One is not active in operational conversation',actions:[]}
 const actions:FlameCapability[]=[
 {id:'find',title:'Find a workshop',detail:'Describe the work you want to do; see registered environments.',available:true,command:'find ',compose:true},
 {id:'teach',title:'Understand Weave',detail:'Learn about departments, positions and participation.',available:true,command:'What is Weave?'},
 {id:'web',title:'Public research',detail:'Search a public topic; source excerpts need verification.',available:webConfigured,command:'web search: ',compose:true},
 {id:'creative',title:'Creative Production',detail:'Create original images and content using configured providers.',available:creative.image||creative.text,href:'/image-workshop/production'},
 ]
 if(role==='admin')actions.unshift({id:'release',title:'Inspect production',detail:'Check recorded release and worker evidence; appointed access required.',available:true,command:'check production status'},{id:'code',title:'Code Workshop',detail:'Inspect, review and authorize source changes in its own workshop.',available:true,href:'/admin/code-workshop'})
 if(role==='bridger')actions.unshift({id:'prospect',title:'Check daily prospect',detail:'Read the actual daily prospect record.',available:true,command:'check daily free prospect'},{id:'claim',title:'Claim daily free prospect',detail:'Preview and confirm the original workshop operation.',available:true,command:'claim my daily free prospect'})
 if(role==='agent')actions.unshift({id:'distribution',title:'Inspect distribution',detail:'Read recorded outlets and stock.',available:true,command:'check distribution status'})
 if(role==='client')actions.unshift({id:'folder',title:'Inspect File Folder',detail:'Review recorded active systems and unfinished construction.',available:true,command:'check file folder status'},{id:'folder-work',title:'File Folder systems',detail:'Open your private environment and its owner-authorized tools.',available:true,href:'/client/system-switch'})
 return {modelStatus:'Weave One is in evaluation; general native language inference is not active',actions}
}
