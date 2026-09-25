import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_REDIRECTS=3
const MAX_TEXT=12000

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
    (a===198 && (b===18 || b===19)) ||
    (a===198 && b===51) ||
    (a===203 && b===0) ||
    a>=224
  )
}

function blockedIpv6(address:string){
  const normalized=address.toLowerCase()
  if(normalized==='::' || normalized==='::1') return true
  if(normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if(normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true
  const mapped=normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return mapped ? blockedIpv4(mapped[1]) : false
}

function isBlockedAddress(address:string){
  const version=isIP(address)
  if(version===4) return blockedIpv4(address)
  if(version===6) return blockedIpv6(address)
  return true
}

async function validatePublicUrl(raw:string){
  let url:URL
  try{ url=new URL(raw) }catch{ throw new Error('Invalid URL') }
  if(!['http:','https:'].includes(url.protocol)) throw new Error('Only HTTP(S) web pages are allowed')
  if(url.username || url.password) throw new Error('Credential-bearing URLs are not allowed')
  const hostname=url.hostname.replace(/^\[|\]$/g,'').toLowerCase()
  if(!hostname || hostname==='localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Private/local hosts are not allowed')
  }
  if(isIP(hostname)){
    if(isBlockedAddress(hostname)) throw new Error('Private/reserved addresses are not allowed')
  }else{
    const records=await lookup(hostname,{all:true,verbatim:true})
    if(records.length===0) throw new Error('Host did not resolve')
    if(records.some(record=>isBlockedAddress(record.address))) throw new Error('Host resolves to a private/reserved address')
  }
  return url
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
    const controller=new AbortController()
    const timeout=setTimeout(()=>controller.abort(),8000)
    let response:Response
    try{
      response=await fetch(current,{
        method:'GET',
        redirect:'manual',
        cache:'no-store',
        signal:controller.signal,
        headers:{
          'User-Agent':'WEAVE-EIGHT/1.0 (+https://weavingsystem.online)',
          'Accept':'text/html,text/plain,application/json,application/xml,text/xml;q=0.9,*/*;q=0.2',
        },
      })
    }finally{
      clearTimeout(timeout)
    }

    if(response.status>=300 && response.status<400){
      const location=response.headers.get('location')
      if(!location) throw new Error(`Redirect ${response.status} had no location`)
      if(redirects===MAX_REDIRECTS) throw new Error('Too many redirects')
      current=await validatePublicUrl(new URL(location,current).toString())
      continue
    }

    const contentType=(response.headers.get('content-type')||'').toLowerCase()
    if(!contentType.includes('text/') && !contentType.includes('application/json') && !contentType.includes('application/xml')){
      throw new Error(`Unsupported web content type: ${contentType || 'unknown'}`)
    }

    const raw=await response.text()
    const text=plainText(contentType,raw)
    return {
      url:current.toString(),
      status:response.status,
      ok:response.ok,
      contentType,
      text:text.slice(0,MAX_TEXT),
      truncated:text.length>MAX_TEXT,
    }
  }
  throw new Error('Unable to read web page')
}
