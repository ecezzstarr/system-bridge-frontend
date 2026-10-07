import crypto from 'node:crypto'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import tls from 'node:tls'

const GMAIL_SMTP_HOST='smtp.gmail.com'
const GMAIL_SMTP_PORT=465
const SMTP_TIMEOUT_MS=15_000

export class GoogleMailError extends Error {
  constructor(message:string, public code:string, public deliveryUncertain=false){super(message)}
}

export function mailboxErrorResponse(error:unknown){
  if(error instanceof GoogleMailError)return {error:error.message,code:error.code,status:error.code==='MAIL_AUTH_REJECTED'||error.code==='MAIL_CREDENTIALS_INVALID'?400:503}
  if((error as {code?:string})?.code==='23505')return {error:'This mailbox is already connected to another WEAVE account.',code:'MAILBOX_IN_USE',status:409}
  return {error:'WEAVE could not securely save the mailbox. Administration must check database access and the mail encryption configuration.',code:'MAILBOX_STORAGE_FAILED',status:503}
}

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

async function readSmtpResponse(lines:AsyncIterator<string>,expected:number[],auth=false){
  let code=0
  while(true){
    const next=await lines.next()
    if(next.done)throw new Error('Google mail connection closed unexpectedly')
    const line=String(next.value||'')
    const match=line.match(/^(\d{3})([ -])/)
    if(!match)continue
    const currentCode=Number(match[1])
    if(!code)code=currentCode
    if(currentCode!==code)throw new Error('Unexpected Google mail response sequence')
    if(match[2]===' '){
      if(!expected.includes(code)){
        throw new GoogleMailError(auth
          ? 'Google rejected this mailbox sign-in. Use the complete mailbox address and a current Google app password from that same account.'
          : `Google rejected the mail request (SMTP ${code}). Check the recipient and mailbox sending limits.`,auth?'MAIL_AUTH_REJECTED':'MAIL_REJECTED')
      }
      return code
    }
  }
}

async function withGmailSession<T>(credential:GmailCredential,work:(ctx:{
  socket:tls.TLSSocket
  lines:AsyncIterator<string>
  user:string
  markDataSubmitted:()=>void
})=>Promise<T>){
  const user=normalizeMailAddress(credential.email)
  const appPassword=String(credential.appPassword||'').replace(/\s+/g,'')
  if(!isValidMailAddress(user)||appPassword.length!==16)throw new GoogleMailError('Enter the mailbox address and its 16-character Google app password. Spaces are accepted.','MAIL_CREDENTIALS_INVALID')

  const socket=tls.connect({
    host:GMAIL_SMTP_HOST,
    port:GMAIL_SMTP_PORT,
    servername:GMAIL_SMTP_HOST,
    rejectUnauthorized:true,
  })
  // Attach readers before the handshake so an immediate greeting is not lost.
  const lineReader=createInterface({input:socket,crlfDelay:Infinity})
  const lines=lineReader[Symbol.asyncIterator]()
  let dataSubmitted=false
  let rejectConnection:(error:Error)=>void=()=>{}
  const failed=new Promise<never>((_,reject)=>{rejectConnection=reject})
  const onError=()=>rejectConnection(new GoogleMailError('WEAVE could not connect securely to Google mail. Retry, then ask Administration to check outbound mail connectivity.','MAIL_CONNECTION_FAILED',dataSubmitted))
  socket.on('error',onError)
  const deadline=setTimeout(()=>{
    rejectConnection(new GoogleMailError('Google mail did not answer in time. Check the connection and retry.','MAIL_TIMEOUT',dataSubmitted))
    socket.destroy()
  },SMTP_TIMEOUT_MS)
  try{
    return await Promise.race([failed,(async()=>{
      await once(socket,'secureConnect')
      await readSmtpResponse(lines,[220])
      socket.write('EHLO weavingsystem.online\r\n')
      await readSmtpResponse(lines,[250])
      socket.write('AUTH LOGIN\r\n')
      await readSmtpResponse(lines,[334],true)
      socket.write(`${Buffer.from(user).toString('base64')}\r\n`)
      await readSmtpResponse(lines,[334],true)
      socket.write(`${Buffer.from(appPassword).toString('base64')}\r\n`)
      await readSmtpResponse(lines,[235],true)
      return await work({socket,lines,user,markDataSubmitted:()=>{dataSubmitted=true}})
    })()])
  }catch(error){
    if(error instanceof GoogleMailError)throw error
    throw new GoogleMailError('The Google mail connection closed before completion. Check the mailbox report before retrying.','MAIL_CONNECTION_FAILED',dataSubmitted)
  }finally{
    clearTimeout(deadline)
    lineReader.close()
    socket.destroy()
  }
}

export async function verifyGoogleMailbox(credential:GmailCredential){
  await withGmailSession(credential,async({socket,lines})=>{
    socket.write('NOOP\r\n')
    await readSmtpResponse(lines,[250])
    // Successful NOOP is sufficient; QUIT failure must not undo authentication.
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

  await withGmailSession(input.credential,async({socket,lines,user,markDataSubmitted})=>{
    socket.write(`MAIL FROM:<${user}>\r\n`)
    await readSmtpResponse(lines,[250])
    socket.write(`RCPT TO:<${recipient}>\r\n`)
    await readSmtpResponse(lines,[250,251])
    socket.write('DATA\r\n')
    await readSmtpResponse(lines,[354])
    markDataSubmitted()
    socket.write(`${message}\r\n.\r\n`)
    await readSmtpResponse(lines,[250])
    // Google accepted DATA. Do not turn a later QUIT/disconnect into a retry.
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
