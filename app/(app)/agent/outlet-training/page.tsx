import Link from 'next/link'
import {ArrowLeft,Store} from 'lucide-react'

export const metadata={title:'Agent Training · Daily Outlet Supply | WEAVE'}
const topics=[
  {label:'Approach',detail:'Visit a real shop, observe customers and ask which food sells.'},
  {label:'Prices',detail:'Agents supply at WEAVE price. Independent stores choose their resale price.'},
  {label:'Products',detail:'Electrolyte Small ₦4,000; Medium ₦6,000. Ember Small ₦6,000; Large ₦12,000.'},
  {label:'Records',detail:'Use Distribution Route to register the outlet, supply received stock and record settlement.'},
]
export default function AgentOutletTrainingPage(){
 return <main className="mx-auto max-w-4xl space-y-6 px-4 pb-24 pt-6 text-white" data-agent-training="outlet-stability">
  <Link href="/agent/work" className="inline-flex items-center gap-2 text-xs text-emerald-300"><ArrowLeft size={16}/>Agent Work</Link>
  <header>
   <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Stability · Agent training</p>
   <h1 className="mt-2 text-3xl font-black">Daily Carton Outlet Training</h1>
   <p className="mt-3 text-sm leading-6 text-stone-300">Watch before visiting a shop. Agents sell to individuals and supply stores at official WEAVE prices. The independent store sets its own markup.</p>
  </header>
  <video controls playsInline preload="metadata" className="aspect-[9/16] w-full max-w-[420px] rounded-xl border border-emerald-300/25 bg-black" src="/training/agent-outlet-training.mp4" aria-label="WEAVE daily outlet supply training video">
   Your browser does not support this video. Open this <a href="/training/agent-outlet-training.mp4">video file</a>.
  </video>
  <div className="grid gap-3 sm:grid-cols-2">
   {topics.map(topic=><section key={topic.label} className="rounded-xl border border-white/10 bg-white/[.03] p-4">
    <p className="text-sm font-bold text-emerald-200">{topic.label}</p>
    <p className="mt-2 text-xs leading-5 text-stone-300">{topic.detail}</p>
   </section>)}
  </div>
  <p className="text-xs leading-5 text-stone-400">The video illustrates the process. Stock availability, payment verification, fresh-food handling, and outlet demand determine real orders. Daisy Pastries are handled per cake order.</p>
  <Link href="/agent/distribution" className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/40 px-4 py-3 text-sm font-bold text-emerald-200"><Store size={16}/>Open Agent Distribution Route</Link>
 </main>
}
