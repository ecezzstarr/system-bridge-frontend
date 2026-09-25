import { GoogleAuth } from 'google-auth-library'

export const WEAVE_CLOUD={
  project:process.env.GOOGLE_CLOUD_PROJECT || 'ssbr-495208',
  region:process.env.WEAVE_CLOUD_REGION || 'us-central1',
  service:process.env.WEAVE_CLOUD_RUN_SERVICE || 'system-bridge-frontend',
  triggerLocation:process.env.WEAVE_CLOUD_BUILD_TRIGGER_LOCATION || 'us-central1',
}

function triggerId(action:'preview'|'promote'){
  return action==='preview'
    ? process.env.WEAVE_CLOUD_BUILD_PREVIEW_TRIGGER_ID
    : process.env.WEAVE_CLOUD_BUILD_PROMOTE_TRIGGER_ID
}

export function cloudBuildControlStatus(){
  return {
    ...WEAVE_CLOUD,
    previewConfigured:Boolean(triggerId('preview')),
    promoteConfigured:Boolean(triggerId('promote')),
  }
}

async function cloudHeaders(){
  const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']})
  const token=await auth.getAccessToken()
  if(!token) throw new Error('Google Cloud service-account access token unavailable')
  return {'Content-Type':'application/json','Authorization':`Bearer ${token}`}
}

export async function triggerWeaveCloudBuild(action:'preview'|'promote'){
  const id=triggerId(action)
  if(!id){
    throw new Error(
      action==='preview'
        ? 'WEAVE_CLOUD_BUILD_PREVIEW_TRIGGER_ID is not configured'
        : 'WEAVE_CLOUD_BUILD_PROMOTE_TRIGGER_ID is not configured'
    )
  }
  const url=`https://cloudbuild.googleapis.com/v1/projects/${encodeURIComponent(WEAVE_CLOUD.project)}/locations/${encodeURIComponent(WEAVE_CLOUD.triggerLocation)}/triggers/${encodeURIComponent(id)}:run`
  const response=await fetch(url,{
    method:'POST',
    headers:await cloudHeaders(),
    body:JSON.stringify({source:{branchName:'main'}}),
    cache:'no-store',
  })
  const body=await response.json().catch(()=>({}))
  if(!response.ok){
    throw new Error(body?.error?.message || `Cloud Build trigger failed (${response.status})`)
  }
  const operationName=body?.name || null
  return {action,operationName,triggerId:id,sourceRef:'main',raw:body}
}
