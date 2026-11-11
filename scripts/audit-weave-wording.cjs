const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')

// Public names only. Identifiers, URLs, schemas, SQL and historical loader
// snapshots remain unchanged. No rendered DOM rewriting is used.
function currentTerms(text, currency = true) {
  const named = text
    .replace(/\bAdministration[’']s\b/g, 'Administrations’')
    .replace(/\bAdministration\b/g, 'Administrations')
    .replace(/\bADMINISTRATION\b/g, 'ADMINISTRATIONS')
    .replace(/\bBridge Radiance\b/g, 'Bridge of Radiance')
    .replace(/\bBRIDGE RADIANCE\b/g, 'BRIDGE OF RADIANCE')
  return currency ? named
    .replace(/\bFlame Coins?\b/g, 'System Switch')
    .replace(/\bFLAME COINS?\b/g, 'SYSTEM SWITCH') : named
}
function sources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'core' ? [] : sources(file)
    return /\.(tsx?|jsx?)$/.test(file) && !file.endsWith('weave-loader-copy-history.ts') ? [file] : []
  })
}
function editsFor(file) {
  const source = fs.readFileSync(file, 'utf8')
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const edits = []
  function visit(node) {
    if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ||
      [ts.SyntaxKind.TemplateHead, ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail].includes(node.kind)) {
      const start = ts.isJsxText(node) ? node.pos : node.getStart(tree)
      const original = source.slice(start, node.end)
      let parent = node.parent
      let sql = false
      let authored = false
      while (parent && !ts.isSourceFile(parent)) {
        if (ts.isTaggedTemplateExpression(parent)) sql = true
        // SQL assembled from fragments is still SQL: never rename persisted
        // currency or other database values inside query/execute arguments.
        if (ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression)
          && ['query','execute'].includes(parent.expression.name.text)) sql = true
        if (ts.isVariableDeclaration(parent)&&parent.name.getText(tree)==='ONE_NIGERIAN_SCROLL_PASSAGES') authored = true
        if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return
        parent = parent.parent
      }
      const propertyName = ts.isPropertyAssignment(node.parent) && node.parent.name === node
      if (!sql && !authored && !propertyName && !/\b(?:SELECT\b[\s\S]*\bFROM|INSERT INTO|CREATE TABLE|ALTER TABLE)\b/i.test(original)) {
        // A bare historical currency value can be a ledger/storage key. Only
        // prose and JSX text are renamed; financial identifiers are retained.
        const currency = ts.isJsxText(node) || !/^['"`]Flame Coins?['"`]$/i.test(original)
        const replacement = currentTerms(original, currency)
        if (original !== replacement) edits.push({ start, end: node.end, original, replacement })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return { source, edits }
}
function audit() {
  const code=['app', 'components', 'lib'].flatMap(dir => sources(path.join(root, dir))).map(file => ({ file, ...editsFor(file) }))
  const publicNames=['public/weave-logo.svg','public/manifest.json'].map(name=>{
    const file=path.join(root,name),source=fs.readFileSync(file,'utf8'),replacement=currentTerms(source)
    return {file,source,edits:source===replacement?[]:[{start:0,end:source.length,original:source,replacement}]}
  })
  return [...code,...publicNames]
}
if (require.main === module) {
  const all = audit()
  const stale = all.filter(item => item.edits.length)
  if (process.argv.includes('--fix')) {
    for (const item of stale) {
      let text = item.source
      for (const edit of item.edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.replacement + text.slice(edit.end)
      fs.writeFileSync(item.file, text)
    }
  }
  console.log(JSON.stringify({ scanned: all.length, changedFiles: stale.length, passages: stale.reduce((n, item) => n + item.edits.length, 0), files: stale.map(item => path.relative(root, item.file)) }, null, 2))
  if (stale.length && !process.argv.includes('--fix')) process.exitCode = 1
}
module.exports = { audit, currentTerms }
