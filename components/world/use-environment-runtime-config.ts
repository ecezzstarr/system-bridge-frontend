'use client'
import { useSyncExternalStore } from 'react'
import { createRuntimeResource } from '@/lib/runtime-resource'
import { DEFAULT_ENVIRONMENT_RUNTIME_CONFIG,normalizeEnvironmentRuntimeConfig } from '@/lib/weave-environment-runtime-profile'
export type RuntimeSurface={
  surface_key:string;label:string;surface_kind:'district'|'place'|'station';route:string
  area:string;scope:string;is_visible:boolean;sort_order:number;is_protected:boolean
}
const environmentResource=createRuntimeResource('/api/environment-organizer',{
  config:DEFAULT_ENVIRONMENT_RUNTIME_CONFIG,version:0,items:[] as RuntimeSurface[],
},body=>{
  if(!body?.success)throw new Error('Environment unavailable')
  return {
    config:normalizeEnvironmentRuntimeConfig(body.runtime?.config),
    version:Number(body.runtime?.version||0),
    items:Array.isArray(body.items)?body.items as RuntimeSurface[]:[],
  }
},'weave-environment-refresh')
export function useEnvironmentRuntimeConfig(){
  const {data,ready}=useSyncExternalStore(environmentResource.subscribe,environmentResource.getSnapshot,environmentResource.getServerSnapshot)
  return {...data,ready,refresh:environmentResource.refresh}
}
