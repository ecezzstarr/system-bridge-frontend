'use client'
import {useCallback} from 'react'
import {useAuth} from '@/lib/auth-provider'
import SharedSystemSwitchWorld from './shared-system-switch-world'

/** Staff and Clients use the same public room; this never mounts a private Client environment. */
export default function StaffFileFolderWorld({role}:{role:'admin'|'agent'|'bridger';identity:string;userId:string}){
 const {token}=useAuth()
 const getToken=useCallback(()=>token||null,[token])
 return <SharedSystemSwitchWorld role={role} getToken={getToken}/>
}
