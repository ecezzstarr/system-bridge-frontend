import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

test('Eight institutional tools require appointed workshop authority',()=>{
 const source=readFileSync('app/api/eight/dev/route.ts','utf8')
 assert.ok(source.includes('requireWorkshopAuthorization(request)'))
 assert.ok(source.includes("if (!institutional) return {error:"))
 assert.ok(source.includes('topic:publicResearchTopic(command)'))
 assert.ok(!source.includes('checkAutoSweep'))
})

test('Institutional module cannot promote or deploy code and uses fixed research index',()=>{
 const source=readFileSync('lib/flame-institutional-intelligence.ts','utf8')
 assert.ok(source.includes("branch:'main'"))
 assert.ok(source.includes('https://api.crossref.org/works'))
 assert.ok(source.includes("redirect:'error'"))
 assert.ok(!source.includes('commitWorkshopFile'))
 assert.ok(!source.includes('requestReleaseJob'))
})

import {safePublicWebRead} from '../lib/eight-web'

test('web reader refuses private and special-use destinations before a network connection',async()=>{
 for(const url of [
  'http://127.0.0.1/','http://10.1.2.3/','http://169.254.169.254/',
  'http://192.168.0.1/','http://[::1]/','http://[::ffff:7f00:1]/',
  'http://[fc00::1]/','http://[2001:db8::1]/','http://[2002::1]/',
  'https://example.com:8443/','https://user:pass@example.com/','file:///etc/passwd',
 ]) await assert.rejects(safePublicWebRead(url))
})

test('legacy privileged service is disabled and release authorization checks security',()=>{
 const old=readFileSync('eight-core/server.ts','utf8')
 assert.ok(old.indexOf('res.status(410)')<old.indexOf("app.post('/execute'"))
 assert.ok(!readFileSync('eight-core/deploy.sh','utf8').includes(' --allow-unauthenticated'))
 const release=readFileSync('lib/weave-github-release.ts','utf8')
 assert.ok(release.includes("releaseSecurityCheck(candidate.sha,'main')"))
 assert.ok(release.includes("releaseSecurityCheck(head,'pull_request')"))
 const dev=readFileSync('app/api/eight/dev/route.ts','utf8')
 assert.ok(!dev.includes('run_select_query'))
 assert.ok(!dev.includes("from 'fs/promises'"))
})

test('Eight selects the native runtime unless the operator explicitly requests advanced assistance',()=>{
 const source=readFileSync('app/api/eight/dev/route.ts','utf8')
 assert.ok(source.includes('await nativeEight(command,String(userId),nativeHistory)'))
 assert.ok(source.includes("useExternal ? await runToolLoop([{role:'user',content:command}]"))
 assert.ok(source.includes('await discoverResearch(topic)'))
 assert.ok(source.includes('await readContinuityEvidence()'))
})
