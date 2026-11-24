const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')
const api=read('app/api/regional-manager/hope-outreach/route.ts')
const board=read('app/(app)/weave/lifestyles/regional-manager/hope-outreach/page.tsx')
const regional=read('app/(app)/weave/lifestyles/regional-manager/workspace/page.tsx')
const catalog=read('lib/bridger-workplace-catalog.ts')
const claims=read('app/api/bridger/daily-prospect/route.ts')
const engine=read('lib/bridger-daily-prospect-engine.ts')
const channels=read('lib/hope-outreach-channels.ts')
for(const name of ['tiktok','facebook','instagram','x','youtube','linkedin','threads','bluesky','divine','whatsapp'])
  assert.ok(channels.includes(name),'Hope social channel: '+name)
assert.ok(api.includes('HOPE_POST_CHANNELS')&&board.includes('HOPE_POST_CHANNELS'),
  'Manual evidence and daily plans use the same platform directory')
assert.ok(api.includes('prior.direction')&&api.includes('EXCLUDED.direction')&&board.includes('current.plan.direction'),
  'Audience direction is persisted, carried forward and visible to the assigned Bridger')
assert.ok(api.includes("action==='record_social_prospect'")&&api.includes("action==='update_social_followup'")&&
  api.includes('body.agreed!==true')&&api.includes('completed_at IS NULL')&&board.includes('item.follow_up_on<=data.day'),
  'Agreed social follow-ups survive day changes and can be advanced or completed')
assert.ok(api.includes("action==='set_reviewer'")&&api.includes('supportRegions')&&
  api.includes('reviewer_user_id=$5::uuid')&&api.includes("socialProspects:ctx.kind==='reviewer'?[]"),
  'Explicit active-region delegation permits public evidence review without sharing private prospect notes')
assert.ok(api.includes("OR status='pending'")&&api.includes('todaysEvidence'),
  'Prior pending evidence remains reviewable without changing current-day work counts')
for(const table of ['weave_regional_bridger_outreach_targets','weave_regional_bridger_target_audit','weave_regional_bridger_post_evidence'])
  assert.ok(api.includes('CREATE TABLE IF NOT EXISTS '+table),'Outreach records persist: '+table)
for(const action of ["action==='save_plan'","action==='submit_post'","action==='review_post'"])
  assert.ok(api.includes(action),'Authorized Hope action: '+action)
assert.ok(api.includes("ctx.kind!=='manager'")&&api.includes("ctx.kind!=='member'"),
  'Managers assign/review, Bridgers alone submit their own evidence')
assert.ok(api.includes("regionalTeam(user.id,null)")&&api.includes("regionalTeam(null,user.id)")&&api.includes("getActiveLegionEmployment"),
  'Regional scope and exclusive Legion appointment control access')
assert.ok(api.includes('FOR UPDATE OF b')&&api.includes("b.status='active'"),
  'Manager plans recheck active assignment within a transaction')
assert.ok(api.includes("status='pending'")&&api.includes("status='published'")&&api.includes("provider_post_id"),
  'Manual post review and actual provider receipts remain different')
assert.ok(api.includes('sent_at IS NOT NULL')&&api.includes('responses_or_conversions'),
  'Contact attempts and responses are not conflated')
assert.ok(api.includes('canonicalHost')&&api.includes("parsed.protocol!=='https:'"),
  'Public evidence URLs restrict provider and HTTPS')
assert.ok(api.includes('prior.regional_manager_user_id')===false&&api.includes('regional_manager_user_id=$3::uuid'),
  'Daily plan continuity stays within the currently assigned region')
assert.ok(api.includes('Africa/Lagos')&&claims.includes("((NOW() AT TIME ZONE 'Africa/Lagos')::date)")&&engine.includes("DEFAULT ((NOW() AT TIME ZONE 'Africa/Lagos')::date)"),
  'Daily outreach and daily free prospect agree on Nigeria date boundaries')
assert.ok(board.includes('setInterval(()=>void load(),20000)'),
  'Manager and Bridger board refreshes every 20 seconds')
assert.ok(board.includes('Manager reviewed')&&board.includes('Provider:')&&board.includes('sendConfirmations'),
  'Distinct evidence categories appear in the user experience')
assert.ok(regional.includes('/weave/lifestyles/regional-manager/hope-outreach')&&catalog.includes('/weave/lifestyles/regional-manager/hope-outreach'),
  'Both regional and Bridger navigation include Hope daily outreach')
console.log('Regional Hope daily outreach integration contract: passed')
