import {redirect} from 'next/navigation'

/** Old avatar Customer Door Plaza retired.
 * Preserve deep links and bring visitors/staff into the SAME Burning River land.
 * Real commissioned Customer Doors are opened from the Client buildings there.
 */
export default async function CustomerDoorPlazaRedirect({
 searchParams,
}:{
 searchParams:Promise<{entrance?:string;door?:string;carrier?:string;legion?:string}>
}){
 const params=await searchParams
 const url=new URLSearchParams({via:'system-switch'})
 if(params.door&&/^[a-z0-9-]{1,160}$/i.test(params.door))url.set('door',params.door)
 if(params.carrier&&/^[a-zA-Z0-9-]{1,40}$/.test(params.carrier))url.set('carrier',params.carrier)
 if(params.legion&&/^[a-zA-Z0-9_-]{1,80}$/.test(params.legion))url.set('legion',params.legion)
 redirect('/flame-event/world?'+url.toString()+'#domains')
}
