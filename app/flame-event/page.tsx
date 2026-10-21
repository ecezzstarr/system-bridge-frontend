import { PublicFlameEventMobile } from '@/components/events/flame-event-public-mobile'

/** Agent Carrier attribution is a return path, never a public account grant. */
export default async function PublicFlameEventPage({
  searchParams,
}:{
  searchParams:Promise<{carrier?:string|string[]}>
}){
  const {carrier}=await searchParams
  const requestedCode=Array.isArray(carrier)?carrier[0]:carrier
  const carrierCode=typeof requestedCode==='string'&&/^[a-zA-Z0-9-]{1,40}$/.test(requestedCode)?requestedCode:null
  return <PublicFlameEventMobile carrierCode={carrierCode}/>
}
