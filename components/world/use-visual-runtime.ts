'use client'

import { useCallback,useEffect,useState } from 'react'
import {
  DEFAULT_FLAME_ARTIFACT_CONFIG,
  normalizeFlameArtifactConfig,
  type FlameArtifactVisualConfig,
} from '@/lib/weave-visual-profile'

let cachedConfig:FlameArtifactVisualConfig=DEFAULT_FLAME_ARTIFACT_CONFIG
let cachedVersion=0
let cachedAt=0
let pending:Promise<void>|null=null

async function pullVisualRuntime(){
  const now=Date.now()
  if(now-cachedAt<7000)return
  if(pending)return pending

  cachedAt=now
  pending=fetch('/api/visual-runtime',{cache:'no-store'})
    .then(async response=>{
      if(!response.ok)throw new Error('Visual runtime unavailable')
      const body=await response.json()
      if(body?.success&&body.config){
        cachedConfig=normalizeFlameArtifactConfig(body.config)
        cachedVersion=Number(body.version||0)
      }
    })
    .catch(()=>{})
    .finally(()=>{pending=null})

  return pending
}

export function useVisualRuntime(){
  const [config,setConfig]=useState<FlameArtifactVisualConfig>(cachedConfig)
  const [version,setVersion]=useState(cachedVersion)

  const refresh=useCallback(async(force=false)=>{
    if(force)cachedAt=0
    await pullVisualRuntime()
    setConfig(cachedConfig)
    setVersion(cachedVersion)
  },[])

  useEffect(()=>{
    let mounted=true
    const pull=async()=>{
      await pullVisualRuntime()
      if(!mounted)return
      setConfig(cachedConfig)
      setVersion(cachedVersion)
    }
    void pull()
    const interval=window.setInterval(()=>void pull(),15000)
    const focus=()=>void pull()
    const published=()=>void refresh(true)
    window.addEventListener('focus',focus)
    window.addEventListener('weave:visual-runtime-published',published)
    return()=>{
      mounted=false
      window.clearInterval(interval)
      window.removeEventListener('focus',focus)
      window.removeEventListener('weave:visual-runtime-published',published)
    }
  },[refresh])

  return {config,version,refresh}
}
