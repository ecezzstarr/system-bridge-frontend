'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import {workshopArt} from '@/lib/workshop-art'
import {useMemo,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {departmentBuildings,departmentNames,firstWorkshops,type DepartmentBuilding} from '@/lib/department-buildings'
import {WEAVE_NATIVE_DEPARTMENTS,type NativeDepartment} from '@/lib/weave-native-blueprint'
import {useEnvironmentOrganizer} from '@/components/world/environment-organizer-provider'
import {useDepartmentModules} from './native-department-rail'
import styles from './department-buildings.module.css'

const pages:string[]=JSON.parse(process.env.NEXT_PUBLIC_DEPARTMENT_WORK_PAGES??'[]')
const LiveCompanyMap=dynamic(()=>import('./company-domain-map').then(mod=>mod.CompanyDomainMap),{
 ssr:false,loading:()=> <p role="status">Opening the company buildings…</p>,
})

/**
 * One entrance per role. The former Work Desk catalogs supply real operating
 * destinations; the building facade takes people to each original page, where
 * DepartmentBuildingInterior hosts the actual existing workstation. A Time's
 * published buildings enter through the same directory, never a parallel desk.
 */
export function DepartmentBuildings({department}:{department:NativeDepartment}){
 const {user}=useAuth()
 const {isVisible}=useEnvironmentOrganizer()
 const modules=useDepartmentModules(department)
 const doors=useMemo(()=>departmentBuildings(department,pages),[department])
 const [query,setQuery]=useState('')
 const {label,role}=WEAVE_NATIVE_DEPARTMENTS[department]
 if(user?.role!==role)return null

 const published:DepartmentBuilding[]=modules.map(module=>({
  title:module.blueprint.title,
  href:'/weave-modules/'+department+'/'+encodeURIComponent(module.slug),
  area:'Published by Administrations',
  access:module.blueprint.companyPlot?'Company plot '+module.blueprint.companyPlot:undefined,
 }))
 const starters=firstWorkshops[department]
 const terms=query.toLowerCase().trim().split(/\s+/)
 // A route appears once, regardless of how many legacy desks, districts or
 // search aliases mentioned it. Preserve original authorization at the page.
 const unique=new Map<string,DepartmentBuilding>()
 for(const door of [...doors,...published]){
  if(!unique.has(door.href))unique.set(door.href,door)
 }
 const visible=[...unique.values()].filter(door=>{
  const estateTerms=role==='client'&&door.href==='/client/system-switch'
   ?' my file folder estate enterprise customer door':''
  const first=starters.find(item=>item.href===door.href)
  const search=[door.title,door.area,door.href,estateTerms,first?.name,first?.action].join(' ').toLowerCase()
  return isVisible(door.href)&&terms.every(term=>search.includes(term))
 })
 const first=starters.flatMap(step=>{
  const door=visible.find(item=>item.href===step.href)
  return door?[{...door,title:step.name,action:step.action}]:[]
 })
 const studio=department==='hope'?first.find(door=>door.href==='/distribution-studio'):undefined
 const primary=first.filter(door=>door!==studio)
 const livePlots=modules.flatMap(module=>{
  const plot=module.blueprint.companyPlot
  const href='/weave-modules/'+department+'/'+encodeURIComponent(module.slug)
  if(!Number.isInteger(plot)||!plot||plot<1||plot>24||!visible.some(door=>door.href===href))return []
  const scene=module.blueprint.blocks.find(block=>block.type==='scene')
  return [{department,slug:module.slug,title:module.blueprint.title,plot,
   scene:scene?.type==='scene'?scene.scene:'glass-kingdom' as const}]
 })
 const newDoors=published.filter(door=>visible.some(item=>item.href===door.href)&&
  !first.some(item=>item.href===door.href)&&
  !livePlots.some(plot=>door.href==='/weave-modules/'+department+'/'+encodeURIComponent(plot.slug)))
 const other=visible.filter(door=>!first.some(item=>item.href===door.href)&&
  !newDoors.some(item=>item.href===door.href))
  .sort((a,b)=>a.area.localeCompare(b.area)||a.title.localeCompare(b.title)||a.href.localeCompare(b.href))
 const groups=new Map<string,DepartmentBuilding[]>()
 for(const door of other){
  const group=door.area||'Department operations'
  groups.set(group,[...(groups.get(group)||[]),door])
 }

 function entrance(door:DepartmentBuilding,action?:string){
  return <Link href={door.href} prefetch={false} className={styles.building} data-department-building-door={door.href}>
   <img className={styles.facade} src={door.officialImage||workshopArt(door.href)}
    alt="" width={312} height={312} loading="lazy"/>
   <span className={styles.caption}>
    <strong>{door.title}</strong>
    {action&&<span>{action}</span>}
    {door.access&&door.access!=='available'&&<small>{door.access==='approval'?'Approval required':door.access}</small>}
   </span>
  </Link>
 }

 return <section className={styles.campus} data-department={department}
  data-unified-workplace="department-building-interiors" aria-label={label+' buildings'}>
  <header className={styles.header}>
   <div><Link href="/">Company Grounds</Link><h1>{departmentNames[role]}</h1>
    <p>Choose a building to begin. Its existing work desk operates inside.</p>
   </div>
   <input type="search" aria-label="Find a building or workstation"
    placeholder="Find my work" value={query} onChange={event=>setQuery(event.target.value)}/>
  </header>
  {primary.length>0&&<nav aria-label="Start here" className={styles.route}>
   <h2>{query.trim()?'Matching working buildings':'Start here'}</h2>
   <ol>{primary.map(door=><li key={door.href}>{entrance(door,door.action)}</li>)}</ol>
  </nav>}
  {studio&&<aside className={styles.studio} aria-label="Available anytime">
   <h2>Available anytime</h2>{entrance(studio,studio.action)}
  </aside>}
  {livePlots.length>0&&<section className={styles.route} aria-label="Live 3D company buildings" data-published-company-buildings={department}>
   <h2>Live company buildings</h2>
   <LiveCompanyMap buildings={livePlots}/>
  </section>}
  {newDoors.length>0&&<nav className={styles.route} aria-label="New company workshops">
   <h2>New buildings from Administrations</h2>
   <ul>{newDoors.map(door=><li key={door.href}>{entrance(door)}</li>)}</ul>
  </nav>}
  {other.length>0&&<details key={query.trim()?'search':'browse'} open={query.trim()?true:undefined}
   className={styles.directory} data-original-workstation-directory={department}>
   <summary>Other workrooms ({other.length})</summary>
   <p className={styles.directoryHelp}>Original workstations remain here, inside their department buildings. No separate Work Desk to learn.</p>
   {Array.from(groups,([area,entries])=><section key={area} className={styles.roomGroup}>
    <h3>{area}</h3>
    <ul className={styles.rooms}>{entries.map(door=><li key={door.href}>
     <Link href={door.href} prefetch={false} data-department-workroom={door.href}
      className={styles.room}>
      <span>{door.title}</span>
      {door.access&&door.access!=='available'&&<small>{door.access==='approval'?'Approval required':door.access}</small>}
     </Link>
    </li>)}</ul>
   </section>)}
  </details>}
  {!visible.length&&<p role="status" className={styles.empty}>No matching workrooms. Search for the task or workshop name.</p>}
 </section>
}
