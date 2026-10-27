import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool,sql} from '@/lib/db'
import {getActiveLegionEmployment} from '@/lib/legion-employment'
import {getLifestyleAccess} from '@/lib/weave-lifestyle'
import {ensureManagerEmploymentTable} from '@/lib/manager-employment'
import {ensureDistributionAssistantSchema} from '@/lib/distribution-assistants'
import {ensureFoodPreparationManagerSchema} from '@/lib/food-preparation-manager'
import {ensureFoodDistributionEmploymentSchema} from '@/lib/food-distribution-employment'
import {getGuidanceStaffDepartments} from '@/lib/weave-guidance-departments'

export const dynamic='force-dynamic'
type WorkLink={label:string;href:string;purpose:string}
type WorkPosition={id:string;title:string;department:string;standing:string;description:string;tools:WorkLink[]}
const distributionTools:WorkLink[]=[
  {label:'Distribution Studio',href:'/distribution-studio',purpose:'Publish and track authorized channel campaigns'},
  {label:'Video Ad Studio',href:'/video-ad-studio',purpose:'Create promotional material for actual distribution'},
  {label:'Referral Movement',href:'/referrals',purpose:'Review personally attributed, verified acquisitions'},
  {label:'Carrier',href:'/weave/carrier',purpose:'Distribute approved live company activity'},
  {label:'Direct Communication',href:'/communications',purpose:'Coordinate with authorized contacts'},
  {label:'Burning River',href:'/event',purpose:'Join the current company business loop'},
]
const foodDistributionTools:WorkLink[]=[
  {label:'Food Distribution Desk',href:'/weave/lifestyles/food-distribution',purpose:'Coordinate food stock, outlet supply, carrier handoffs and verified delivery records'},
  {label:'Food Store',href:'/food-store',purpose:'Review the live WEAVE food catalog and eligible order movement'},
  {label:'Carrier',href:'/weave/carrier',purpose:'Carry approved food distribution activity outward'},
  {label:'Direct Communication',href:'/communications',purpose:'Coordinate with authorized food outlets and staff'},
]
const foodTools:WorkLink[]=[
  {label:'Kitchen Work Desk',href:'/weave/lifestyles/food-preparation',purpose:'Receive verified paid orders and record preparation or dispatch'},
  {label:'Agility',href:'/agility',purpose:'Review the existing Agility product and order workflow'},
  {label:'Electrolyte',href:'/electrolyte',purpose:'Review the existing Electrolyte product and order workflow'},
  {label:'Ember',href:'/ember',purpose:'Review the existing Ember product and order workflow'},
  {label:'Daisy Pastries',href:'/agent/cakes',purpose:'Review relevant pastry and cake order details'},
]
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Authentication required'},{status:401})
  if(!['agent','bridger'].includes(user.role))
    return NextResponse.json({success:false,error:'An Agent or Bridger company position is required'},{status:403})
  try{
    const access=await getLifestyleAccess(user.id)
    if(!access.active)return NextResponse.json({success:true,positions:[],eligible:false,
      message:'Activate your eligible Lifestyle position before opening employment systems.'},
      {headers:{'Cache-Control':'private, no-store'}})
    // Legion employment is exclusive: former role records do not authorize parallel work.
    const legion=await getActiveLegionEmployment(sql,user.id)
    if(legion.active)return NextResponse.json({success:true,positions:[],eligible:false,
      message:'Your current exclusive Legion service temporarily suspends other company job operations until the Legion appointment ends.'},
      {headers:{'Cache-Control':'private, no-store'}})
    await Promise.all([ensureManagerEmploymentTable(),ensureDistributionAssistantSchema(),
      ...(user.role==='agent'?[ensureFoodPreparationManagerSchema(),ensureFoodDistributionEmploymentSchema()]:[])])
    const pool=getPool()
    const [manager,assistant,food,foodDistribution,departments]=await Promise.all([
      pool.query('SELECT status FROM manager_employment WHERE user_id=$1::uuid',[user.id]),
      pool.query('SELECT status FROM weave_distribution_assistants WHERE user_id=$1::uuid',[user.id]),
      user.role==='agent'?pool.query('SELECT status,position FROM weave_food_preparation_managers WHERE agent_id=$1::uuid',[user.id]):
        Promise.resolve({rows:[]}),
      user.role==='agent'?pool.query('SELECT status,position,manager_user_id FROM weave_food_distribution_employment WHERE user_id=$1::uuid',[user.id]):
        Promise.resolve({rows:[]}),
      getGuidanceStaffDepartments(user),
    ])
    const positions:WorkPosition[]=[]
    const lead=manager.rows[0]
    const assistantRecord=assistant.rows[0]
    const foodRecord=food.rows[0]
    const foodDistributionRecord=foodDistribution.rows[0]
    if(['probation','active'].includes(lead?.status)){
      positions.push({id:'distribution_manager',title:'Distribution Manager',department:'Stability · Company Distribution',
        standing:lead.status==='probation'?'Verified · Probation':'Active appointment',
        description:'Direct distribution plans, assign team responsibilities, verify progress and coordinate up to two approved assistants.',
        tools:[{label:'Manager & Team Workspace',href:'/manager/dashboard',purpose:'Assign, review and communicate with your team'},...distributionTools]})
    }
    if(assistantRecord?.status==='approved'){
      positions.push({id:'distribution_assistant',title:'Assistant Distribution Manager',department:'Stability · Company Distribution',
        standing:'Approved appointment',description:'Carry assigned field tasks, report verified progress and communicate directly with your lead and other assistants.',
        tools:[{label:'Assistant Team Workspace',href:'/weave/lifestyles/distribution-assistant',purpose:'Receive and act on team assignments'},...distributionTools]})
    }
    if(foodDistributionRecord?.status==='approved'){
      const isLead=foodDistributionRecord.position==='manager'
      positions.push({id:isLead?'food_distribution_manager':'food_distribution_assistant_manager',
        title:isLead?'Food Distribution Manager':'Assistant Food Distribution Manager',
        department:'Stability · Food Distribution',standing:'Approved appointment',
        description:isLead?'Coordinate food stock movement, outlet supply, delivery handoffs and verified distribution reporting.':'Carry assigned food stock, outlet supply and delivery handoffs under the approved Food Distribution Manager.',
        tools:[{label:'Food Distribution Desk',href:'/weave/lifestyles/food-distribution',purpose:'Open appointment details and food distribution coordination'},...foodDistributionTools]})
    }
    if(foodRecord?.status==='approved'){
      positions.push({id:'food_preparation',title:foodRecord.position==='manager'?'Food Preparation Manager':'Assistant Food Preparation Manager',
        department:'Stability · Food Preparation',standing:'Approved appointment',
        description:foodRecord.position==='manager'?
          'Lead daily food preparation, allocate verified paid orders to approved assistants, and record handoffs.':
          'Prepare, package and dispatch orders actually assigned by the Stability Lead; record each work stage.',
        tools:foodTools})
    }
    for(const department of departments){
      const label=department==='forensic'?'Forensics':department==='lawyer'?'Attorney':'Mandate'
      positions.push({id:'guidance_'+department,title:label+' Department Personnel',
        department:'Company Guidance',standing:'Administration approved',
        description:'Respond only to assigned company guidance conversations. Administration retains verification, payment and final institutional decisions.',
        tools:[{label:label+' Inbox',href:'/weave/lifestyles/mandate/inbox?department='+encodeURIComponent(department),purpose:'Open verified department conversations'},
          ...(department==='forensic'?[{label:'Food Settlement Review',href:'/weave/lifestyles/mandate/forensic-food',purpose:'Record authorized food settlement examination without assuming Administration power'}]:[])]})
    }
    return NextResponse.json({success:true,positions,eligible:true,
      message:positions.length?'Employment systems available for the positions currently approved.':
        'No active company appointment found. Apply through Lifestyle and await the authorized review.'},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[employment workspace] failed',error)
    return NextResponse.json({success:false,error:'Unable to open approved employment workspace'},{status:500})}
}
