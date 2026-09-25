import { notFound } from 'next/navigation'
import { CheckCircle2, ShoppingBag } from 'lucide-react'
import { getBusinessDb, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { ensureClientInternationalPaymentProfile } from '@/lib/client-international-payments'

export default async function PublicBusinessStore({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ order?: string }>
}) {
  const { slug } = await params
  const query = await searchParams
  const sql = getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)

  const [store] = await sql`
    SELECT
      id,
      client_id,
      name,
      description,
      public_slug,
      formation_status,
      public_opened_at,
      customer_wallet_required
    FROM client_business_stores
    WHERE public_slug=${slug}
      AND enabled=true
    LIMIT 1
  `
  if (!store) notFound()

  const items = await sql`
    SELECT id,name,description,price,currency,offer_type
    FROM client_store_items
    WHERE store_id=${store.id}::uuid
      AND enabled=true
    ORDER BY created_at DESC
  `
  const payments = await ensureClientInternationalPaymentProfile(sql, store.client_id)

  return (
    <main className="min-h-screen bg-slate-950 text-white p-5 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-sky-300/10 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,.15),transparent_35%),#020617] p-6 md:p-9">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-300">WEAVE · Public Customer Door</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-5xl">{store.name}</h1>
          {store.description && <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">{store.description}</p>}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/5 px-3 py-2 text-[10px] uppercase tracking-wider text-emerald-300">
            <ShoppingBag className="h-3.5 w-3.5" /> Open to customers outside WEAVE
          </div>
        </div>

        {query.order && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/5 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
            <div>
              <p className="font-semibold">Your request has reached this Client.</p>
              <p className="mt-1 text-xs text-slate-400">Order reference: {query.order}</p>
            </div>
          </div>
        )}

        {payments.enabled && (
          <section className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">International payment</p>
            <h2 className="mt-2 text-xl font-semibold">Payment option provided by this Client</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">After sending payment, include the transfer reference in your order so the Client can reconcile it.</p>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><span className="text-slate-500">Account name</span><p className="mt-1">{payments.account_name || 'Provided by the store'}</p></div>
              <div><span className="text-slate-500">Receiving identifier</span><p className="mt-1">{payments.receiving_identifier || 'Provided by the store'}</p></div>
              <div><span className="text-slate-500">Currencies</span><p className="mt-1">{payments.supported_currencies}</p></div>
              <div><span className="text-slate-500">Service fee</span><p className="mt-1">{payments.service_fee_percent}%</p></div>
            </div>
            {payments.instructions && <p className="mt-5 whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-sm text-slate-300">{payments.instructions}</p>}
            {payments.payment_link && <a href={payments.payment_link} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-semibold">Open payment link</a>}
          </section>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map((item: any) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-6">
              <p className="text-[9px] uppercase tracking-[0.18em] text-sky-300">{item.offer_type || 'product'}</p>
              <h2 className="mt-2 text-lg font-semibold">{item.name}</h2>
              {item.description && <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>}
              {item.price != null && <p className="mt-5 font-mono text-sm">{item.price} {item.currency}</p>}
              <form className="mt-5" action={`/api/public/store/${encodeURIComponent(slug)}/orders`} method="POST">
                <input name="item_id" value={item.id} type="hidden" />
                <input name="customer_name" required placeholder="Your name" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
                <input name="customer_contact" required placeholder="Email or phone" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
                {store.customer_wallet_required && <input name="customer_wallet" required placeholder="Your receiving crypto wallet address" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />}
                <input name="payment_reference" placeholder="Payment / transfer reference (if already paid)" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
                <textarea name="customer_note" placeholder="What do you need from this Client?" rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
                <button className="mt-3 rounded-full bg-white px-5 py-2 text-xs font-semibold text-slate-950">Buy / Request</button>
              </form>
            </article>
          ))}
        </div>

        {items.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-slate-400">This Client&apos;s Customer Door is being formed. Public offers will appear here.</p>
          </div>
        )}
      </div>
    </main>
  )
}
