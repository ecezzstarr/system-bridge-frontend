import {redirect} from 'next/navigation'

/**
 * Retired per-Client avatar plaza. Client Customer Doors remain published
 * only when the Client has commissioned them; visibility is checked again
 * by the permanent WEAVE world and Client's public store APIs.
 */
export default async function LegacyHostedAvatarVisit({params,searchParams}:{
 params:Promise<{slug:string}>
 searchParams:Promise<{entrance?:string;carrier?:string;legion?:string}>
}){
 const [{slug},query]=await Promise.all([params,searchParams])
 const route=new URLSearchParams({door:slug})
 if(query.carrier&&/^[a-zA-Z0-9-]{1,40}$/.test(query.carrier))route.set('carrier',query.carrier)
 if(query.legion&&/^[a-zA-Z0-9_-]{1,80}$/.test(query.legion))route.set('legion',query.legion)
 redirect('/system-switch/world?'+route.toString()+'#domains')
}
