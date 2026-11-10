const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.join(__dirname, '..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const prices = read('lib/department-entry-pricing.ts')
const compiled = ts.transpileModule(prices, {
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
assert.equal((compiled.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0)
const module_ = { exports: {} }
new Function('module', 'exports', compiled.outputText)(module_, module_.exports)
const { departmentEntryTicketPrice, DEPARTMENT_ENTRY_TICKET_PRICES_SYSTEM_SWITCH } = module_.exports
assert.deepEqual(JSON.parse(JSON.stringify(DEPARTMENT_ENTRY_TICKET_PRICES_SYSTEM_SWITCH)), { AGENT: 5, BRIDGER: 8 })
assert.equal(departmentEntryTicketPrice('AGENT'), 5)
assert.equal(departmentEntryTicketPrice('BRIDGER'), 8)
for (const rate of [100, 1573.25, 2489.934]) {
  const quote = department => Math.round(departmentEntryTicketPrice(department) * rate * 100) / 100
  assert.equal(quote('AGENT'), Math.round(5 * rate * 100) / 100)
  assert.equal(quote('BRIDGER'), Math.round(8 * rate * 100) / 100)
}

const tickets = read('lib/department-entry-tickets.ts')
const paystack = read('lib/department-entry-paystack.ts')
const gate = read('components/department-entry-ticket-gate.tsx')
const register = read('app/(auth)/register/page.tsx')
const admin = read('components/admin/department-entry-tickets-panel.tsx')
const ticketApi = read('app/api/department-entry/ticket/route.ts')
const migration = read('migrations/20261110_department_entry_role_prices.sql')
assert(tickets.includes('departmentEntryTicketPrice(department)'), 'Server prices follow department')
assert(tickets.includes('priceSystemSwitch * rateNgnPerTrx * 100'), 'NGN quote based on selected role price')
assert(tickets.includes('${priceSystemSwitch}'), 'New ticket stores the exact role price')
assert(!tickets.includes('PRICE_FLAME_COIN = 3'), 'Old common-price constant retired')
assert(!tickets.includes('ALTER TABLE departmental_entry_tickets ALTER COLUMN price_flame_coin DROP DEFAULT'), 'Ticket reads do not take repeated schema locks')
assert(migration.includes('DROP DEFAULT'), 'Existing schema migration drops old default')
assert(tickets.includes('price_flame_coin NUMERIC(30,8) NOT NULL,'), 'Fresh table requires an explicit price')
assert(paystack.includes('Number(ticket.amount_ngn) * 100'), 'Paystack uses recorded ticket NGN quote')
assert(paystack.includes('Number(ticket.amount_ngn) * 100'), 'Verification respects the original ticket quote')
assert(ticketApi.includes('Number(ticket.price_flame_coin)'), 'API returns the stored ticket price')
assert(gate.includes('{ticket.priceFlameCoin} System Switch'), 'Gate shows actual ticket price')
assert(gate.includes("ticket.department === 'AGENT' ? 'Agent' : 'Bridger'"), 'Ticket gate identifies role')
assert(register.includes('Agent entry: 5 System Switch · Bridger entry: 8 System Switch'), 'Registration discloses both prices')
assert(register.includes('departmentEntryTicketPrice(formData.role'), 'Registration uses shared role price')
assert(admin.includes('New Agent tickets cost 5 System Switch and new Bridger tickets cost 8 System Switch'), 'Administrations discloses new role prices')
assert(admin.includes('Number(ticket.price_flame_coin).toLocaleString()} System Switch'), 'Admin review shows stored price for historical tickets')
console.log('PASS: Agent entry 5, Bridger entry 8, role-specific NGN checkout, historic ticket quote preserved')
