'use client'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {departments,palettes,starterPublications,type Publication,type Department} from '@/lib/hope-publication-library'
const button='rounded-lg border border-cyan-200/30 px-3 py-2 text-sm text-cyan-100 disabled:opacity-50'
const input='w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-sm text-white'
const formats=[['portrait',1080,1350],['story',1080,1920],['square',1080,1080]] as const
async function renderPoster(p:Publication,width:number,height:number){
 const image=new Image();image.crossOrigin='anonymous';image.src=p.image;await image.decode()
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
 const c=canvas.getContext('2d');if(!c)throw new Error('Image rendering unavailable')
 const s=p.style,accent=palettes[s],scale=Math.max(width/image.width,height/image.height),iw=image.width*scale,ih=image.height*scale
 c.drawImage(image,(width-iw)*([.5,.2,.8,.5,.35,.65][s]),(height-ih)*([.5,.2,.35,.8,.65,.4][s]),iw,ih)
 const g=c.createLinearGradient(0,0,s===3?width:0,height);g.addColorStop(0,'rgba(7,12,22,.65)');g.addColorStop(.34,'rgba(7,12,22,.05)');g.addColorStop(.58,'rgba(7,12,22,.2)');g.addColorStop(1,'rgba(7,12,22,.96)');c.fillStyle=g;c.fillRect(0,0,width,height)
 c.strokeStyle=accent;c.lineWidth=3;c.strokeRect(38,38,width-76,height-76)
 c.fillStyle=accent;c.font='bold 27px sans-serif';c.fillText('WEAVE OF PRESENCE',70,98)
 c.font='24px sans-serif';c.fillText(p.department.toUpperCase(),70,140)
 c.fillStyle='#fff';c.font='bold 76px sans-serif';const lines:string[]=[];let line=''
 for(const word of p.title.split(/\s+/)){const next=line?line+' '+word:word;if(c.measureText(next).width>width-145&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line)
 const start=height-170-lines.length*84;lines.forEach((l,i)=>c.fillText(l,70,start+i*84,width-140))
 c.fillStyle=accent;c.fillRect(70,height-155,96,5);c.font='28px sans-serif';c.fillText('weavingsystem.online',70,height-95)
 return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Export failed')),'image/png'))
}
export default function HopePublicationLibrary({admin=false,onCaption}:{admin?:boolean;onCaption?:(caption:string)=>void}){
 const {token}=useAuth()
 const [items,setItems]=useState<Publication[]>([]),[department,setDepartment]=useState<Department>('Hope'),[query,setQuery]=useState(''),[page,setPage]=useState(0)
 const [selected,setSelected]=useState<Publication|null>(null),[format,setFormat]=useState(0),[preview,setPreview]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const headers=useCallback(()=>({Authorization:'Bearer '+token}),[token])
 const load=useCallback(async()=>{if(!token)return;try{const r=await fetch('/api/hope/publications',{headers:headers(),cache:'no-store'});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error);setItems(d.items);setMessage('')}catch(e){setMessage(e instanceof Error?e.message:'Library unavailable')}},[token,headers])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{setPage(0)},[department,query])
 useEffect(()=>{if(!selected){setPreview('');return}let cancelled=false;let objectUrl='';setPreview('');const [,w,h]=formats[format];renderPoster(selected,w,h).then(blob=>{if(cancelled)return;objectUrl=URL.createObjectURL(blob);setPreview(objectUrl)}).catch(()=>{if(!cancelled)setMessage('Image preview failed. Choose another artwork or retry.')});return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl)}},[selected,format])
 const filtered=items.filter(p=>p.department===department&&(!query||(p.title+' '+p.caption).toLowerCase().includes(query.toLowerCase())))
 const save=async()=>{if(!selected||busy)return;setBusy(true);try{const r=await fetch('/api/hope/publications',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify(selected)});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error);await load();setSelected(d.item);setMessage(d.item.active?'Published to Hope.':'Hidden from Hope.')}catch(e){setMessage(e instanceof Error?e.message:'Save failed')}finally{setBusy(false)}}
 const upload=async(file:File)=>{if(!selected||busy)return;setBusy(true);try{const body=new FormData();body.append('file',file);const r=await fetch('/api/admin/ads/upload',{method:'POST',headers:headers(),body});const d=await r.json();if(!r.ok||!d.success||d.mediaType!=='image')throw new Error(d.error||'Image upload failed');setSelected(p=>p?{...p,image:d.url}:p);setMessage('Artwork uploaded. Save to publish changes.')}catch(e){setMessage(e instanceof Error?e.message:'Upload failed')}finally{setBusy(false)}}
 return <section className="space-y-4 rounded-2xl border border-white/15 bg-slate-900/70 p-4 text-white" id="publication-library">
 <h2 className="text-xl font-bold">{admin?'Publication Library · Administrations':'Publication Library · Ready to post'}</h2>
 <p className="text-sm text-slate-300">{admin?'Edit artwork, write-ups and availability live.':'Choose a department, select a design, save the image and use its write-up. Personalize your post and respond to genuine interest.'} {items.length} publications available.</p>
 <div className="flex flex-wrap gap-2">{departments.map(d=><button key={d} className={button+(department===d?' bg-cyan-900':'')} onClick={()=>setDepartment(d)}>{d}</button>)}</div>
 <input className={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search publications"/>
 {admin&&<button className={button} onClick={()=>setSelected({id:'custom-'+crypto.randomUUID(),department,title:'New publication',caption:'',image:starterPublications.find(p=>p.department===department)!.image,style:0,active:false})}>New publication</button>}
 <button className={button} onClick={()=>void load()}>Refresh library</button>
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{filtered.slice(page*12,page*12+12).map(p=><button type="button" key={p.id} onClick={()=>{setSelected(p);setMessage('')}} className="overflow-hidden rounded-xl border border-white/15 text-left">
 <div className="relative aspect-[4/5] bg-slate-950"><img src={p.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40"/><div className="absolute inset-2 rounded border" style={{borderColor:palettes[p.style]}}/><p className="absolute bottom-4 left-4 right-4 text-sm font-bold">{p.title}</p></div><p className="p-2 text-xs text-slate-300">Design {p.style+1}{!p.active?' · hidden':''}</p></button>)}</div>
 <div className="flex items-center gap-3"><button className={button} disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><span className="text-sm">{page+1} / {Math.max(1,Math.ceil(filtered.length/12))}</span><button className={button} disabled={(page+1)*12>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next</button></div>
 {selected&&<div className="space-y-3 rounded-xl border border-cyan-200/25 p-3"><h3 className="font-bold">{selected.title}</h3><div className="flex flex-wrap gap-2">{formats.map(([f],i)=><button className={button+(format===i?' bg-cyan-900':'')} key={f} onClick={()=>setFormat(i)}>{f}</button>)}</div>
 {preview?<img src={preview} alt={selected.title} className="mx-auto max-h-[440px] max-w-full object-contain"/>:<p className="text-sm">Preview unavailable or rendering.</p>}
 {admin?<><label className="block text-sm">Department<select className={input} value={selected.department} onChange={e=>setSelected({...selected,department:e.target.value as Department})}>{departments.map(d=><option key={d}>{d}</option>)}</select></label><label className="block text-sm">Headline<input className={input} maxLength={90} value={selected.title} onChange={e=>setSelected({...selected,title:e.target.value})}/></label><label className="block text-sm">Write-up<textarea className={input} maxLength={2000} rows={5} value={selected.caption} onChange={e=>setSelected({...selected,caption:e.target.value})}/></label><label className="block text-sm">Replace artwork<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f)}}/></label><label className="block text-sm">Design<select className={input} value={selected.style} onChange={e=>setSelected({...selected,style:Number(e.target.value)})}>{palettes.map((_,i)=><option key={i} value={i}>Design {i+1}</option>)}</select></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={selected.active} onChange={e=>setSelected({...selected,active:e.target.checked})}/>Available to Bridgers</label><button className={button} disabled={busy} onClick={()=>void save()}>Save publication</button></>:<><p className="whitespace-pre-wrap text-sm leading-6">{selected.caption}</p><button className={button} onClick={()=>{onCaption?.(selected.caption);setMessage('Write-up placed in your caption editor.')}}>Use write-up</button><button className={button} onClick={async()=>{try{await navigator.clipboard.writeText(selected.caption);setMessage('Write-up copied.')}catch{setMessage('Select and copy the write-up manually.')}}}>Copy write-up</button></>}
 {preview&&<a className={button+' inline-block'} href={preview} download={selected.id+'-'+formats[format][0]+'.png'}>Save PNG</a>} <button className={button} onClick={()=>setSelected(null)}>Close</button></div>}
 {message&&<p role="status" className="text-sm text-cyan-100">{message}</p>}
 </section>
}
