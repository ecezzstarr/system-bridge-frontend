import {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN,
  AGILITY_AGENT_UNIT_COST_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
} from '@/lib/agility-catalog'
import { ELECTROLYTE_VARIANTS } from '@/lib/electrolyte-catalog'
import { EMBER_VARIANTS } from '@/lib/ember-catalog'
import { DAISY_AGENT_COMMISSION_NGN,DAISY_CAKE_SLICE_PRICE_NGN } from '@/lib/cake-catalog'
import { FARM_TO_FAMILY_SELLER_FEE_NGN,calculateFarmSettlement } from '@/lib/farm-service-fee'

const money=(v:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(v)
const officialFoodPriceText=[
  `Agility ${money(AGILITY_RETAIL_UNIT_PRICE_NGN)}`,
  ...ELECTROLYTE_VARIANTS.map(variant=>`${variant.name.replace(' · ', ' ')} ${money(Number(variant.agentSellingUnitPriceNgn))}`),
  ...EMBER_VARIANTS.map(variant=>`${variant.name.replace(' · ', ' ')} ${money(Number(variant.agentSellingUnitPriceNgn))}`),
].join(' · ')

/** Official WEAVE economics, shown on Agent order, stock, and Carrier Info pages.
 * Agent "earnings" are gross resale margins AFTER the corresponding sale; the
 * panel makes no automatic payroll/wallet credit claim.
 */
export function AgentFoodPricingInfo({product='both'}:{product?:'agility'|'electrolyte'|'both'}) {
  const title=product==='agility'?'AGILITY':product==='electrolyte'?'ELECTROLYTE':'AGILITY + ELECTROLYTE + EMBER'
  return <section className="border border-emerald-300/20 bg-emerald-300/[.035] p-5 text-white sm:p-6" data-food-official-agent-info={product}>
    <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-200">Official WEAVE Price · Agent Earnings Info</p>
    <h2 className="mt-2 text-xl font-black">{title} — official prices by size</h2>
    <p className="mt-2 text-sm font-bold text-emerald-100">{officialFoodPriceText}</p>
    <p className="mt-2 text-xs leading-6 text-stone-300">Agents sell directly to individuals and supply independent shops at the official price shown for each variant. Shops choose their own resale markup. Each food variant currently leaves {money(AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN)} gross Agent margin at WEAVE price; that margin is already included, not added. The carton example below is Agility.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-4">
      {[
        ['One sale',money(AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN)],
        ['Half carton · 5 units',money(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN/2)],
        [`Full carton · ${AGILITY_PACKAGES_PER_BOX} units`,money(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN)],
        ['Stock cost · full carton',money(AGILITY_AGENT_BOX_PRICE_NGN)],
      ].map(([label,value])=><div className="border border-white/10 bg-black/15 p-3" key={label}>
        <p className="text-[10px] leading-4 text-stone-400">{label}</p>
        <p className="mt-2 text-lg font-black text-emerald-100">{value}</p>
      </div>)}
    </div>
    <p className="mt-4 text-xs leading-5 text-stone-400">Half-carton Agent stock cost: {money(AGILITY_AGENT_BOX_PRICE_NGN/2)}; full-carton customer sell-out value: {money(AGILITY_RETAIL_UNIT_PRICE_NGN*AGILITY_PACKAGES_PER_BOX)}. These are gross sales margins, not guaranteed wages or additional referral bonuses. OPay stock payment requires Administration verification; shipping/waybill charges are separate where applicable.</p>
  </section>
}

export function CustomerFoodPriceInfo() {
  return <section className="border border-emerald-300/20 bg-emerald-300/[.035] p-5 text-white sm:p-6" data-food-official-customer-info>
    <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-200">WEAVE Food · Official Customer Prices</p>
    <h2 className="mt-2 text-2xl font-black">{officialFoodPriceText}</h2>
    <p className="mt-2 text-xs leading-6 text-stone-300">Each product size has its own fixed WEAVE customer price. Agents sell directly at that price; independent shops that buy from Agents set their own resale price. The Agent's sales margin is part of the price; it is not an additional customer charge. Delivery and waybill fees, if required, are shown separately before payment.</p>
    <p className="mt-3 text-xs text-stone-300">Customers order their own bowls or packages from an Agent’s Carrier Customer Door and pay the Agent’s displayed receiving account. That stock was purchased by the Agent from WEAVE OPay and must have been paid for and received before the Customer Door offers it.</p>
    <p className="mt-3 text-xs text-stone-400">Only available received Agent stock can be ordered. Follow the payment instructions for the particular WEAVE product; Farm-to-Family purchases use a separate WEAVE-held payment flow.</p>
  </section>
}

export function DaisyPricingInfo({audience='agent'}:{audience?:'agent'|'public'|'admin'}) {
  return <section className="border border-amber-300/20 bg-amber-300/[.035] p-5 text-white sm:p-6" data-daisy-official-info={audience}>
    <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-200">Daisy Pastries · Official Price & Work Info</p>
    <h2 className="mt-2 text-xl font-black">Cake Slice {money(DAISY_CAKE_SLICE_PRICE_NGN)} · Selling Agent earns {money(DAISY_AGENT_COMMISSION_NGN)}</h2>
    <p className="mt-2 text-xs leading-6 text-stone-300">A cake slice costs {money(DAISY_CAKE_SLICE_PRICE_NGN)}. Bento Cake costs ₦10,000. Other cakes follow their published bands or Administration-approved quote. For each successfully paid and completed cake sale, the selling Agent's share is {money(DAISY_AGENT_COMMISSION_NGN)}, regardless of the cake type. This share comes out of the cake price, not on top of it.</p>
    <p className="mt-3 text-xs leading-5 text-stone-400">{audience==='public'?'Your Agent confirms the exact eligible cake price and any delivery/waybill fee before payment.':'Record the sale under the correct Agent and original cake order. A pending quote or payment reference is not a completed sale.'} Preparation follows verified payment and order approval. Transport charges are separate.</p>
  </section>
}

export function FarmToFamilySettlementInfo({audience='buyer'}:{audience?:'buyer'|'seller'|'admin'|'public'}) {
  const example=calculateFarmSettlement(20000)
  return <section className="border border-emerald-300/20 bg-emerald-300/[.035] p-5 text-white sm:p-6" data-farm-official-info={audience}>
    <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-200">Farm-to-Family · Payment & Seller Fee Info</p>
    <h2 className="mt-2 text-xl font-black">WEAVE receives a flat {money(FARM_TO_FAMILY_SELLER_FEE_NGN)} from the seller per completed order</h2>
    <p className="mt-2 text-xs leading-6 text-stone-300">The farmer chooses the produce price. A transport quotation is agreed before purchase. The buyer pays the accepted total to WEAVE; there is <strong>no extra WEAVE fee for the buyer</strong>. On successful completion, WEAVE deducts {money(FARM_TO_FAMILY_SELLER_FEE_NGN)} once from the farmer's proceeds—not per unit, bag, carton, or kilogram.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {[
        ['Example · buyer pays',money(example.buyerTotalNgn)],
        ['One seller fee',money(example.sellerFeeNgn)],
        ['Farmer receives',money(example.sellerPayoutNgn)],
      ].map(([label,value])=><div className="border border-white/10 bg-black/15 p-3" key={label}><p className="text-[10px] text-stone-400">{label}</p><p className="mt-2 text-lg font-black text-emerald-100">{value}</p></div>)}
    </div>
    <p className="mt-4 text-xs leading-6 text-stone-300"><strong>Buyer orders → Farmer quotes → Buyer pays WEAVE → Administration independently verifies received funds → Farmer is notified to dispatch → Buyer confirms receipt → Administration transfers the net farmer payout.</strong></p>
    <p className="mt-2 text-xs leading-5 text-stone-400">A payment reference alone is not proof that money was received. Disputed transactions are held for review; cancelled/refunded orders do not earn WEAVE the fee. WEAVE currently records external bank settlement and payout references: this does not mean payouts are automatically transferred by the app.</p>
  </section>
}
