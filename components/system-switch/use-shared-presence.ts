'use client'
import {useEffect,useRef,useState,type MutableRefObject} from 'react'
import {visiblePoll} from '@/lib/visible-poll'
import {SYSTEM_SWITCH_ROOM,reconcilePresence,type SharedAvatar} from '@/lib/system-switch-presence'
import type {Presence} from '@/lib/file-folder-world-runtime'

export function useSharedPresence(presence:MutableRefObject<Presence>,getToken:()=>string|null){
 const [people,setPeople]=useState<SharedAvatar[]>([])
 const [self,setSelf]=useState<SharedAvatar|null>(null)
 const [status,setStatus]=useState<'connecting'|'connected'|'interrupted'|'denied'>('connecting')
 const tokenGetter=useRef(getToken);tokenGetter.current=getToken
 useEffect(()=>{
  let alive=true,sequence=0,stop=()=>{},joined=false
  const connectionId=crypto.randomUUID()
  const headers=()=>{const token=tokenGetter.current();return {'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}}
  const leave=()=>{joined=false;if(alive){setPeople([]);setStatus('connecting')};void fetch(`/api/system-switch/world?connectionId=${connectionId}`,{method:'DELETE',headers:headers(),keepalive:true}).catch(()=>{})}
  stop=visiblePoll(async signal=>{
   try{
    const p={...presence.current,heading:presence.current.heading??presence.current.yaw}
    const response=await fetch('/api/system-switch/world',{method:'POST',headers:headers(),cache:'no-store',signal,body:JSON.stringify({room:SYSTEM_SWITCH_ROOM,connectionId,sequence:++sequence,position:{x:p.x,z:p.z,yaw:p.yaw,heading:p.heading??p.yaw}})})
    if(!alive)return
    if(response.status===401||response.status===403){setStatus('denied');setPeople([]);stop();return}
    if(!response.ok)throw new Error('Shared connection interrupted')
    const data=await response.json();if(!alive||signal.aborted)return
    if(!data.self||!Array.isArray(data.people))throw new Error('Invalid shared snapshot')
    presence.current=reconcilePresence(presence.current,p,data.self.position,!joined||Boolean(data.rejoined))
    joined=true;setSelf(data.self);setPeople(data.people);setStatus('connected')
   }catch{if(alive&&!document.hidden){setStatus('interrupted');setPeople([])}}
  },500)
  const hidden=()=>{if(document.hidden)leave()}
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',leave)
  return()=>{alive=false;stop();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',leave);leave()}
 },[presence])
 return {people,self,status}
}
