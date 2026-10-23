export type NotificationDestination={href:string;label:string;exact:boolean}
const fallback:Record<string,string>={
  admin:'/admin/dashboard',
  agent:'/agent/dashboard',
  bridger:'/bridger/dashboard',
  client:'/client/dashboard',
}
const roleLabels:Record<string,string>={
  admin:'Administration',agent:'Agent',bridger:'Bridger',client:'Client',
}
export function notificationDestination(notification:{type?:string;link?:string|null},role?:string|null):NotificationDestination{
  const link=String(notification.link||'').trim()
  // The notification payload must never navigate to a third-party URL or a
  // protocol-relative destination supplied by a different user.
  if(link.startsWith('/')&&!link.startsWith('//')&&!/[\\\r\n]/.test(link))
    return {href:link,label:'Open related page',exact:true}
  const type=String(notification.type||'').toLowerCase()
  if(type==='employment_reply'||type.startsWith('employment_'))
    return role==='admin'
      ?{href:'/admin/distribution-employment',label:'Open employment review',exact:false}
      :{href:'/weave/lifestyles/work',label:'Open my employment workspace',exact:false}
  if(type.startsWith('distribution_team')||type.startsWith('distribution_task'))
    return {href:'/weave/lifestyles/work#team-communication',label:'Open distribution team',exact:false}
  if(type.startsWith('private_message')||type.includes('message')||type.includes('chat'))
    return {href:role==='client'?'/company-chat':role==='admin'?'/admin/company-guidance':'/communications',label:'Open conversations',exact:false}
  if(type.startsWith('order_')||type.startsWith('deposit_'))
    return {href:role==='admin'?'/admin/orders':fallback[role||'']||'/weave',label:'Open relevant dashboard',exact:false}
  return {href:fallback[role||'']||'/weave',label:'Open '+(roleLabels[role||'']||'WEAVE')+' dashboard',exact:false}
}
