'use client'

import {useEffect,useState} from 'react'
import type {PresenceElement} from './weave-living-presence'

const KEY='weave:presence:element'
const EVENT='weave:presence:element-changed'

function valid(value:string|null):PresenceElement {
  return value==='water'||value==='fire'||value==='confluence'?value:'confluence'
}

/** A phone participant's elemental expression follows them across WEAVE worlds. */
export function usePresenceElement(){
  const [element,setElement]=useState<PresenceElement>('confluence')
  useEffect(()=>{
    const refresh=()=>{try{setElement(valid(window.localStorage.getItem(KEY)))}catch{setElement('confluence')}}
    refresh()
    window.addEventListener(EVENT,refresh)
    window.addEventListener('storage',refresh)
    return ()=>{window.removeEventListener(EVENT,refresh);window.removeEventListener('storage',refresh)}
  },[])
  return element
}

export function choosePresenceElement(element:PresenceElement){
  if(typeof window==='undefined')return
  try{window.localStorage.setItem(KEY,element)}catch{}
  window.dispatchEvent(new Event(EVENT))
}
