import Link from 'next/link'
import {CompanyDomainMap} from '@/components/weave/company-domain-map'
import {listCompanyPlots} from '@/lib/weave-native-registry'

export const dynamic='force-dynamic'

export default async function CompanyDomainPage(){
 let buildings:Awaited<ReturnType<typeof listCompanyPlots>>|undefined
 try{buildings=await listCompanyPlots()}catch(error){console.error('Company domain unavailable',error)}
 return <main className="min-h-dvh bg-[#102730] px-4 py-8 text-[#fff8e9]">
  <div className="mx-auto max-w-5xl space-y-5">
   <Link className="text-sm underline" href="/system-switch/world">Return to Weave Open World</Link>
   <h1 className="font-serif text-4xl">Company domain</h1>
   {buildings?.length?<p>Choose a department, then tap a building to find its entrance.</p>:null}
   {buildings?<CompanyDomainMap buildings={buildings}/>:<p role="alert">The company plots could not be loaded. <a className="underline" href="/system-switch/world/company-domain">Try again</a></p>}
  </div>
 </main>
}
