'use client'
import { useSyncExternalStore } from 'react'
import { createRuntimeResource } from '@/lib/runtime-resource'
import { DEFAULT_FLAME_ARTIFACT_CONFIG,normalizeFlameArtifactConfig } from '@/lib/weave-visual-profile'
const visualResource=createRuntimeResource('/api/visual-runtime',{
  config:DEFAULT_FLAME_ARTIFACT_CONFIG,version:0,
},body=>{
  if(!body?.success||!body.config)throw new Error('Visual runtime unavailable')
  return {config:normalizeFlameArtifactConfig(body.config),version:Number(body.version||0)}
},'weave:visual-runtime-published')
export function useVisualRuntime(){
  const {data}=useSyncExternalStore(visualResource.subscribe,visualResource.getSnapshot,visualResource.getServerSnapshot)
  return {...data,refresh:visualResource.refresh}
}
