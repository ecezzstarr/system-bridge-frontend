/**
 * WEAVE native creation protocol. This is interpreted content, not executable
 * JavaScript: adding a page, feature or bounded operational system does not
 * install a package, change a database schema, or execute arbitrary source.
 */
export const WEAVE_NATIVE_DEPARTMENTS={
  hope:{label:'Hope · Bridger',role:'bridger'},
  stability:{label:'Stability · Agent',role:'agent'},
  'dream-lovely':{label:'Dream Lovely · Client',role:'client'},
  administrations:{label:'Administrations · A Time',role:'admin'},
} as const
export type NativeDepartment=keyof typeof WEAVE_NATIVE_DEPARTMENTS
export type NativeKind='page'|'feature'|'system'
export type NativeQuality='crystal'|'premium'|'plus'
export type NativeScene='water'|'glass-kingdom'|'mechanized'
export type NativeBlock=
  |{type:'hero';eyebrow:string;heading:string;description:string}
  |{type:'prose';heading:string;body:string}
  |{type:'glass-grid';heading:string;items:{title:string;description:string}[]}
  |{type:'scene';heading:string;scene:NativeScene}
  |{type:'action';heading:string;description:string;label:string;href:string}
  |{type:'steps';heading:string;steps:{id:string;label:string;description:string}[]}
  |{type:'intake';formId:string;heading:string;description:string;fields:{id:string;label:string;kind:'short'|'long'|'choice';required:boolean;options:string[]}[]}

export type WeaveNativeBlueprint={
 companyPlot?: number
 department:NativeDepartment
 kind:NativeKind
 slug:string
 title:string
 description:string
 quality:NativeQuality
 blocks:NativeBlock[]
}
const slugPattern=/^[a-z][a-z0-9-]{1,49}$/
const stepPattern=/^[a-z][a-z0-9-]{1,49}$/
const allowedKinds=['page','feature','system']
const allowedQualities=['crystal','premium','plus']
const scenes=['water','glass-kingdom','mechanized']
const fieldKinds=['short','long','choice']
const reserved=['api','admin','system','auth','login','workshop','new']
const plain=(value:unknown,max:number,label:string)=>{
 if(typeof value!=='string')throw Error(label+' must be text')
 const text=value.trim()
 if(!text||text.length>max||/[\u0000-\u001f\u007f]/.test(text))throw Error('Invalid '+label)
 return text
}
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
function validateLink(value:unknown){
 const href=plain(value,180,'link')
 if(!href.startsWith('/')||href.startsWith('//')||href.includes('\\')||href.includes('?')||href.includes('#')||
  /%|\/\/|(^|\/)\.\.?($|\/)/.test(href))throw Error('Use a simple internal WEAVE path')
 if(/^\/(?:api|_next|admin\/code-workshop|admin\/release-workshop|logout)(?:\/|$)/.test(href))
  throw Error('This internal destination cannot be a public module action')
 return href
}

export function validNativeDepartment(value:unknown):value is NativeDepartment{
 return typeof value==='string'&&Object.hasOwn(WEAVE_NATIVE_DEPARTMENTS,value)
}

export function canReadNativeDepartment(department:NativeDepartment,role:string){
 return role==='admin'||WEAVE_NATIVE_DEPARTMENTS[department].role===role
}

export function validateNativeBlueprint(value:unknown):WeaveNativeBlueprint{
 if(!isObject(value))throw Error('A WEAVE module object is required')
 if(!validNativeDepartment(value.department))throw Error('Choose a company department')
 if(!allowedKinds.includes(String(value.kind)))throw Error('Choose a page, feature or system')
 if(!allowedQualities.includes(String(value.quality)))throw Error('Choose a supported material quality')
 const slug=plain(value.slug,50,'module name')
 if(!slugPattern.test(slug)||reserved.includes(slug))throw Error('Use a distinct lowercase module address')
 const title=plain(value.title,95,'module title')
 const description=plain(value.description,1200,'module purpose')
 if(!Array.isArray(value.blocks)||value.blocks.length<1||value.blocks.length>12)
  throw Error('A module needs 1 to 12 approved visual blocks')
 const uniqueStepKeys=new Set<string>()
 const blocks:NativeBlock[]=value.blocks.map((block,index)=>{
  if(!isObject(block))throw Error('Invalid block '+(index+1))
  const type=String(block.type)
  if(type==='hero')return {
   type,eyebrow:plain(block.eyebrow,90,'eyebrow'),
   heading:plain(block.heading,120,'hero title'),
   description:plain(block.description,1500,'hero purpose'),
  }
  if(type==='prose')return {type,heading:plain(block.heading,120,'section heading'),
   body:plain(block.body,3000,'section text')}
  if(type==='scene') {
   if(!scenes.includes(String(block.scene)))throw Error('Choose an installed 3D scene')
   return {type,heading:plain(block.heading,120,'scene heading'),scene:block.scene as NativeScene}
  }
  if(type==='glass-grid'){
   if(!Array.isArray(block.items)||block.items.length<1||block.items.length>8)
    throw Error('A glass grid needs 1–8 items')
   return {type,heading:plain(block.heading,120,'grid heading'),items:block.items.map(item=>{
    if(!isObject(item))throw Error('Invalid grid item')
    return {title:plain(item.title,100,'grid title'),description:plain(item.description,420,'grid description')}
   })}
  }
  if(type==='action')return {type,heading:plain(block.heading,120,'action heading'),
   description:plain(block.description,500,'action description'),
   label:plain(block.label,70,'action label'),href:validateLink(block.href)}
  if(type==='intake'){
   if(value.kind==='page')throw Error('Intake forms require a feature or system')
   const formId=plain(block.formId,50,'intake form key')
   if(!stepPattern.test(formId)||uniqueStepKeys.has('form:'+formId))throw Error('Each intake form needs a unique stable key')
   uniqueStepKeys.add('form:'+formId)
   if(!Array.isArray(block.fields)||block.fields.length<1||block.fields.length>10)
    throw Error('An intake needs 1–10 fields')
   const ids=new Set<string>()
   const fields=block.fields.map(field=>{
    if(!isObject(field))throw Error('Invalid intake field')
    const id=plain(field.id,50,'field key')
    if(!stepPattern.test(id)||ids.has(id))throw Error('Intake field keys must be distinct')
    ids.add(id)
    if(!fieldKinds.includes(String(field.kind)))throw Error('Choose a supported intake input')
    if(typeof field.required!=='boolean')throw Error('Intake required must be true or false')
    const kind=field.kind as 'short'|'long'|'choice'
    const opts=kind==='choice'?field.options:[]
    if(kind==='choice'&&(!Array.isArray(opts)||opts.length<2||opts.length>12))
     throw Error('A choice field needs 2–12 options')
    const options=kind==='choice'?(opts as unknown[]).map(opt=>plain(opt,90,'choice label')):[]
    if(new Set(options).size!==options.length)throw Error('Choice values must be unique')
    return {id,label:plain(field.label,100,'intake field label'),kind,required:field.required,options}
   })
   return {type,formId,heading:plain(block.heading,120,'intake heading'),
    description:plain(block.description,700,'intake description'),fields}
  }
  if(type==='steps'){
   if(value.kind!=='system')throw Error('Operational steps are available only for systems')
   if(!Array.isArray(block.steps)||block.steps.length<1||block.steps.length>12)
    throw Error('A system needs 1–12 work steps')
   const steps=block.steps.map(item=>{
    if(!isObject(item))throw Error('Invalid work step')
    const id=plain(item.id,50,'step key')
    if(!stepPattern.test(id)||uniqueStepKeys.has(id))throw Error('Each step requires a distinct stable key')
    uniqueStepKeys.add(id)
    return {id,label:plain(item.label,110,'step label'),
     description:plain(item.description,500,'step description')}
   })
   return {type,heading:plain(block.heading,120,'system heading'),steps}
  }
  throw Error('Unrecognized block type')
 })
 if(value.kind==='system'&&!blocks.some(x=>x.type==='steps'))
  throw Error('A working system needs an operating steps block')
 const plot=value.companyPlot
 if(plot!==undefined){
  if(typeof plot!=='number'||!Number.isInteger(plot)||plot<1||plot>24)
   throw Error('Choose a company plot from 1 to 24')
  if(!blocks.some(block=>block.type==='scene'))throw Error('A company building needs a 3D scene')
 }
 return {department:value.department,kind:value.kind as NativeKind,slug,title,description,
  quality:value.quality as NativeQuality,blocks,...(typeof plot==='number'?{companyPlot:plot}:{})}
}

export function defaultWeaveNativeBlueprint(
 department:NativeDepartment='hope',kind:NativeKind='page',
):WeaveNativeBlueprint{
 const scene:NativeBlock={type:'scene',heading:'A world that takes form',scene:'glass-kingdom'}
 const blocks:NativeBlock[]=[
  {type:'hero',eyebrow:'Weave of Presence · Still Water',heading:'A living workshop',
   description:'Write the purpose in your cadence. Give this page a form that people can enter, use and understand.'},
  scene,
  {type:'glass-grid',heading:'Systems in motion',items:[
   {title:'Purpose',description:'What this creation makes possible.'},
   {title:'Participation',description:'Who carries the work and how their actions are verified.'},
   {title:'Continuity',description:'What remains usable when Administrations is not online.'},
  ]},
 ]
 if(kind==='feature')blocks.push({type:'action',heading:'Continue into Weave',
  description:'Connect to an existing authorized workshop.',label:'Open workspace',href:'/dashboard'})
 if(kind==='feature')blocks.push({type:'intake',formId:'interest',heading:'Record your interest',description:'Provide only work information necessary for a response, never passwords or payment credentials.',fields:[{id:'request',label:'What do you need?',kind:'long',required:true,options:[]}]})
 if(kind==='system')blocks.push({type:'steps',heading:'Working sequence',steps:[
  {id:'prepare',label:'Prepare',description:'Set the goal and required resources.'},
  {id:'act',label:'Act',description:'Carry out the next authorized work.'},
  {id:'record',label:'Record',description:'Mark the completed step for your own work history.'},
 ]})
 return {department,kind,slug:'still-water-'+kind,title:'Still Water',description:'Hope gives direction while Administrations makes the movement steady.',quality:'plus',blocks}
}
