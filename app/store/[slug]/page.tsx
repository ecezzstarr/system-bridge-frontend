import { notFound } from 'next/navigation'
import { getBusinessDb, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { ensureClientInternationalPaymentProfile } from '@/lib/client-international-payments'

export default async function PublicBusinessStore({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sql = getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)
  const [store] = await sql`SELECT id,client_id,name,description,public_slug FROM client_business_stores WHERE public_slug=${slug} AND enabled=true LIMIT 1`
  if (!store) notFound()
  const items = await sql`SELECT id,name,description,price,currency FROM client_store_items WHERE store_id=${store.id}::uuid AND enabled=true ORDER BY created_at DESC`
  const payments = await ensureClientInternationalPaymentProfile(sql, store.client_id)
  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Business Store</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-semibold">{store.name}</h1>
        {store.description && <p className="mt-4 max-w-2xl text-slate-400">{store.description}</p>}
        {payments.enabled && <section className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6"><p className="text-xs uppercase tracking-[0.2em] text-emerald-300">International payment</p><h2 className="mt-2 text-xl font-semibold">Pay through Wise</h2><p className="mt-2 text-sm leading-6 text-slate-400">This store accepts manual international payments through the receiving details below. After sending payment, include the transfer reference in your request.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm"><div><span className="text-slate-500">Account name</span><p className="mt-1">{payments.account_name || 'Provided by the store'}</p></div><div><span className="text-slate-500">Receiving identifier</span><p className="mt-1">{payments.receiving_identifier || 'Provided by the store'}</p></div><div><span className="text-slate-500">Currencies</span><p className="mt-1">{payments.supported_currencies}</p></div><div><span className="text-slate-500">Service fee</span><p className="mt-1">{payments.service_fee_percent}%</p></div></div>{payments.instructions&&<p className="mt-5 whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-sm text-slate-300">{payments.instructions}</p>}{payments.payment_link&&<a href={payments.payment_link} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-semibold">Open payment link</a>}</section>}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map((item: any) => <article key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-6">
            <h2 className="text-lg font-semibold">{item.name}</h2>
            {item.description && <p className="mt-2 text-sm text-slate-400">{item.description}</p>}
            {item.price != null && <p className="mt-5 font-mono text-sm">{item.price} {item.currency}</p>}
            <form className="mt-5" action={`/api/public/store/${encodeURIComponent(slug)}/orders`} method="POST">
              <input name="item_id" value={item.id} type="hidden" />
              <input name="customer_name" required placeholder="Your name" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input name="customer_contact" required placeholder="Email or phone" className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input name="customer_wallet" required placeholder="Your receiving crypto wallet address" className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input name="payment_reference" placeholder="Payment / transfer reference (after payment)" className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <textarea name="customer_note" placeholder="Additional note" rows={3} className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <button className="mt-3 rounded-full bg-white px-5 py-2 text-xs font-semibold text-slate-950">Request / Buy</button>
            </form>
          </article>)}
        </div>
        {items.length===0 && <p className="mt-10 text-sm text-slate-500">This workshop is preparing its public offers.</p>}
      </div>
    </main>
  )
}
