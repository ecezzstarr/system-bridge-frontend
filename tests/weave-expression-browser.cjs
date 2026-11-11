// Presentation-only fixtures: no production credentials, orders or payments.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const output = path.resolve('presentation-results')
const origin = process.env.WEAVE_PRESENTATION_ORIGIN || 'http://127.0.0.1:3100'
const routes = ['/', '/file-folder-preview', '/login', '/client/login', '/client/pro-verification']
const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const contrast = (a, b) => {
  const sorted = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (sorted[0] + .05) / (sorted[1] + .05)
}

async function main() {
  fs.mkdirSync(output, { recursive: true })
  const browser = await chromium.launch()
  const results = []
  try {
    for (const width of [360, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
      await context.route('**/api/**', route => route.fulfill({
        contentType: 'application/json', body: JSON.stringify({
          success: true, active: false, sessionValid: true, items: [],
          runtime: { config: { loading: { bootMinMs: 2000, transitMinMs: 2000, autoAdvanceMs: 1500 } } },
        }),
      }))
      const page = await context.newPage()
      for (const route of routes) {
        const errors = []
        const onError = error => errors.push(error.message)
        page.on('pageerror', onError)
        await page.goto(origin + route, { waitUntil: 'networkidle' })
        await page.locator('.weave-loader-stable').waitFor({ state: 'hidden', timeout: 45000 })
        await page.evaluate(() => document.fonts.ready)
        const slug = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')
        await page.screenshot({ path: path.join(output, `${slug}-${width}.png`), fullPage: true })
        const state = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          font: getComputedStyle(document.body).fontFamily,
          loaded: [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family),
          panels: [...document.querySelectorAll('.weave-tier-content')].map(panel => {
            const article = panel.closest('article')
            const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
            // Read the composited tier surface, including the Premium gradient.
            const style = getComputedStyle(article)
            const background = style.backgroundImage === 'none' ? style.backgroundColor
              : style.backgroundImage.match(/rgb\([^)]+\)/)[0]
            return {
              tier: article.dataset.fileFolderTier,
              ink: rgb(getComputedStyle(panel.querySelector('p')).color),
              headingInk: rgb(getComputedStyle(panel.querySelector('h2')).color),
              background: rgb(background),
            }
          }),
        }))
        assert.equal(state.overflow, false, `${route} overflows at ${width}px`)
        assert.match(state.font, /Weave Manrope/, `${route} uses the bundled body font`)
        assert.ok(state.loaded.some(font => font.includes('Weave Manrope')), 'Body font actually loaded')
        assert.ok(state.loaded.some(font => font.includes('Weave Cormorant')), 'Display font actually loaded')
        assert.deepEqual(errors, [], `${route} runtime errors`)
        for (const panel of state.panels) {
          assert.ok(contrast(panel.ink, panel.background) >= 4.5, `${panel.tier} body contrast`)
          assert.ok(contrast(panel.headingInk, panel.background) >= 4.5, `${panel.tier} heading contrast`)
        }
        results.push({ route, width, ...state })
        page.off('pageerror', onError)
      }
      await context.close()
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2))
    console.log('PASS: 20 rendered phone/tablet/desktop views, bundled fonts, tier contrast and runtime checks')
  } finally {
    await browser.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
