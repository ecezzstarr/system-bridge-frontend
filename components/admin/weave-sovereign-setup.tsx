import Link from 'next/link'

export type SovereignSetup={
 reportingConfigured:boolean
 productionDatabaseIdentified:boolean
 productionReleaseSha:string|null
}

export function WeaveSovereignSetup({setup}:{setup:SovereignSetup|null}){
 const status=[
  {label:'Candidate reporting receiver',ok:setup?.reportingConfigured},
  {label:'Existing database continuity identifier',ok:setup?.productionDatabaseIdentified},
  {label:'Current production release identity',ok:Boolean(setup?.productionReleaseSha)},
 ]
 return <section className="space-y-5 rounded-3xl border border-cyan-200/20 bg-[#0c2335] p-5 sm:p-8" aria-labelledby="owned-server-setup">
  <header>
   <p className="text-xs font-bold uppercase tracking-[.16em] text-[#ecd4a7]">Prepare → test → authorize → switch → verify</p>
   <h2 id="owned-server-setup" className="mt-3 text-2xl font-bold">Build Weave's independent server</h2>
   <p className="mt-3 text-sm leading-7 text-slate-200">Weave-owned means company-controlled hardware and operations. Oracle continues serving the company while the separate server is built and tested. Administrations authorizes the switch only after the candidate works and continuity is verified.</p>
  </header>
  <div className="grid gap-3 sm:grid-cols-3" aria-label="Current production preparation">
   {status.map(item=><div key={item.label} className="rounded-xl border border-white/10 p-4">
    <p className="text-sm font-semibold">{item.label}</p>
    <p className={'mt-2 text-xs '+(!setup?'text-slate-400':item.ok?'text-cyan-100':'text-amber-100')}>
     {!setup?'Status unavailable':item.ok?'Configured':'Needs private server configuration'}
    </p>
   </div>)}
  </div>
  {setup?.productionReleaseSha&&<p className="break-all text-xs leading-6 text-slate-300">Current production release: <code>{setup.productionReleaseSha}</code>. Candidate and production must run the same reviewed release before the host transition.</p>}
  <ol className="grid gap-4 md:grid-cols-2">
   <li className="rounded-2xl border border-white/10 p-5">
    <h3 className="font-bold">1. Prepare company infrastructure</h3>
    <p className="mt-2 text-sm leading-7 text-slate-300">Provide the company-controlled Linux machine, reliable power, public network access, storage and offsite recovery. Minimum candidate checks: 4 CPUs, 8 GiB RAM and 32 GiB free disk. Assign a separate HTTPS candidate hostname while the company domain remains on Oracle.</p>
   </li>
   <li className="rounded-2xl border border-white/10 p-5">
    <h3 className="font-bold">2. Install and test in isolation</h3>
    <p className="mt-2 text-sm leading-7 text-slate-300">Install the reviewed Weave runtime with a restored staging database and separate media. Verify login, File Folders, balances, orders and recovery using test accounts and test payment credentials. Configure the private host identity and reporting token on the servers.</p>
   </li>
   <li className="rounded-2xl border border-white/10 p-5">
    <h3 className="font-bold">3. Send measured readiness</h3>
    <p className="mt-2 text-sm leading-7 text-slate-300">The appointed host operator runs this command from the trusted candidate checkout. It inspects the host and reports evidence; it does not switch traffic. The supplied service and timer repeat the report every five minutes.</p>
    <pre className="mt-3 overflow-x-auto rounded-xl bg-black/25 p-3 text-xs text-cyan-100"><code>python3 selfhost/sovereign-candidate-probe.py --report</code></pre>
   </li>
   <li className="rounded-2xl border border-white/10 p-5">
    <h3 className="font-bold">4. Carry the existing company forward</h3>
    <p className="mt-2 text-sm leading-7 text-slate-300">For the first host move, preserve the existing production database and verify the full media transfer. Use read-only database access and the candidate ingress quarantine during final checks. Then use the transition panel below for company authorization, the operator's routing change and final acceptance.</p>
   </li>
  </ol>
  <p className="text-sm leading-7 text-amber-100">Full independence also requires company-controlled database, media and backups. The first host switch does not move the external database. That data move needs a separately verified restore, record reconciliation and Administrations authorization. Keep Oracle available for recovery until the company accepts the completed transition.</p>
  <div className="flex flex-wrap gap-3 text-sm">
   <a className="inline-flex min-h-11 items-center rounded-xl border border-cyan-200/35 px-4 text-cyan-100" href="https://github.com/ecezzstarr/system-bridge-frontend/blob/main/docs/weave-sovereign-server-transition.md" target="_blank" rel="noreferrer">Open host installation and switch instructions</a>
   <Link className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4" href="/admin/infrastructure">Current infrastructure</Link>
  </div>
 </section>
}
