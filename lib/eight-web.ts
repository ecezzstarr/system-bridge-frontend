import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { checkServerIdentity } from 'node:tls'

const MAX_REDIRECTS=3
const MAX_TEXT=12000
const MAX_BODY_BYTES=512*1024
const DEADLINE_MS=8000

function blockedIpv4(address:string){
  const parts=address.split('.').map(Number)
  if(parts.length!==4 || parts.some(n=>!Number.isInteger(n)||n<0||n>255)) return true
  const [a,b]=parts
  return (
    a===0 ||
    a===10 ||
    a===127 ||
    (a===100 && b>=64 && b<=127) ||
    (a===169 && b===254) ||
    (a===172 && b>=16 && b<=31) ||
    (a===192 && b===168) ||
    (a===192 && b===0) ||
    (a===192 && b===2) ||
    (a===198 && (b===18 || b===19))
    || (a===192 && b===88) ||
    (a===198 && b===51) ||
    (a===203 && b===0) ||
    a>=224
  )
}

function blockedIpv6(address:string){
  // Accept only ordinary global-unicast IPv6; exclude translation,
  // tunnelling, documentation and special-use ranges.
  const normalized=address.toLowerCase()
  if(!/^[23][0-9a-f]{3}:/.test(normalized))return true
  if(/^2001:(?:0{0,3}0|0?2|0?1[0-9a-f]|0?2[0-9a-f]|db8):/.test(normalized))return true
  if(normalized.startsWith('2002:')||normalized.startsWith('3fff:'))return true
  return false
}

function isBlockedAddress(address:string){
  const version=isIP(address)
  if(version===4) return blockedIpv4(address)
  if(version===6) return blockedIpv6(address)
  return true
}

async function validatePublicUrl(raw:string){
  if(typeof raw!=='string'||raw.length>2048)throw Error('Invalid URL')
  let url:URL
  try{ url=new URL(raw) }catch{ throw new Error('Invalid URL') }
  if(!['http:','https:'].includes(url.protocol)) throw new Error('Only HTTP(S) web pages are allowed')
  if(url.username || url.password) throw new Error('Credential-bearing URLs are not allowed')
  if(url.port)throw Error('Nonstandard web ports are not allowed')
  const hostname=url.hostname.replace(/^\[|\]$/g,'').toLowerCase()
  if(!hostname || hostname==='localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Private/local hosts are not allowed')
  }
  let records:{address:string;family:number}[]
  if(isIP(hostname))records=[{address:hostname,family:isIP(hostname)}]
  else {
    let timer:ReturnType<typeof setTimeout>|undefined
    try{
      records=await Promise.race([lookup(hostname,{all:true,verbatim:true}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS lookup timed out')),DEADLINE_MS)})])
    }finally{if(timer)clearTimeout(timer)}
  }
  if(!records.length||records.some(record=>isBlockedAddress(record.address)))throw Error('Host resolves to a private/reserved address')
  return {url,hostname,address:records[0].address,family:records[0].family}
}

type PublicTarget=Awaited<ReturnType<typeof validatePublicUrl>>
type WebResponse={status:number;location?:string;contentType:string;body:string}

/** Connect to the exact IP we validated, not a second DNS resolution.
 * Preserve Host, SNI and normal certificate validation for HTTPS.
 * Redirects are never followed by the transport itself. */
function pinnedWebRequest(target:PublicTarget):Promise<WebResponse>{
  return new Promise((resolve,reject)=>{
    const secure=target.url.protocol==='https:'
    const transport=secure?httpsRequest:httpRequest
    const req=transport({
      hostname:target.address,family:target.family,
      port:secure?443:80,path:target.url.pathname+target.url.search,
      method:'GET',agent:false,
      ...(secure?{servername:isIP(target.hostname)?'':target.hostname,rejectUnauthorized:true,
        checkServerIdentity:(_host:string,certificate:Parameters<typeof checkServerIdentity>[1])=>checkServerIdentity(target.hostname,certificate)}:{}),
      headers:{Host:target.url.host,'User-Agent':'WEAVE-EIGHT/1.0','Accept':'text/html,text/plain,application/json,application/xml,text/xml;q=0.9','Accept-Encoding':'identity'},
    },response=>{
      const status=response.statusCode||0
      const contentType=String(response.headers['content-type']||'').toLowerCase()
      const location=response.headers.location
      if(status>=300&&status<400){resolve({status,location,contentType,body:''});response.destroy();return}
      if(!contentType.includes('text/')&&!contentType.includes('application/json')&&!contentType.includes('application/xml')){reject(Error('Unsupported web content type'));response.destroy();return}
      if(response.headers['content-encoding']&&response.headers['content-encoding']!=='identity'){reject(Error('Compressed response not supported'));response.destroy();return}
      if(Number(response.headers['content-length']||0)>MAX_BODY_BYTES){reject(Error('Web response exceeds byte limit'));response.destroy();return}
      const chunks:Buffer[]=[]
      let bytes=0
      response.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>MAX_BODY_BYTES){reject(Error('Web response exceeds byte limit'));response.destroy();return}chunks.push(chunk)})
      response.once('error',reject)
      response.once('aborted',()=>reject(Error('Web response aborted')))
      response.once('end',()=>resolve({status,location,contentType,body:Buffer.concat(chunks).toString('utf8')}))
    })
    const timer=setTimeout(()=>req.destroy(Error('Web request timed out')),DEADLINE_MS)
    req.once('error',reject)
    req.once('close',()=>clearTimeout(timer))
    req.end()
  })
}

function plainText(contentType:string,body:string){
  if(contentType.includes('application/json')){
    try{return JSON.stringify(JSON.parse(body),null,2)}catch{return body}
  }
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/&#39;/g,"'")
    .replace(/&quot;/g,'"')
    .replace(/\s+/g,' ')
    .trim()
}

export async function safePublicWebRead(rawUrl:string){
  let current=await validatePublicUrl(rawUrl)
  for(let redirects=0;redirects<=MAX_REDIRECTS;redirects++){
    const response=await pinnedWebRequest(current)
    if(response.status>=300&&response.status<400){
      if(!response.location)throw Error('Redirect had no location')
      if(redirects===MAX_REDIRECTS)throw Error('Too many redirects')
      current=await validatePublicUrl(new URL(response.location,current.url).toString())
      continue
    }
    const text=plainText(response.contentType,response.body)
    return {url:current.url.toString(),status:response.status,ok:response.status>=200&&response.status<300,
      contentType:response.contentType,text:text.slice(0,MAX_TEXT),truncated:text.length>MAX_TEXT}
  }
  throw Error('Unable to read web page')
}
