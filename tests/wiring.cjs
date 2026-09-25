const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

const root = path.resolve(__dirname, '..')
const appRoot = path.join(root, 'app')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.next') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

function routeFromFile(file) {
  const rel = path.relative(appRoot, path.dirname(file)).split(path.sep)
  const segments = rel.filter(segment =>
    segment &&
    !(segment.startsWith('(') && segment.endsWith(')')) &&
    !segment.startsWith('@')
  )
  const route = '/' + segments.join('/')
  return route === '/' ? '/' : route.replace(/\/$/, '')
}

function escapeRegex(value) {
  return value.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
}

function routeRegex(pattern) {
  if (pattern === '/') return /^\/$/
  const segments = pattern.split('/').filter(Boolean)
  let source = '^'
  for (const segment of segments) {
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) source += '(?:/.*)?'
    else if (/^\[\.\.\..+\]$/.test(segment)) source += '/.+'
    else if (/^\[.+\]$/.test(segment)) source += '/[^/]+'
    else source += '/' + escapeRegex(segment)
  }
  return new RegExp(source + '/?$')
}

const appFiles = walk(appRoot)
const pagePatterns = appFiles
  .filter(file => /^page\.(tsx?|jsx?)$/.test(path.basename(file)))
  .map(routeFromFile)
const apiPatterns = appFiles
  .filter(file => /^route\.(tsx?|jsx?)$/.test(path.basename(file)))
  .map(routeFromFile)

const pageMatchers = pagePatterns.map(pattern => [pattern, routeRegex(pattern)])
const apiMatchers = apiPatterns.map(pattern => [pattern, routeRegex(pattern)])

function normalizeLocal(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  if (value.includes('${')) return null
  const interpolated = value
  const clean = interpolated.split('#')[0].split('?')[0] || '/'
  if (/\.(svg|png|jpe?g|webp|gif|ico|mp3|wav|mp4|webm|pdf|json|webmanifest)$/i.test(clean)) return null
  return clean
}

function matches(route, matchers) {
  return matchers.some(([, regex]) => regex.test(route))
}

const navigationFiles = [
  'components/app-sidebar.tsx',
  'components/client-navigation.tsx',
  'components/world/weave-dashboard-world.tsx',
  'app/(app)/admin/workshop/page.tsx',
  'app/(app)/authority/workshops/page.tsx',
  'app/page.tsx',
]

const missingPages = []
for (const relative of navigationFiles) {
  const file = path.join(root, relative)
  assert.ok(fs.existsSync(file), 'Navigation surface missing: ' + relative)
  const source = fs.readFileSync(file, 'utf8')
  const values = new Set()

  for (const regex of [
    /\bhref\s*[:=]\s*['"\x60]([^'"\x60]+)['"\x60]/g,
    /\brouter\.(?:push|replace)\(\s*['"\x60]([^'"\x60]+)['"\x60]/g,
    /\bwindow\.location\.href\s*=\s*['"\x60]([^'"\x60]+)['"\x60]/g,
  ]) {
    let match
    while ((match = regex.exec(source))) {
      const route = normalizeLocal(match[1])
      if (route && !route.startsWith('/api/')) values.add(route)
    }
  }

  for (const route of values) {
    if (!matches(route, pageMatchers)) missingPages.push(relative + ' -> ' + route)
  }
}

const sourceFiles = [
  ...walk(path.join(root, 'app')).filter(file => /\.(tsx?|jsx?)$/.test(file)),
  ...walk(path.join(root, 'components')).filter(file => /\.(tsx?|jsx?)$/.test(file)),
]

const missingApis = []
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const rel = path.relative(root, file)
  const regex = /\bfetch\(\s*['"\x60]([^'"\x60]+)['"\x60]/g
  let match
  while ((match = regex.exec(source))) {
    const route = normalizeLocal(match[1])
    if (!route || !route.startsWith('/api/')) continue
    if (!matches(route, apiMatchers)) missingApis.push(rel + ' -> ' + route)
  }
}

assert.deepEqual(missingPages, [], 'Broken internal page wiring:\n' + missingPages.join('\n'))
assert.deepEqual(missingApis, [], 'Broken literal API wiring:\n' + missingApis.join('\n'))

console.log('PASS: route wiring audit (' + pagePatterns.length + ' pages, ' + apiPatterns.length + ' API routes)')
