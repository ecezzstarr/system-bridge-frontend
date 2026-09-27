/** Serial polling: no overlap or catch-up bursts, and no hidden-tab work. */
export function visiblePoll(task:(signal:AbortSignal)=>Promise<unknown>|unknown, delay:number, immediate=true){
  let stopped=false
  let timer:ReturnType<typeof setTimeout>|undefined
  let running=false
  let resumeRequested=false
  let controller:AbortController|undefined
  const run=async()=>{
    clearTimeout(timer)
    if(stopped||document.hidden)return
    if(running){resumeRequested=true;return}
    resumeRequested=false
    running=true
    controller=new AbortController()
    const timeout=setTimeout(()=>controller?.abort(),10000)
    try{await task(controller.signal)}catch{/* Keep the last usable state. */}
    finally{
      clearTimeout(timeout)
      running=false
      if(!stopped&&!document.hidden)timer=setTimeout(run,resumeRequested?0:delay)
    }
  }
  const visibility=()=>{
    clearTimeout(timer)
    if(document.hidden)controller?.abort()
    else void run()
  }
  document.addEventListener('visibilitychange',visibility)
  if(immediate)void run()
  else if(!document.hidden)timer=setTimeout(run,delay)
  return ()=>{
    stopped=true
    clearTimeout(timer)
    controller?.abort()
    document.removeEventListener('visibilitychange',visibility)
  }
}
