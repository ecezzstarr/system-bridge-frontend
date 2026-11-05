'use client'

import {useKingdomIdentity} from '@/components/world/kingdom-theme-frame'
export function LegionKingdomIdentity(){
  const {identity}=useKingdomIdentity()
  if(!identity)return null
  return <section className="kingdom-employment-identity mt-5 rounded-2xl px-5 py-4" data-legion-inherited-kingdom={identity.tier}>
    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/75">Your employer's File Folder environment</p>
    <h2 className="mt-2 text-xl font-bold text-white">{identity.businessName} · {identity.tier.toUpperCase()} Kingdom</h2>
    <p className="mt-2 text-xs leading-5 text-white/75">Your workspace carries the Client's purchased File Folder identity while Legion employment remains active. Your original account and recorded work remain yours.</p>
  </section>
}
