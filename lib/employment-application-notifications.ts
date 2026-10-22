import { getPool } from '@/lib/db'

export type CompanyApplicationKind='distribution_manager'|'distribution_assistant'|'food_preparation'|'guidance_support'
const paths:Record<CompanyApplicationKind,string>={
  distribution_manager:'/admin/distribution-employment',
  distribution_assistant:'/admin/distribution-employment',
  food_preparation:'/admin/food-preparation-manager',
  guidance_support:'/admin/guidance-staff',
}
export function companyApplicationReviewPath(kind:CompanyApplicationKind,id:string){
  // Application identifiers are generated server-side; URLSearchParams encodes them.
  return paths[kind]+'?'+new URLSearchParams({applicationId:id}).toString()
}

export async function notifyAdministrationOfCompanyApplication(input:{
  kind:CompanyApplicationKind;applicationId:string;applicantId:string;
  positionTitle:string;name:string;applicationNote:string
}){
  const link=companyApplicationReviewPath(input.kind,input.applicationId)
  const content=`${input.name} submitted an application for ${input.positionTitle}. Open the application to read the applicant's statement and record the employment decision.`
  await getPool().query(`
    INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
    SELECT id,'company_position_application',$1,$2,$3::uuid,'WEAVE Employment',$4
    FROM users WHERE role='admin' AND is_active=true`,
    [input.positionTitle+' · Application for review',content,input.applicantId,link])
  return link
}
