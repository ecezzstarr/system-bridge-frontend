import type { Metadata } from 'next'
import { AgentFoodCarrierPublic } from '@/components/carrier/agent-food-carrier-public'
import { getAgentByCarrierFoodCode, getCarrierFoodShareImageUrl, getCarrierFoodUrl } from '@/lib/carrier-food'

export async function generateMetadata({params}:{params:Promise<{code:string}>}):Promise<Metadata>{
  const {code}=await params
  const agent=await getAgentByCarrierFoodCode(code).catch(()=>null)
  const agentName=agent?.name||agent?.username||'WEAVE Agent'
  const title=`WEAVE Food · ${agentName}`
  const description=`Order Agility and Electrolyte through ${agentName}'s Carrier Door or enter WEAVE as this Agent's Bridger.`
  const url=getCarrierFoodUrl(code)
  const image=getCarrierFoodShareImageUrl(code)
  return {
    title,
    description,
    openGraph:{title,description,url,type:'website',images:[{url:image,width:1200,height:630,alt:'WEAVE Food · Agility + Electrolyte'}]},
    twitter:{card:'summary_large_image',title,description,images:[image]},
  }
}

export default async function CarrierFoodDoorPage({params}:{params:Promise<{code:string}>}){
  const {code}=await params
  return <AgentFoodCarrierPublic referralCode={code}/>
}
