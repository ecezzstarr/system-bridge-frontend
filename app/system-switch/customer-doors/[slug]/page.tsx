import { HostedFileFolderVisit } from '@/components/system-switch/customer-door-avatar-world'
export const dynamic='force-dynamic'
export default async function ClientHostedWorldPage({params,searchParams}:{
  params:Promise<{slug:string}>,searchParams:Promise<{entrance?:string}>
}){
  const [{slug},{entrance}]=await Promise.all([params,searchParams])
  return <HostedFileFolderVisit slug={slug} entrance={entrance==='flame-event'?'flame-event':'market'}/>
}
