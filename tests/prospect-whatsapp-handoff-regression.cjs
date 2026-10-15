const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

const root = path.resolve(__dirname, '..')
const page = fs.readFileSync(path.join(root, 'app/(app)/weave/market/prospects/page.tsx'), 'utf8')
const sendRoute = fs.readFileSync(path.join(root, 'app/api/bridger/prospects/[outreachId]/send/route.ts'), 'utf8')

assert.ok(page.includes('window.location.assign(waUrl)'), 'Prospect WhatsApp handoff uses mobile-safe same-tab navigation')
assert.ok(!page.includes("disabled={sendingId === p.outreachId || !whatsappNumber}"), 'Send First Message is not disabled by the Bridger profile WhatsApp field')
assert.ok(!page.includes("if (!whatsappNumber) {\n      toast.error('Add your WhatsApp number first')"), 'Prospect handoff does not require the Bridger own WhatsApp number')
assert.ok(page.includes('keepalive: true'), 'Send confirmation survives navigation into WhatsApp')
assert.ok(page.includes('openWhatsApp(target, p.messageSent)'), 'Prepared first message is handed directly to WhatsApp')
assert.ok(page.includes('disabled={!p.bridgeUrl}'), 'Bridge handoff depends on Bridge readiness, not the Bridger profile WhatsApp field')
assert.ok(sendRoute.includes("['sent', 'responded', 'opened', 'converted'].includes"), 'Send confirmation is idempotent across already-progressed prospect states')
assert.ok(sendRoute.includes("sent_at = COALESCE(sent_at, NOW())"), 'First sent timestamp is preserved on retries')

console.log('PASS: Bridger Send First Message opens a mobile-safe WhatsApp handoff without a false profile-number gate')
