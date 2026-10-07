const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const ts=require('typescript')

const root=path.resolve(__dirname,'..')
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8')

const mail=read('lib/weave-mail.ts')
const mailbox=read('lib/weave-mailbox.ts')
const outreach=read('lib/email-outreach.ts')
const senderApi=read('app/api/email-outreach/sender/route.ts')
const adminApi=read('app/api/admin/email-outreach/route.ts')
const adminPage=read('app/(app)/admin/email-outreach/page.tsx')
const bridgerPage=read('app/(app)/bridger/email-outreach/page.tsx')
const prospectMarketPage=read('app/(app)/weave/market/prospects/page.tsx')
const terms=read('lib/weave-terms.ts')
const recovery=read('lib/password-recovery.ts')
const forgot=read('app/api/auth/forgot-password/route.ts')

assert.ok(mail.includes("smtp.gmail.com")&&mail.includes('sendAuthenticatedGoogleMail')&&mail.includes('AUTH LOGIN'),'WEAVE has an authenticated Gmail SMTP transport')
assert.ok(mailbox.includes("aes-256-gcm")&&mailbox.includes('WEAVE_MAIL_CREDENTIAL_KEY')&&mailbox.includes('verifyGoogleMailbox'),'Google mailbox credentials are verified and encrypted before storage')
assert.ok(mailbox.includes('credential_ciphertext')&&!mailbox.includes('app_password varchar'),'Mailbox storage does not persist a plaintext app password column')
assert.ok(senderApi.includes('connectGoogleMailbox')&&senderApi.includes('appPassword')&&senderApi.includes('disconnectGoogleMailbox'),'The existing Email Outreach sender endpoint owns Google mailbox authentication')
assert.ok(outreach.includes('getConnectedMailboxCredential')&&outreach.includes('sendAuthenticatedGoogleMail')&&outreach.includes("transport: mailbox ? 'gmail' : 'resend'"),'The existing Email Outreach engine prefers the authenticated mailbox and retains Resend as fallback')
assert.ok(adminApi.includes('emailOutreachProviderConfiguredForUser')&&adminApi.includes('providerConfigured'),'Administration sees user-specific Gmail or fallback transport readiness')
assert.ok(adminPage.includes('Google app password')&&adminPage.includes('appPassword'),'Administration can authenticate its Google source mailbox from the existing Email Outreach place')
assert.ok(bridgerPage.includes('Google app password')&&bridgerPage.includes('appPassword'),'Bridgers can authenticate their Google source mailbox from the existing Email Outreach place')
assert.ok(recovery.includes('systemGoogleMailbox')&&recovery.includes('getAdministrationGoogleMailboxCredential')&&recovery.includes("provider === 'gmail'")&&recovery.includes('sendResendFallback'),'Password recovery uses Google first and preserves a controlled fallback')
assert.ok(forgot.includes('await passwordRecoveryEmailConfigured()'),'Forgot-password waits for the live recovery transport check')
assert.ok(!fs.existsSync(path.join(root,'lib/prospect-email-engine.ts')),'No second parallel Prospect email engine is introduced')

assert.ok(adminApi.includes("action === 'generate_candidates'")&&adminApi.includes('EMAIL_CANDIDATE_PREFIXES')&&adminApi.includes("'email_candidate_engine'")&&adminApi.includes("verification: 'unverified'"),'Administration Email Prospect Engine forms clearly unverified business-domain candidates')
assert.ok(adminPage.includes('Candidate formation')&&adminPage.includes('unverified email Prospect candidates'),'Administration UI distinguishes candidate formation from verified contact')
assert.ok(bridgerPage.includes('Hope · Bridger Department · Email Outreach')&&bridgerPage.includes('unverified candidate'),'Bridger Email Outreach carries Hope identity and Prospect uncertainty')
assert.ok(terms.includes('CURRENT_TERMS_VERSION = 11')&&terms.includes("title: '4. Prospect Nature'")&&terms.includes('unverified candidates'),'Terms require Bridgers to understand that Prospects are unverified candidates')
assert.ok(prospectMarketPage.includes('Hope · Bridger Department')&&prospectMarketPage.includes('Unverified candidates'),'WhatsApp Prospect Market carries Hope candidate language')
assert.ok(!prospectMarketPage.includes('Pre-qualified Interest'),'Prospect Market does not falsely claim pre-qualified interest')

for(const file of [
  'lib/weave-mail.ts',
  'lib/weave-mailbox.ts',
  'lib/email-outreach.ts',
  'lib/password-recovery.ts',
  'lib/weave-terms.ts',
  'app/api/email-outreach/sender/route.ts',
  'app/api/admin/email-outreach/route.ts',
  'app/api/auth/forgot-password/route.ts',
  'app/(app)/admin/email-outreach/page.tsx',
  'app/(app)/bridger/email-outreach/page.tsx',
  'app/(app)/weave/market/prospects/page.tsx',
]){
  const source=read(file)
  const compiled=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}})
  const errors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
  assert.equal(errors.length,0,file+' email mailbox syntax/transpile check')
}

console.log('Email mailbox reconciliation checks passed')
