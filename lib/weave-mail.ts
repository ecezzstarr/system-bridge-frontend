import crypto from 'node:crypto'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import tls from 'node:tls'

const GMAIL_SMTP_HOST='smtp.gmail.com'
const GMAIL_SMTP_PORT=465
const SMTP_TIMEOUT_MS=15_000

export type GmailCredential={
  email:string
  appPassword:string
  fromName?:string|null
}

export function normalizeMailAddress(value:unknown){
  return String(value||'').trim().toLowerCase()
}

export function isValidMailAddress(value:string){
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
}

function safeHeader(value:string){
  return value.replace(/[\r\n]+/g,' ').trim()
}

function base64Lines(value:string){
  return Buffer.from(value,'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n')||''
}

async function readSmtpResponse(lines:AsyncIterator<string>,expected:number[]){
  const received:string[]=[]
  let code=0
  while(true){
    const next=await lines.next()
    if(next.done)throw new Error('Google mail connection closed unexpectedly')
    const line=String(next.value||'')
    received.push(line)
    const match=line.match(/^(\d{3})([ -])/)
    if(!match)continue
    const currentCode=Number(match[1])
    if(!code)code=currentCode
    if(currentCode!==code)throw new Error('Unexpected Google mail response sequence')
    if(match[2]===' '){
      if(!expected.includes(code)){
        console.error('[weave-mail] Google SMTP rejected command',code,received.join(' | ').slice(0,500))
        throw new Error('Google mail authentication or delivery was rejected')
      }
      return code
    }
  }
}

async function withGmailSession<T>(credential:GmailCredential,work:(ctx:{
  socket:tls.TLSSocket
  lines:AsyncIterator<string>
  user:string
})=>Promise<T>){
  const user=normalizeMailAddress(credential.email)
  const appPassword=String(credential.appPassword||'').replace(/\s+/g,'')
  if(!isValidMailAddress(user)||!appPassword)throw new Error('Google mailbox credentials are incomplete')

  const socket=tls.connect({
    host:GMAIL_SMTP_HOST,
    port:GMAIL_SMTP_PORT,
    servername:GMAIL_SMTP_HOST,
    rejectUnauthorized:true,
  })
  socket.setTimeout(SMTP_TIMEOUT_MS,()=>socket.destroy(new Error('Google mail connection timed out')))

  try{
    await once(socket,'secureConnect')
    const lineReader=createInterface({input:socket,crlfDelay:Infinity})
    const lines=lineReader[Symbol.asyncIterator]()
    try{
      await readSmtpResponse(lines,[220])
      socket.write('EHLO weavingsystem.online\r\n')
      await readSmtpResponse(lines,[250])
      socket.write('AUTH LOGIN\r\n')
      await readSmtpResponse(lines,[334])
      socket.write(`${Buffer.from(user).toString('base64')}\r\n`)
      await readSmtpResponse(lines,[334])
      socket.write(`${Buffer.from(appPassword).toString('base64')}\r\n`)
      await readSmtpResponse(lines,[235])
      return await work({socket,lines,user})
    }finally{
      lineReader.close()
    }
  }finally{
    socket.end()
    socket.destroy()
  }
}

export async function verifyGoogleMailbox(credential:GmailCredential){
  await withGmailSession(credential,async({socket,lines})=>{
    socket.write('NOOP\r\n')
    await readSmtpResponse(lines,[250])
    socket.write('QUIT\r\n')
    await readSmtpResponse(lines,[221])
  })
  return true
}

export async function sendAuthenticatedGoogleMail(input:{
  credential:GmailCredential
  to:string
  subject:string
  text:string
  html?:string|null
  replyTo?:string|null
  listUnsubscribe?:string|null
}){
  const recipient=normalizeMailAddress(input.to)
  if(!isValidMailAddress(recipient))throw new Error('Recipient email is invalid')

  const fromName=safeHeader(input.credential.fromName||'WEAVE')
  const replyTo=input.replyTo?normalizeMailAddress(input.replyTo):''
  const boundary=`weave-${crypto.randomUUID()}`
  const messageId=`<${crypto.randomUUID()}@weavingsystem.online>`
  const html=input.html||`<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${input.text
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</div>`

  const message=[
    `From: ${fromName} <${normalizeMailAddress(input.credential.email)}>`,
    `To: <${recipient}>`,
    `Subject: ${safeHeader(input.subject)}`,
    ...(replyTo&&isValidMailAddress(replyTo)?[`Reply-To: <${replyTo}>`]:[]),
    ...(input.listUnsubscribe?[
      `List-Unsubscribe: <${safeHeader(input.listUnsubscribe)}>`,
      'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
    ]:[]),
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(html),
    `--${boundary}--`,
    '',
  ].join('\r\n')

  await withGmailSession(input.credential,async({socket,lines,user})=>{
    socket.write(`MAIL FROM:<${user}>\r\n`)
    await readSmtpResponse(lines,[250])
    socket.write(`RCPT TO:<${recipient}>\r\n`)
    await readSmtpResponse(lines,[250,251])
    socket.write('DATA\r\n')
    await readSmtpResponse(lines,[354])
    socket.write(`${message}\r\n.\r\n`)
    await readSmtpResponse(lines,[250])
    socket.write('QUIT\r\n')
    await readSmtpResponse(lines,[221])
  })

  return {messageId}
}

export function systemGoogleMailbox():GmailCredential|null{
  const email=normalizeMailAddress(process.env.PASSWORD_RECOVERY_GMAIL_USER)
  const appPassword=String(process.env.PASSWORD_RECOVERY_GMAIL_APP_PASSWORD||'').replace(/\s+/g,'')
  if(!email||!appPassword)return null
  return {
    email,
    appPassword,
    fromName:process.env.PASSWORD_RECOVERY_GMAIL_FROM_NAME||'WEAVE Access',
  }
}
