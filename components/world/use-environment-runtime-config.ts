'use client'

import { useCallback,useEffect,useState } from 'react'
import {
  DEFAULT_ENVIRONMENT_RUNTIME_CONFIG,
  normalizeEnvironmentRuntimeConfig,
  type EnvironmentRuntimeConfig,
} from '@/lib/weave-environment-runtime-profile'

export function useEnvironmentRuntimeConfig(){
  const [config,setConfig]=useState<EnvironmentRuntimeConfig>(DEFAULT_ENVIRONMENT_RUNTIME_CONFIG)
  const [version,setVersion]=useState(0)
  const [ready,setReady]=useState(false)

  const refresh=useCallback(async()=>{
    try{
      const response=await fetch('/api/environment-organizer',{cache:'no-store'})
      const body=await response.json()
      if(response.ok&&body?.success&&body?.runtime?.config){
        setConfig(normalizeEnvironmentRuntimeConfig(body.runtime.config))
        setVersion(Number(body.runtime.version||0))
      }
    }catch{
      // Compiled defaults keep the world operational if the runtime profile cannot be reached.
    }finally{
      setReady(true)
    }
  },[])

  useEffect(()=>{
    void refresh()
    const interval=window.setInterval(()=>void refresh(),15000)
    const focus=()=>void refresh()
    const requested=()=>void refresh()
    window.addEventListener('focus',focus)
    window.addEventListener('weave-environment-refresh',requested)
    return()=>{
      window.clearInterval(interval)
      window.removeEventListener('focus',focus)
      window.removeEventListener('weave-environment-refresh',requested)
    }
  },[refresh])

  return {config,version,ready,refresh}
}
