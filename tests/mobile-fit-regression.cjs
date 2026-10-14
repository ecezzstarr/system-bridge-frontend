const fs = require('fs')
const path = require('path')
const assert = require('assert')

const root = path.resolve(__dirname, '..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')

const rootLayout = read('app/layout.tsx')
const mobile = read('app/weave-mobile.css')
const dj = read('components/dj-broadcast-player.tsx')

assert.ok(rootLayout.includes("import './weave-mobile.css'"), 'Root layout loads the global mobile-fit layer')
assert.ok(mobile.includes('@media (max-width: 767px)'), 'Mobile-fit rules are phone-scoped')
assert.ok(mobile.includes('body [class*="min-w-[2"]'), 'Legacy 240/260/280px minimums are allowed to shrink on phones')
assert.ok(mobile.includes('body [class*="w-["]'), 'Arbitrary desktop widths cannot exceed the phone viewport')
assert.ok(mobile.includes('body :where(table)') && mobile.includes('overflow-x: auto'), 'Dense tables scroll locally instead of widening the page')
assert.ok(dj.includes('data-weave-dj-mirror="true"'), 'Global DJ exposes the mirror surface selector')
assert.ok(mobile.includes('[data-weave-dj-mirror="true"]') && mobile.includes('max-width: 5.25rem !important'), 'Phone DJ collapses to a compact mirror pill')
assert.ok(mobile.includes('left: auto !important') && mobile.includes('right: max(.5rem, env(safe-area-inset-right)) !important'), 'Phone DJ ignores saved drag coordinates and stays beside the header')
assert.ok(mobile.includes('button:first-child') && mobile.includes('div:nth-child(3)'), 'Phone DJ hides drag and long metadata instead of covering content')

console.log('mobile-fit-regression: ok')
