import type { PoolClient } from 'pg'
import type { PreparationProduct } from '@/lib/food-preparation-manager'

export const FOOD_AGENT_MARGIN_PER_PACKAGE_NGN=1000
export const FOOD_ADMIN_PER_PACKAGE_NGN=800
export const FOOD_FAMILY_SUPPORT_PER_PACKAGE_NGN=200
export const FOOD_FORENSIC_STOCK_PRODUCTS=['agility','electrolyte','ember'] as const
export type FoodStockProduct=typeof FOOD_FORENSIC_STOCK_PRODUCTS[number]
export type FoodForensicBeneficiary='administration'|'family_support'|'lead_manager'
export const FOOD_FORENSIC_BENEFICIARIES=['administration','family_support','lead_manager'] as const
export function isFoodForensicBeneficiary(value:unknown):value is FoodForensicBeneficiary {
  return FOOD_FORENSIC_BENEFICIARIES.some(item=>item===value)
}
export function isFoodStockProduct(value:PreparationProduct):value is FoodStockProduct {
  return (FOOD_FORENSIC_STOCK_PRODUCTS as readonly string[]).includes(value)
}

type PaidStockOrder={
  id:string;agent_id:string;payment_status:string;package_count:number|string;box_count:number|string;
  total_ngn:number|string;retail_unit_price_ngn:number|string;agent_unit_cost_ngn:number|string;
}
export function calculateFoodStockForensicSplit(order:PaidStockOrder){
  const units=Number(order.package_count)
  const amount=Number(order.total_ngn)
  const retailUnit=Number(order.retail_unit_price_ngn)
  const unitCost=Number(order.agent_unit_cost_ngn)
  if(!Number.isSafeInteger(units)||units<=0||!Number.isFinite(amount)||amount<=0||
    !Number.isFinite(retailUnit)||!Number.isFinite(unitCost)||
    !Number.isInteger(amount)||!Number.isInteger(retailUnit)||!Number.isInteger(unitCost)||
    !Number.isInteger(amount/units)||amount/units!==unitCost)
    throw new Error('Stock order payment amounts or package quantity cannot be reconciled.')
  if(retailUnit-unitCost!==FOOD_AGENT_MARGIN_PER_PACKAGE_NGN)
    throw new Error('Stock pricing must preserve the Agent ₦1,000 retail margin per food package.')
  const admin=units*FOOD_ADMIN_PER_PACKAGE_NGN
  const support=units*FOOD_FAMILY_SUPPORT_PER_PACKAGE_NGN
  const preparation=amount-admin-support
  if(preparation<=0)throw new Error('Insufficient received stock proceeds for preparation after protected allocations.')
  return {
    packageCount:units,receivedNgn:amount,unitCostNgn:unitCost,retailUnitPriceNgn:retailUnit,
    expectedRetailNgn:retailUnit*units,agentExpectedMarginNgn:FOOD_AGENT_MARGIN_PER_PACKAGE_NGN*units,
    administrationNgn:admin,familySupportNgn:support,leadPreparationNgn:preparation,
  }
}

/**
 * Called only inside the verified Agent→WEAVE OPay stock-payment transaction.
 * NEVER call from Carrier customer checkout or from Daisy cake sales. A retail
 * sale draws down the already funded stock and preserves the Agent's margin.
 * Payouts require Forensics to record independent, actual external transfers.
 */
export async function allocateVerifiedFoodStockFunds(
  client:PoolClient,product:PreparationProduct,order:PaidStockOrder
){
  if(!isFoodStockProduct(product))return null
  if(order.payment_status!=='paid')throw new Error('Forensics may not allocate unverified stock funds.')
  const split=calculateFoodStockForensicSplit(order)
  await client.query(`
    INSERT INTO weave_food_forensic_stock_splits(
      product,source_order_id,purchasing_agent_id,package_count,
      received_ngn,agent_expected_margin_ngn,administration_ngn,
      family_support_ngn,lead_preparation_ngn,retail_unit_price_ngn,unit_cost_ngn
    ) VALUES($1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (product,source_order_id) DO NOTHING
  `,[product,order.id,order.agent_id,split.packageCount,split.receivedNgn,
    split.agentExpectedMarginNgn,split.administrationNgn,split.familySupportNgn,
    split.leadPreparationNgn,split.retailUnitPriceNgn,split.unitCostNgn])
  const {rows:existing}=await client.query(`
    SELECT id,package_count,received_ngn,administration_ngn,family_support_ngn,
      lead_preparation_ngn FROM weave_food_forensic_stock_splits
    WHERE product=$1 AND source_order_id=$2::uuid
  `,[product,order.id])
  const row=existing[0]
  if(!row || Number(row.package_count)!==split.packageCount ||
     Number(row.received_ngn)!==split.receivedNgn ||
     Number(row.administration_ngn)!==split.administrationNgn ||
     Number(row.family_support_ngn)!==split.familySupportNgn ||
     Number(row.lead_preparation_ngn)!==split.leadPreparationNgn)
    throw new Error('This food payment was previously allocated with different financial terms. Forensics reconciliation required.')
  // Guarantee one beneficiary row for each leg without creating bank transfers.
  for(const [beneficiary,amount] of [
    ['administration',split.administrationNgn],
    ['family_support',split.familySupportNgn],
    ['lead_manager',split.leadPreparationNgn],
  ] as const){
    await client.query(`
      INSERT INTO weave_food_forensic_payouts(split_id,beneficiary,amount_ngn)
      VALUES($1::uuid,$2,$3)
      ON CONFLICT (split_id,beneficiary) DO NOTHING
    `,[row.id,beneficiary,amount])
  }
  return {id:String(row.id),...split}
}
