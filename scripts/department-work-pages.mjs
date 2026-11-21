import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Discover page entry points during the build, while the App Router source exists.
// Record-bound pages are reached through their owning workshop with a real ID.
export function departmentWorkPages(root = fileURLToPath(new URL('../app/', import.meta.url))) {
  const pages = []
  function visit(directory, segments) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = entry.name
      if (entry.isDirectory()) {
        if (name === 'api' || ['[', '@', '_', '.'].some(prefix => name.startsWith(prefix))) continue
        visit(join(directory, name), /^\(.+\)$/.test(name) ? segments : [...segments, name])
      } else if (/^page\.(tsx?|jsx?)$/.test(name) && segments.length) {
        pages.push('/' + segments.join('/'))
      }
    }
  }
  visit(root, [])
  return [...new Set(pages)].sort()
}
