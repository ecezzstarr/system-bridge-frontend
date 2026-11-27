/** Company-owned prepaid usage subscription. Units are service allowances, not currency. */
export const FLAME_USAGE_COST={native_reply:1,model_reply:5,workshop_operation:2,creative_image:50,creative_text:5} as const
export type FlameUsageKind=keyof typeof FLAME_USAGE_COST
export const FLAME_PLANS=[
 {id:'go',name:'Flame Go',usdCents:300,units:300,description:'Everyday interaction and occasional workshop operations'},
 {id:'plus',name:'Flame Plus',usdCents:900,units:1200,description:'Regular work, learning and File Folder development'},
 {id:'pro',name:'Flame Pro',usdCents:3900,units:6000,description:'Intensive operational and enterprise usage'},
] as const
export type FlamePlanId=typeof FLAME_PLANS[number]['id']
export function getFlamePlan(id:unknown){return FLAME_PLANS.find(plan=>plan.id===id)||null}
export function flameUsageCost(role:string,kind:FlameUsageKind){return role==='admin'?0:FLAME_USAGE_COST[kind]}
