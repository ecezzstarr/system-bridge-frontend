import { visiblePoll } from './visible-poll'

/** One request, timer and event subscription per public runtime resource. */
export function createRuntimeResource<T>(url:string,initial:T,parse:(body:any)=>T,event:string,authenticated=false){
  const server={data:initial,ready:false}
  let snapshot=server
  let serialized=JSON.stringify(initial)
  const listeners=new Set<()=>void>()
  let pending:Promise<void>|null=null
  let controller:AbortController|undefined
  let stop:(()=>void)|undefined
  let lastAttempt=0
  const refresh=(force=false):Promise<void>=>{
    if(pending)return pending
    if(document.hidden||(!force&&Date.now()-lastAttempt<5000))return Promise.resolve()
    lastAttempt=Date.now()
    controller=new AbortController()
    const request=controller
    const timeout=setTimeout(()=>request.abort(),5000)
    pending=(async()=>{
      try{
        const token=authenticated?localStorage.getItem('ssb_auth_token'):null
        const response=await fetch(url,{cache:'no-store',signal:request.signal,...(token?{headers:{Authorization:`Bearer ${token}`}}:{})})
        if(!response.ok)throw new Error('Runtime unavailable')
        const data=parse(await response.json())
        if(request.signal.aborted)return
        const next=JSON.stringify(data)
        if(next!==serialized){serialized=next;snapshot={data,ready:true}}
      }catch{/* Compiled defaults/last good data preserve continuity. */}
      finally{
        clearTimeout(timeout)
        if(!snapshot.ready)snapshot={...snapshot,ready:true}
        pending=null
        for(const listener of listeners)listener()
      }
    })()
    return pending
  }
  const published=()=>{void refresh(true)}
  const focus=()=>{void refresh()}
  return {
    getSnapshot:()=>snapshot,
    getServerSnapshot:()=>server,
    refresh,
    subscribe:(listener:()=>void)=>{
      listeners.add(listener)
      if(listeners.size===1){
        stop=visiblePoll(signal=>{
          const abort=()=>controller?.abort()
          signal.addEventListener('abort',abort,{once:true})
          return refresh().finally(()=>signal.removeEventListener('abort',abort))
        },15000)
        // Strict Mode may immediately remount while the previous request aborts.
        if(pending&&controller?.signal.aborted){
          void pending.then(()=>{
            if(listeners.size&&!document.hidden){lastAttempt=0;void refresh()}
          })
        }
        window.addEventListener('focus',focus)
        window.addEventListener(event,published)
      }
      return ()=>{
        listeners.delete(listener)
        if(!listeners.size){
          stop?.()
          controller?.abort()
          window.removeEventListener('focus',focus)
          window.removeEventListener(event,published)
        }
      }
    },
  }
}
