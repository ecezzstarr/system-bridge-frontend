import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'

export class FoodBridgeAccessError extends Error {
  constructor(message:string,public status:number) { super(message) }
}

export async function requireFoodBridgePosition(request:NextRequest) {
  const user=await getAuthUser(request)
  if (!user) throw new FoodBridgeAccessError('Sign in to your Weave Agent or Bridger position.',401)
  if (!['agent','bridger'].includes(user.role)) {
    throw new FoodBridgeAccessError('This food exchange belongs to Agent and Bridger Lifestyle positions.',403)
  }
  const access=await getLifestyleAccess(user.id)
  if (!access.active) {
    throw new FoodBridgeAccessError('Your position must have active Lifestyle access. Agents enter by position; Bridgers require active Continuance.',403)
  }
  return user
}

export function foodBridgeError(error:unknown) {
  return error instanceof FoodBridgeAccessError ? error.status : 500
}
