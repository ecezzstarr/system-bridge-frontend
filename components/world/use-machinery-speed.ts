'use client'

import {useSyncExternalStore} from 'react'
import {useVisualRuntime} from './use-visual-runtime'

const preference='(prefers-reduced-motion: reduce)'
function subscribe(change:()=>void){
  const media=window.matchMedia(preference)
  media.addEventListener('change',change)
  return ()=>media.removeEventListener('change',change)
}
export function useMachinerySpeed(){
  const {config}=useVisualRuntime()
  const reduced=useSyncExternalStore(subscribe,()=>window.matchMedia(preference).matches,()=>true)
  return reduced?0:config.architecture.machinery
}
