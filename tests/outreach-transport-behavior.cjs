const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { Duplex } = require('node:stream')
const ts = require('typescript')

function loadMail(mode) {
  let socket
  let submitted = 0
  class SmtpSocket extends Duplex {
    _read() {}
    _write(chunk, encoding, done) {
      const line = chunk.toString()
      let reply
      if (line.startsWith('EHLO')) reply = '250-test\r\n250 AUTH LOGIN\r\n'
      else if (line === 'AUTH LOGIN\r\n') reply = '334 Username\r\n'
      else if (line.trim() === Buffer.from('sender@gmail.com').toString('base64')) reply = '334 Password\r\n'
      else if (line.trim() === Buffer.from('abcdefghijklmnop').toString('base64')) {
        if (mode === 'socket_error') { done(); setImmediate(()=>this.destroy(new Error('private socket details'))); return }
        if (mode === 'timeout') { done(); return }
        reply = mode === 'auth_rejected' ? '535 5.7.8 Credentials rejected\r\n' : '235 Authenticated\r\n'
      } else if (line === 'NOOP\r\n' || line.startsWith('MAIL FROM') || line.startsWith('RCPT TO')) reply = '250 OK\r\n'
      else if (line === 'DATA\r\n') reply = '354 Send data\r\n'
      else if (line.endsWith('\r\n.\r\n')) {
        submitted++
        if (mode === 'uncertain') { done(); setImmediate(()=>this.destroy(new Error('connection lost'))); return }
        reply = '250 Accepted\r\n'
      } else throw new Error('Unexpected SMTP command')
      done()
      // Greeting and replies can arrive immediately after connection/writes.
      setImmediate(()=>this.push(reply))
    }
  }
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync('lib/weave-mail.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code, {
    module, exports:module.exports, Buffer, process, console,
    setTimeout:(fn,ms)=>setTimeout(fn,mode==='timeout'?30:ms), clearTimeout,
    require:name=>name==='node:tls'?{connect:()=>{
      socket=new SmtpSocket()
      setImmediate(()=>{socket.emit('secureConnect');socket.push('220 Ready\r\n')})
      return socket
    }}:require(name),
  })
  return {mail:module.exports,submitted:()=>submitted,closed:()=>socket?.destroyed}
}
const credential = {email:'sender@gmail.com',appPassword:'abcd efgh ijkl mnop'}
;(async()=>{
  const good = loadMail('success')
  assert.equal(await good.mail.verifyGoogleMailbox(credential),true)
  assert.ok(good.closed())
  const sent = await good.mail.sendAuthenticatedGoogleMail({credential,to:'prospect@example.com',subject:'WEAVE',text:'Hello'})
  assert.ok(sent.messageId)
  assert.equal(good.submitted(),1)
  assert.ok(good.closed(), 'Accepted DATA closes without a QUIT response dependency')
  for(const [mode,code] of [['auth_rejected','MAIL_AUTH_REJECTED'],['socket_error','MAIL_CONNECTION_FAILED'],['timeout','MAIL_TIMEOUT']]) {
    const test=loadMail(mode)
    await assert.rejects(test.mail.verifyGoogleMailbox(credential),e=>e.code===code && !e.deliveryUncertain)
    assert.ok(test.closed())
  }
  const uncertain=loadMail('uncertain')
  await assert.rejects(uncertain.mail.sendAuthenticatedGoogleMail({credential,to:'prospect@example.com',subject:'WEAVE',text:'Hello'}),e=>e.deliveryUncertain===true)
  assert.equal(uncertain.submitted(),1)
  const invalid=loadMail('success')
  await assert.rejects(invalid.mail.verifyGoogleMailbox({...credential,appPassword:'normal-password'}),e=>e.code==='MAIL_CREDENTIALS_INVALID')
  assert.equal(invalid.mail.mailboxErrorResponse({code:'23505'}).status,409)
  assert.equal(invalid.mail.mailboxErrorResponse(new Error('secret configuration value')).code,'MAILBOX_STORAGE_FAILED')
  assert.ok(!invalid.mail.mailboxErrorResponse(new Error('secret configuration value')).error.includes('secret configuration value'))
  console.log('Outreach SMTP behavior passed: auth, immediate greeting, socket failure, timeout, accepted DATA and uncertain delivery')
})().catch(e=>{console.error(e);process.exitCode=1})
