'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import {getAuthHeaders} from '@/lib/auth-client'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card'

type RecoveryRequest={id:string;note:string;approvals:number;already_approved:boolean;ready_at:string;expires_at:string}
type Desk={isAdmin:boolean;isHelper:boolean;helpers:{id:string;email:string;name:string;role:string}[];
  remainingCodes?:number;assistedRecoveryEnabled:boolean;requests:RecoveryRequest[];
  events:{action:string;created_at:string}[]}
type Receipt={id?:string;status?:string;ready?:boolean;ready_at?:string;approvals?:number;expires_at?:string}
const API='/api/auth/admin-continuity'
const field='w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-sm'

export default function AdminContinuityPage(){
  const {user}=useAuth()
  const [helperEmail,setHelperEmail]=useState(''),[reference,setReference]=useState('')
  const [desk,setDesk]=useState<Desk|null>(null)
  const [mode,setMode]=useState<'code'|'assisted'>('code')
  const [code,setCode]=useState(''),[token,setToken]=useState(''),[note,setNote]=useState('')
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState('')
  const [currentPassword,setCurrentPassword]=useState(''),[helpers,setHelpers]=useState(''),[reason,setReason]=useState('')
  const [receipt,setReceipt]=useState<Receipt|null>(null),[codes,setCodes]=useState<string[]>([])
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')

  async function loadDesk(){
    const response=await fetch(API,{headers:getAuthHeaders(),cache:'no-store'})
    if(!response.ok){setDesk(null);return}
    const data:Desk=await response.json();setDesk(data)
    setHelpers(data.helpers.map(h=>h.email).join('\n'))
  }
  useEffect(()=>{if(user)void loadDesk().catch(()=>setDesk(null));else setDesk(null)},[user?.id])
  useEffect(()=>{try{const saved=sessionStorage.getItem('weave-admin-recovery-receipt');if(saved)setToken(saved)}catch{}},[])

  async function action(body:object,done:(value:any)=>void|Promise<void>){
    setBusy(true);setError('');setNotice('')
    try{
      const response=await fetch(API,{method:'POST',headers:{...getAuthHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify(body),cache:'no-store'})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Recovery unavailable.')
      await done(result)
    }catch(e){setError(e instanceof Error?e.message:'Recovery unavailable.')}
    finally{setBusy(false);setCurrentPassword('')}
  }

  async function recover(event:React.FormEvent){
    event.preventDefault()
    if(password!==confirm){setError('Passwords do not match.');return}
    await action({action:'recover',password,...(mode==='code'?{code}:{token})},()=>{
      try{sessionStorage.removeItem('weave-admin-recovery-receipt')}catch{}
      setPassword('');setConfirm('');setCode('');setToken('');setReceipt(null);setCodes([]);setDesk(null)
      setNotice('Password changed. Previous sessions and recovery credentials have closed. Sign in and create a fresh offline recovery kit.')
    })
  }

  return <Card className="w-full max-w-xl border-slate-700 bg-slate-950 text-white">
    <CardHeader>
      <Link href="/login?portal=admin&administration=1" className="text-sm text-cyan-300">Back to sign in</Link>
      <CardTitle>Administration recovery</CardTitle>
      <CardDescription>Restore access to the existing Administration account.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {error&&<p role="alert" className="text-sm text-rose-300">{error}</p>}
      {notice&&<p role="status" className="text-sm text-emerald-300">{notice}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={mode==='code'?'default':'outline'} onClick={()=>setMode('code')}>Use an offline code</Button>
        <Button type="button" variant={mode==='assisted'?'default':'outline'} onClick={()=>setMode('assisted')}>Ask trusted helpers</Button>
      </div>
      {mode==='assisted'&&<section className="space-y-3">
        <p className="text-sm text-slate-300">Two appointed helpers must verify your identity independently. You can finish after 24 hours. The request expires after 48 hours.</p>
        <textarea aria-label="Identity verification note" className={field} value={note} onChange={e=>setNote(e.target.value)} maxLength={500}
          placeholder="Tell your helpers how to verify you. Do not include passwords, codes, or private documents."/>
        <Button type="button" disabled={busy||note.trim().length<12} onClick={()=>void action({action:'request',note},r=>{
          setToken(r.token);setReceipt(r);setNote('');try{sessionStorage.setItem('weave-admin-recovery-receipt',r.token)}catch{}
          setNotice('Request sent to your appointed helpers. Keep your private receipt to finish later.')
        })}>Request help</Button>
        {receipt?.id&&<p className="break-all text-xs text-slate-300">Reference to share with your helpers: {receipt.id}</p>}
        <Input aria-label="Private recovery receipt" type="password" value={token} onChange={e=>setToken(e.target.value.trim())} autoComplete="off" placeholder="Private recovery receipt"/>
        {token&&<div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={()=>void action({action:'status',token},setReceipt)}>Check request</Button>
          <Button type="button" variant="outline" onClick={()=>void navigator.clipboard.writeText(token).then(()=>setNotice('Receipt copied. Store it privately and do not send it to your helpers.')).catch(()=>setError('Could not copy the receipt.'))}>Copy private receipt</Button>
        </div>}
        {receipt?.status&&<p className="text-sm text-slate-300">{receipt.status==='pending'?`${receipt.approvals||0} of 2 approvals. ${receipt.ready?'You can reset the password now.':receipt.ready_at?'Waiting period ends '+new Date(receipt.ready_at).toLocaleString()+'.':''}`:`Request ${receipt.status}.`}</p>}
      </section>}
      <form onSubmit={recover} className="space-y-3">
        {mode==='code'&&<Input aria-label="Offline recovery code" type="password" autoComplete="off" placeholder="Offline recovery code" required value={code} onChange={e=>setCode(e.target.value.trim())}/>}
        <Input aria-label="New Administration password" type="password" autoComplete="new-password" minLength={12} required placeholder="New password (at least 12 characters)" value={password} onChange={e=>setPassword(e.target.value)}/>
        <Input aria-label="Confirm new password" type="password" autoComplete="new-password" minLength={12} required placeholder="Confirm new password" value={confirm} onChange={e=>setConfirm(e.target.value)}/>
        <Button type="submit" disabled={busy||(mode==='code'?!code:!receipt?.ready)}>Reset Administration password</Button>
      </form>
      {!desk&&<details className="space-y-3 border-t border-slate-700 pt-4">
        <summary className="cursor-pointer text-sm font-semibold">Approve as an appointed helper</summary>
        <p className="text-sm text-slate-300">Verify the owner using a contact you already know. Ask them for the request reference. This approval does not sign you in or grant Administration access.</p>
        <Input aria-label="Request reference" placeholder="Request reference" value={reference} onChange={e=>setReference(e.target.value.trim())}/>
        <Input aria-label="Your registered email" type="email" placeholder="Your registered email" value={helperEmail} onChange={e=>setHelperEmail(e.target.value)}/>
        <Input aria-label="Your account password" type="password" autoComplete="current-password" placeholder="Your account password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/>
        <textarea aria-label="How identity was verified" className={field} value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} placeholder="How did you verify the owner independently?"/>
        <Button type="button" disabled={busy||!reference||!helperEmail||!currentPassword||reason.trim().length<12} onClick={()=>void action({action:'approve',helperEmail,requestId:reference,currentPassword,reason},()=>{setReason('');setReference('');setNotice('Your approval was recorded. No Administration access was granted.')})}>Approve verified request</Button>
      </details>}
      {desk&&<section className="space-y-4 border-t border-slate-700 pt-5">
        <h2 className="font-semibold">{desk.isAdmin?'Recovery settings':'Trusted helper desk'}</h2>
        <p className="text-sm text-slate-300">{desk.isAdmin?'Re-enter your password to change recovery settings or cancel a request.':'Confirm the owner using a contact you already know. Match the request reference they give you. Do not approve based on the request note alone.'}</p>
        <Input type="password" aria-label="Current account password" autoComplete="current-password" placeholder="Your current account password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/>
        {desk.isAdmin&&<div className="space-y-3">
          <p className="text-sm text-slate-300">{desk.remainingCodes||0} offline codes remaining. Assisted recovery is {desk.assistedRecoveryEnabled?'enabled':'waiting for two appointed helpers'}.</p>
          <textarea className={field} aria-label="Registered helper emails" placeholder="Registered Agent or Bridger emails, one per line" value={helpers} onChange={e=>setHelpers(e.target.value)}/>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy||!currentPassword} onClick={()=>void action({action:'helpers',emails:helpers.split(/[\n,;]/),currentPassword},async()=>{await loadDesk();setNotice('Helper appointments saved. Previous pending requests were closed.')})}>Save trusted helpers</Button>
            <Button type="button" variant="outline" disabled={busy||!currentPassword} onClick={()=>void action({action:'codes',currentPassword},async r=>{setCodes(r.codes);await loadDesk();setNotice('Previous codes are revoked. Save the new codes in a password manager or offline safe.')})}>Generate offline codes</Button>
          </div>
          {codes.length>0&&<div className="space-y-2 rounded border border-amber-600 p-3">
            <p className="text-sm text-amber-200">Private recovery kit. Copy these now; they will not be shown again.</p>
            <pre className="overflow-auto text-xs">{codes.join('\n')}</pre>
            <Button type="button" variant="outline" onClick={()=>setCodes([])}>Hide codes</Button>
          </div>}
        </div>}
        {desk.isHelper&&desk.requests.length>0&&<textarea aria-label="How identity was verified" className={field} value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} placeholder="How did you verify the owner independently?"/>}
        {desk.requests.map(r=><article key={r.id} className="space-y-2 rounded border border-slate-700 p-3 text-sm">
          <p className="break-all">Reference: {r.id}</p><p className="break-words text-slate-300">{r.note}</p>
          <p>{r.approvals} of 2 approvals</p>
          {desk.isHelper&&<Button type="button" disabled={busy||!currentPassword||reason.trim().length<12||r.already_approved} onClick={()=>void action({action:'approve',requestId:r.id,reason,currentPassword},async()=>{setReason('');await loadDesk();setNotice('Your approval was recorded. You do not receive a password or recovery code.')})}>{r.already_approved?'Approved':'Approve verified request'}</Button>}
          {desk.isAdmin&&<Button type="button" variant="outline" disabled={busy||!currentPassword} onClick={()=>void action({action:'cancel',requestId:r.id,currentPassword},async()=>{await loadDesk();setNotice('Request cancelled.')})}>Cancel request</Button>}
        </article>)}
        {desk.isAdmin&&desk.events.length>0&&<details className="text-sm"><summary>Recovery audit</summary><ul className="mt-2 space-y-1">{desk.events.map((e,i)=><li key={i}>{e.action.replaceAll('_',' ')} · {new Date(e.created_at).toLocaleString()}</li>)}</ul></details>}
      </section>}
    </CardContent>
  </Card>
}
