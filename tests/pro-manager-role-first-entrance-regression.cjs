const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const postcss=require('postcss')
const root=path.join(__dirname,'..')
const read=file=>fs.readFileSync(path.join(root,file),'utf8')
const paths=[
 'components/client/pro-manager-role-showcase.tsx',
 'app/client/pro-activation/page.tsx',
 'app/client/pro-verification/page.tsx',
]
for(const p of paths){
 const parsed=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
  compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}})
 assert.equal((parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,p)
}
for(const css of [
 'components/client/pro-manager-role-showcase.module.css',
 'app/client/pro-verification/pro-verification.css'
])postcss.parse(read(css),{from:css})
const role=read(paths[0]),activation=read(paths[1]),verify=read(paths[2])
assert.ok(role.includes('Pro Regional <span>Manager</span>')&&
 role.includes('data-pro-manager-showcase="true"')&&
 role.includes('Your business. Working systems.')&&
 role.includes('Your progress strengthens the company.'),
 'The company opportunity, business systems and reciprocal growth lead the entrance')
for(const feature of [
 'Private Pro business world','Customer Door',
 'Workshops, systems & tools','Employees & participation',
 'Orders & company records','Regional growth'
])assert.ok(role.includes(feature),'Visible Pro capability missing: '+feature)
assert.ok(role.includes('actionHref')&&role.includes('actionText')&&role.includes('#pro-manager-systems'),
 'Role entrance calls to real Client verification and visible capability information')
assert.ok(!role.includes('680 USDT')&&!role.includes('One-time activation')&&
 !role.includes('CJ Dorado'),
 'The first-screen opportunity must not be a payment headline or use a real individual as an example')
assert.ok(activation.includes('data-pro-regional-manager-entrance="true"')&&
 activation.includes('actionHref="/client/pro-verification"')&&
 activation.includes('Begin Client verification')&&
 activation.includes('data-pro-manager-role-first="true"')&&
 activation.includes('actionHref="#pro-activation-current-stage"'),
 'Both guest and authenticated Pro activation lead with the role and useful navigation')
assert.ok(activation.indexOf('   <ProManagerRoleShowcase actionHref="#pro-activation-current-stage"')<
 activation.indexOf('   <section id="pro-activation-current-stage"')&&
 activation.includes('data-pro-electronic-agreement="true"')&&
 activation.includes("submit('sign_agreement')")&&
 activation.includes("submit('submit_payment')")&&
 activation.includes("status==='payment_required'"),
 'The private activation shows the business first and preserves later real signing and payment stages')
assert.ok(verify.includes('Pro Regional Manager <span>Your business. Your Pro world.</span>')&&
 verify.includes('id="pro-client-file-folder-features"')&&
 verify.includes('pv-benefit-grid')&&
 verify.includes('pv-growth-band')&&
 verify.indexOf('id="pro-client-file-folder-features"')<verify.indexOf('className="pv-process"'),
 'The public verification shows systems and business purpose before the intake form')
assert.ok(verify.includes('<details className="pv-activation-disclosure">')&&
 !verify.includes('<div className="pv-fee">')&&
 verify.includes('680 USDT')&&
 verify.includes("action:'submit_plan'")&&verify.includes("action:'submit_payment'")&&
 verify.includes('requestRegistrationInvite'),
 'Later fee is accurately disclosed without dominating entry or breaking verification')
assert.ok(!verify.includes('CJ Dorado')&&
 !verify.includes('placeholder="Spain"'),
 'Public Client onboarding avoids personal names and person-specific location examples')
assert.ok(read('components/client/pro-manager-role-showcase.module.css').includes('@media(max-width:620px)')&&
 read('components/client/pro-manager-role-showcase.module.css').includes('@media(prefers-reduced-motion:reduce)'),
 'Responsive and reduced motion role-first company layout required')
console.log('Pro role-first entrances, capabilities, applicant privacy and preserved activation gates: OK')
