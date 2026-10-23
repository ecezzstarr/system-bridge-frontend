export type BlueprintCostFields={
  required_item_key?:string|null
  required_item_name?:string|null
  required_item_quantity?:number|string|null
  required_item_price_flame_coin?:number|string|null
  required_item_published?:boolean|null
}
export function quoteFileFolderBlueprint(blueprint:BlueprintCostFields,ownedInput=0){
  const required=Math.max(0,Math.trunc(Number(blueprint.required_item_quantity)||0))
  const owned=Math.max(0,Math.trunc(Number(ownedInput)||0))
  const unit=Number(blueprint.required_item_price_flame_coin)
  const hasMaterial=Boolean(blueprint.required_item_key)&&required>0
  const priceAvailable=!hasMaterial||Boolean(blueprint.required_item_name&&Number.isFinite(unit)&&unit>=0)
  const purchaseAvailable=!hasMaterial||blueprint.required_item_published!==false
  const missing=Math.max(0,required-owned)
  const price=priceAvailable?Math.max(0,unit):0
  return {
    materialName:String(blueprint.required_item_name||blueprint.required_item_key||'No additional materials'),
    materialRequired:required,materialOwned:owned,materialMissing:missing,
    unitPrice:price,requiredMaterialCost:required*price,
    acquireCost:missing*price,priceAvailable,purchaseAvailable,
    // start_build consumes materials already held in inventory; no separate wallet debit.
    buildActionCost:0,
  }
}
