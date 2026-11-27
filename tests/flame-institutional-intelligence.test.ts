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
