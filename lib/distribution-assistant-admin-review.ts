import {getPool} from '@/lib/db'
import {ensureDistributionAssistantSchema} from '@/lib/distribution-assistants'
import {getLifestyleAccess} from '@/lib/weave-lifestyle'

// Administration checks eligibility. The verified lead Manager still selects,
// appoints, supervises and assigns the actual Assistant Food Distribution Manager.
export async function reviewAssistantEligibilityByAdministration(
  administratorId:string,applicantId:string,decision:'verify'|'decline',rawNote:string
){
  await ensureDistributionAssistantSchema()
  const reason=rawNote.trim()
  if(!['verify','decline'].includes(decision)||reason.length<10||reason.length>1200)
    return {success:false as const,reason:'invalid_review' as const}
  const access=decision==='verify'?await getLifestyleAccess(applicantId):null
  if(decision==='verify'&&!access?.active)
    return {success:false as const,reason:'ineligible' as const}
  const pool=getPool(),client=await pool.connect()
  try{
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_distribution_assistant_capacity'))")
    const {rows:admin}=await client.query(
      "SELECT id FROM users WHERE id=$1::uuid AND role='admin' AND is_active=true",[administratorId])
    if(!admin.length){await client.query('ROLLBACK');return {success:false as const,reason:'forbidden' as const}}
    const {rows}=await client.query(`
      SELECT a.status,a.administration_verification,u.is_active,u.role
      FROM weave_distribution_assistants a JOIN users u ON u.id=a.user_id
      WHERE a.user_id=$1::uuid FOR UPDATE`,[applicantId])
    const applicant=rows[0]
    if(!applicant||applicant.status!=='pending'||applicant.administration_verification!=='pending'){
      await client.query('ROLLBACK');return {success:false as const,reason:'not_pending' as const}
    }
    if(decision==='verify'&&(!applicant.is_active||!['agent','bridger'].includes(applicant.role))){
      await client.query('ROLLBACK');return {success:false as const,reason:'ineligible' as const}
    }
    const verified=decision==='verify'
    await client.query(`
      UPDATE weave_distribution_assistants SET
        administration_verification=$2::varchar,administration_verified_by=$3::uuid,
        administration_verified_at=NOW(),administration_verification_note=$4,
        status=CASE WHEN $2::varchar='declined' THEN 'rejected' ELSE 'pending' END,
        updated_at=NOW()
      WHERE user_id=$1::uuid AND status='pending' AND administration_verification='pending'`,
      [applicantId,verified?'verified':'declined',administratorId,reason])
    await client.query('COMMIT')
    try{
      await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
        VALUES($1::uuid,'assistant_application_review',$2,$3,'WEAVE Administration',
          '/weave/lifestyles/distribution-assistant')`,
        [applicantId,verified?'Administration verified your assistant application':'Administration declined your assistant application',
        verified?'Your application has passed Administration eligibility verification. A verified lead Food Distribution Manager will make the separate appointment decision. You are not employed yet.':
          'Your Assistant Food Distribution Manager application was declined by Administration. Open Lifestyle to review your record.'])
      if(verified){
        await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
          SELECT me.user_id,'assistant_eligible','Verified assistant application ready',
            'Administration has verified an Assistant Food Distribution Manager applicant. Open the Manager workspace to review the statement and decide on appointment.',
            'WEAVE Employment','/manager/dashboard?assistantId='||$1
          FROM manager_employment me WHERE me.status IN ('probation','active')`,[applicantId])
      }
    }catch(error){console.error('[assistant eligibility] notification failure',error)}
    return {success:true as const,verification:verified?'verified':'declined'}
  }catch(error){try{await client.query('ROLLBACK')}catch{};console.error('[assistant eligibility]',error)
    return {success:false as const,reason:'error' as const}
  }finally{client.release()}
}
