import {redirect} from 'next/navigation'

/** Historical Company Loop 1 URL. The world belongs to System Switch. */
export default async function BurningRiverWorldLegacyRoute({searchParams}:{
 searchParams:Promise<Record<string,string|string[]|undefined>>
}){
 const params=await searchParams
 const query=new URLSearchParams()
 for(const key of ['via','carrier','door','legion']){
  const raw=params[key],value=Array.isArray(raw)?raw[0]:raw
  if(!value)continue
  const valid=key==='via'?value==='system-switch':
   key==='door'?/^[a-z0-9-]{1,160}$/i.test(value):
   key==='legion'?/^[a-zA-Z0-9_-]{1,80}$/.test(value):/^[a-zA-Z0-9-]{1,40}$/.test(value)
  if(valid)query.set(key,value)
 }
 redirect('/system-switch/world'+(query.size?'?'+query.toString():'')+'#domains')
}
