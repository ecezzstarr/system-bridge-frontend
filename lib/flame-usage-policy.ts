/** Shared prepaid usage subscription. Units are service allowances, not currency. */
export const FLAME_USAGE_COST={native_reply:1,model_reply:5,workshop_operation:2} as const
export type FlameUsageKind=keyof typeof FLAME_USAGE_COST
export const FLAME_PACK_UNITS=100
export function flameUsageCost(role:string,kind:FlameUsageKind){return role==='admin'?0:FLAME_USAGE_COST[kind]}
export function flamePackUsdCents(value:unknown){const n=Number(value);return Number.isSafeInteger(n)&&n>=1&&n<=100000?n:null}
