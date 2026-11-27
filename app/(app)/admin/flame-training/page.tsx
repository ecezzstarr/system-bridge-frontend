'use client'
import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
import {FlameTrainingWorkshop} from '@/components/flame-training-workshop'
export default function WeaveOneTrainingPage(){
 const {user,isInitialized}=useAuth()
 if(!isInitialized)return <main className="p-5">Checking your position…</main>
 if(user?.role!=='admin')return <main className="p-5">Administrations access required.</main>
 return <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6"><Link href="/admin/dashboard" className="text-sm underline">Return to A Time</Link><header><p className="text-xs text-muted-foreground">A Time · Native intelligence</p><h1 className="text-2xl font-semibold">Flame Training and Deployment</h1><p className="mt-1 text-sm text-muted-foreground">Train, inspect and preserve Weave One. Appointed workshop authorization is checked by the server.</p></header><FlameTrainingWorkshop/></main>
}
