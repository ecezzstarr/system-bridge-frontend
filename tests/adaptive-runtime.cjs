const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
class Events {
  listeners=new Map()
  addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn)}
  removeEventListener(name,fn){this.listeners.get(name)?.delete(fn)}
  emit(name){for(const fn of [...(this.listeners.get(name)||[])])fn()}
  count(){return [...this.listeners.values()].reduce((n,set)=>n+set.size,0)}
}
function harness(){
  let time=10000,id=0
  const timers=new Map(),document=new Events(),window=new Events(),modules=new Map()
  document.hidden=false;document.documentElement={dataset:{}}
  const setTimeout=(fn,ms)=>{const key=++id;timers.set(key,{fn,at:time+ms});return key}
  const clearTimeout=id=>timers.delete(id)
  const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve()}
  const tick=async ms=>{
    const end=time+ms
    while(true){
      const entry=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0]
      if(!entry)break
      time=entry[1].at;timers.delete(entry[0]);entry[1].fn();await flush()
    }
    time=end;await flush()
  }
  const sandbox={document,window,setTimeout,clearTimeout,AbortController,console,performance:{now:()=>time},Date:{now:()=>time},navigator:{hardwareConcurrency:8,deviceMemory:8},matchMedia:()=>Object.assign(new Events(),{matches:false})}
  Object.assign(window,{setTimeout,clearTimeout})
  const load=(file,overrides={})=>{
    if(modules.has(file))return modules.get(file)
    const exports={};modules.set(file,exports)
    const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
    const require=name=>{
      if(name in overrides)return overrides[name]
      if(name.startsWith('.'))return load(path.posix.normalize(path.posix.join(path.posix.dirname(file),name))+'.ts',overrides)
      throw new Error('Unexpected dependency '+name)
    }
    vm.runInNewContext(code,{...sandbox,exports,require},{filename:file})
    return exports
  }
  return {sandbox,load,tick,flush,timers,document,window}
}
async function polling(){
  const h=harness(),{visiblePoll}=h.load('lib/visible-poll.ts')
  let calls=0,release,signal
  const stop=visiblePoll(s=>{calls++;signal=s;return new Promise(resolve=>release=resolve)},100)
  assert.equal(calls,1)
  await h.tick(500);assert.equal(calls,1,'pending work cannot overlap')
  h.document.hidden=true;h.document.emit('visibilitychange')
  assert.equal(signal.aborted,true)
  release();await h.flush();await h.tick(1000);assert.equal(calls,1)
  h.document.hidden=false;h.document.emit('visibilitychange');assert.equal(calls,2)
  stop();release();await h.flush();assert.equal(h.timers.size,0);assert.equal(h.document.count(),0)
}
async function resources(){
  const h=harness();let calls=0,signal,release
  h.sandbox.fetch=(_url,options)=>{
    calls++;signal=options.signal
    return new Promise((resolve,reject)=>{
      release=()=>resolve({ok:true,json:async()=>({value:3})})
      signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})
    })
  }
  const {createRuntimeResource}=h.load('lib/runtime-resource.ts')
  const store=createRuntimeResource('/runtime',{value:0},b=>b,'published')
  const unsubscribe1=store.subscribe(()=>{}),unsubscribe2=store.subscribe(()=>{})
  assert.equal(calls,1,'multiple consumers share one request')
  release();await h.flush()
  const first=store.getSnapshot();assert.equal(first.ready,true);assert.equal(first.data.value,3)
  const refresh=store.refresh(true);release();await refresh
  assert.equal(store.getSnapshot(),first,'unchanged data keeps the snapshot identity')
  h.document.hidden=true;h.document.emit('visibilitychange');await h.tick(30000)
  assert.equal(calls,2,'no hidden polling')
  h.document.hidden=false;h.document.emit('visibilitychange');assert.equal(calls,3)
  await h.tick(5000);assert.equal(signal.aborted,true,'hung requests time out')
  assert.equal(store.getSnapshot(),first,'timeout retains usable data')
  unsubscribe1();unsubscribe2();await h.flush()
  assert.equal(h.document.count(),0);assert.equal(h.window.count(),0);assert.equal(h.timers.size,0)
  const fresh=createRuntimeResource('/boot',{value:0},b=>b,'published')
  const stop=fresh.subscribe(()=>{});await h.tick(5000)
  assert.equal(fresh.getSnapshot().ready,true,'a failed first request releases readiness')
  stop();await h.flush()
}
async function adaptation(){
  const h=harness();let subscribe,getSnapshot
  const react={useSyncExternalStore:(sub,get)=>{subscribe=sub;getSnapshot=get;return get()},useEffect:()=>{},useState:()=>[false,()=>{}]}
  const runtime=h.load('components/world/use-adaptive-runtime.ts',{react})
  runtime.useAdaptiveRuntime();const stop=subscribe(()=>{})
  assert.equal(getSnapshot().level,2)
  for(let i=0;i<40;i++){await h.tick(100);runtime.reportRuntimeFrame(100,33)}
  assert.equal(getSnapshot().level,1,'sustained slow frames reduce quality')
  for(let i=0;i<80;i++){await h.tick(100);runtime.reportRuntimeFrame(100,42)}
  assert.equal(getSnapshot().level,0)
  stop();const stopAgain=subscribe(()=>{})
  assert.equal(getSnapshot().level,0,'remounting does not reset measured pressure')
  h.document.hidden=true;h.document.emit('visibilitychange');assert.equal(getSnapshot().hidden,true)
  runtime.setRuntimeCovered(true);assert.equal(getSnapshot().covered,true)
  runtime.setRuntimeCovered(false);assert.equal(getSnapshot().covered,false)
  stopAgain();assert.equal(h.document.count(),0)
}
async function readiness(){
  const h=harness();let observed=0
  const image=Object.assign(new Events(),{complete:false,getBoundingClientRect:()=>({top:0,bottom:100})})
  h.document.images=[image];h.document.body={};h.document.fonts={ready:new Promise(()=>{})}
  h.sandbox.MutationObserver=class{observe(){observed++}disconnect(){observed--}}
  const noop={}
  const {waitForEnvironmentReadiness}=h.load('components/world/weave-environment-transit.tsx',{
    react:noop,'react/jsx-runtime':noop,'next/navigation':noop,'lucide-react':noop,'@/lib/weave-environments':noop,'@/components/world/use-environment-runtime-config':noop,'@/lib/weave-system-map':{WEAVE_SYSTEM_MAP:{identity:{publicDescription:'WEAVE'}}},'@/lib/weave-event':{FLAME_EVENT:{},resolveEventStatus:()=> 'planned'},'@/lib/visible-poll':noop,'./use-adaptive-runtime':noop,
  })
  const config={loading:{maxWaitMs:15000,bootMinMs:10000,transitMinMs:5000,settleQuietMs:2000,waitForFonts:true,waitForImages:true}}
  let done=false
  const controller=new AbortController()
  waitForEnvironmentReadiness('boot',config,controller.signal).then(()=>done=true)
  await h.tick(7999);assert.equal(done,false)
  await h.tick(1);assert.equal(done,true,'unresolved fonts/images cannot strand loading')
  assert.equal(image.count(),0);assert.equal(observed,0);assert.equal(h.timers.size,0)
  const next=new AbortController()
  const pending=waitForEnvironmentReadiness('transit',config,next.signal)
  next.abort();await pending
  assert.equal(image.count(),0);assert.equal(observed,0);assert.equal(h.timers.size,0)
}
function frames(){
  const h=harness(),callbacks=new Map(),clock={elapsedTime:0},rendered=[]
  let effect,id=0
  h.sandbox.requestAnimationFrame=fn=>{callbacks.set(++id,fn);return id}
  h.sandbox.cancelAnimationFrame=id=>callbacks.delete(id)
  const state={clock,advance:time=>{clock.elapsedTime=time;rendered.push(time)}}
  const {FrameDriver}=h.load('components/world/adaptive-canvas.tsx',{
    react:{useEffect:fn=>effect=fn},'react/jsx-runtime':{},
    '@react-three/fiber':{useThree:selector=>selector(state)},
    './use-adaptive-runtime':{reportRuntimeFrame:()=>{}},
  })
  const frame=time=>{const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(time))}
  FrameDriver({active:true,fps:30});let cleanup=effect()
  for(let time=10;time<1010;time+=10)frame(time)
  assert.ok(rendered.length<=30,'render rate stays capped on fast displays')
  frame(10000)
  assert.ok(rendered.at(-1)-rendered.at(-2)<=.10001,'long stalls cannot cause simulation jumps')
  cleanup();assert.equal(callbacks.size,0)
  const count=rendered.length
  FrameDriver({active:false,fps:15});effect();frame(20000)
  assert.equal(rendered.length,count,'offscreen scenes schedule no frames')
  FrameDriver({active:true,fps:15});cleanup=effect();frame(30000)
  assert.ok(rendered.at(-1)>rendered.at(-2),'resuming preserves scene time')
  h.document.hidden=true;frame(30100);assert.equal(callbacks.size,0)
  cleanup()
}
(async()=>{await polling();await resources();await adaptation();await readiness();frames();console.log('PASS: adaptive runtime behavior, capped/offscreen rendering, request lifetimes, hidden-tab recovery and readiness cleanup')})().catch(error=>{console.error(error);process.exitCode=1})
