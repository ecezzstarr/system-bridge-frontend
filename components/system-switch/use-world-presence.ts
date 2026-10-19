'use client'
import { useEffect,useState,type MutableRefObject } from 'react'
import type { Presence } from '@/lib/file-folder-world-runtime'
export type WorldAvatar={id:string;label:string;role:string;x:number;z:number;yaw:number;isSelf:boolean}
/** A real shared roster: populated exclusively by recent server heartbeats.
 * The UI does not generate fake avatars or claim that an absent user is live. */
export function useWorldPresence(room:string,presence:MutableRefObject<Presence>,enabled=true){
  const [avatars,setAvatars]=useState<WorldAvatar[]>([])
  const [online,setOnline]=useState(false)
  useEffect(()=>{
    if(!enabled||!room){setAvatars([]);setOnline(false);return}
    let stopped=false
    let running=false
    const send=async()=>{
      if(stopped||running||document.hidden)return
      running=true
      try{
        const token=localStorage.getItem('ssb_auth_token')
        const response=await fetch('/api/world/presence',{
          method:'POST',cache:'no-store',
          headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
          body:JSON.stringify({room,x:presence.current.x,z:presence.current.z,yaw:presence.current.yaw}),
        })
        if(!response.ok)throw Error('No shared presence connection')
        const data=await response.json()
        if(!stopped){setAvatars(Array.isArray(data.people)?data.people:[]);setOnline(true)}
      }catch{if(!stopped){setOnline(false);setAvatars([])}}
      finally{running=false}
    }
    void send()
    const timer=window.setInterval(()=>{void send()},4500)
    const onVisible=()=>{if(!document.hidden)void send()}
    document.addEventListener('visibilitychange',onVisible)
    return()=>{stopped=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)}
  },[room,enabled,presence])
  return {avatars,others:avatars.filter(x=>!x.isSelf),online}
}
