const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

const bridger = read('app/api/bridger/support-inbox/route.ts')
const agent = read('app/api/agent/support-inbox/route.ts')

assert.ok(bridger.includes("const BRIDGER_POSITION = 'bridger'"), 'Bridger Prospect communication has one canonical position')
assert.ok(bridger.includes("position !== BRIDGER_POSITION"), 'Bridger Prospect reads reject other department positions')
assert.ok(bridger.includes("targetPosition !== BRIDGER_POSITION"), 'Bridger Prospect writes reject other department positions')
assert.ok(!bridger.includes('VALID_POSITIONS'), 'Bridger endpoint no longer grants department-position access')

const approvalChecks = agent.match(/agentHasApprovedChannel\(auth\.userId, position\)/g) || []
assert.ok(approvalChecks.length >= 2, 'Agent Prospect reads and writes both enforce approved channel authority')
assert.ok(agent.includes('const approvedChannels = await getApprovedChannelsForAgent(auth.userId)'), 'Agent thread list resolves approved channels')
assert.ok(agent.includes('m.position = ANY(${approvedChannels}::text[])'), 'Agent thread list is limited to approved positions')
assert.ok(agent.includes("bridger.assigned_agent_id=${auth.userId}::uuid"), 'Agent Prospect access remains limited to assigned Bridgers')

console.log('Communication security checks passed')
