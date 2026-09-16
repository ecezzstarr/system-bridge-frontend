import { notFound } from 'next/navigation'
import { getBusinessDb, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'

export default async function PublicBusinessStore({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sql = getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)
  const [store] = await sql`SELECT id,name,description,public_slug FROM client_business_stores WHERE public_slug=${slug} AND enabled=true LIMIT 1`
  if (!store) notFound()
  const items = await sql`SELECT id,name,description,price,currency FROM client_store_items WHERE store_id=${store.id}::uuid AND enabled=true ORDER BY created_at DESC`
  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Business Store</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-semibold">{store.name}</h1>
        {store.description && <p className="mt-4 max-w-2xl text-slate-400">{store.description}</p>}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map((item: any) => <article key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-6">
            <h2 className="text-lg font-semibold">{item.name}</h2>
            {item.description && <p className="mt-2 text-sm text-slate-400">{item.description}</p>}
            {item.price != null && <p className="mt-5 font-mono text-sm">{item.price} {item.currency}</p>}
            <form className="mt-5" action={`/api/public/store/${encodeURIComponent(slug)}/orders`} method="POST">
              <input name="item_id" value={item.id} type="hidden" />
              <input name="customer_name" required placeholder="Your name" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input name="customer_contact" required placeholder="Email or phone" className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <button className="mt-3 rounded-full bg-white px-5 py-2 text-xs font-semibold text-slate-950">Request / Buy</button>
            </form>
          </article>)}
        </div>
        {items.length===0 && <p className="mt-10 text-sm text-slate-500">This workshop is preparing its public offers.</p>}
      </div>
    </main>
  )
}
