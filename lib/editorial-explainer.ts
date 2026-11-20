export function planExplainer(script: string, seconds: number) {
  if (!Number.isInteger(seconds) || seconds < 30 || seconds > 360) throw new Error('Choose a whole duration from 30 to 360 seconds.')
  const lines = script.trim().split(/\r?\n/).filter(line => line.trim())
  if (!lines.length || lines.length > 24) throw new Error('Use 1 to 24 scenes.')
  const rows = lines.map((line, i) => {
    const split = line.indexOf('|')
    const heading = line.slice(0, split).trim()
    const text = line.slice(split + 1).trim()
    if (split < 1 || !heading || heading.length > 48 || !text || text.length > 140)
      throw new Error(`Scene ${i + 1} needs a heading (up to 48 characters), a | and a caption (up to 140 characters).`)
    return { heading, text }
  })
  if (seconds < rows.length * 2 || seconds > rows.length * 90)
    throw new Error('Choose a duration allowing 2 to 90 seconds per scene.')
  const timing = rows.map(() => 2)
  for (let remaining = seconds - rows.length * 2; remaining > 0; remaining--) {
    let best = -1
    rows.forEach((row, index) => {
      if (timing[index] < 90 && (best < 0 || row.text.length / timing[index] > rows[best].text.length / timing[best])) best = index
    })
    timing[best]++
  }
  return rows.map(({heading, text}, index) => ({
    id: `paper-${index + 1}`, order: index + 1, beat: 'Illustrated explainer', heading,
    durationSeconds: timing[index], text, voiceover: text,
    visualDirection: 'Animated paper composition. Add a photograph or footage if desired.',
    assetUrl: null, assetType: null,
  }))
}

// All positions use the final 9:16 frame. User writing stays outside ASS override blocks.
export function paperOverlay(heading: string, caption: string, order: number, simulation: boolean, hasMedia: boolean) {
  const literal: Record<string, string> = {'{':'｛','}':'｝','\\':'／'}
  const clean = (s: string) => s.replace(/[{}\\]/g, c => literal[c]).replace(/\s+/g, ' ').trim()
  const events: string[] = []
  const add = (layer: number, style: string, value: string) =>
    events.push(`Dialogue: ${layer},0:00:00.00,0:01:31.00,${style},,0,0,0,,${value}`)
  const palette = ['355848','865435','59405E','7B5940']
  const tint = palette[(order - 1) % palette.length]
  const shape = (color: string, motion: string, polygon: string) =>
    add(0, 'Body', `{\\an7\\bord0\\shad0\\1c&H${color}&${motion}\\p1}${polygon}{\\p0}`)
  if (!hasMedia) {
    shape(tint, '\\move(-110,200,-40,160,0,700)', 'm 0 0 l 520 54 450 535 0 600')
    // Layered file jackets, circular counters and a stepped diagram alternate by scene.
    if (order % 3 === 1) {
      shape('72B7CF','\\move(220,400,175,365,130,800)','m 0 0 l 110 0 137 32 390 32 376 278 12 310')
      shape('AAD9E9','\\move(130,520,160,445,300,1050)','m 0 20 l 392 0 356 229 24 250')
    } else if (order % 3 === 2) {
      for (let i = 0; i < 5; i++) {
        const x = 130 + (i % 3) * 120, y = 330 + Math.floor(i / 3) * 125
        shape('AAD9E9',`\\move(${x},${y+75},${x},${y},${i*125},${600+i*125})`,
          'm 50 0 b 78 0 100 22 100 50 b 100 78 78 100 50 100 b 22 100 0 78 0 50 b 0 22 22 0 50 0')
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const h = 60 + 55 * i, x = 160 + 78 * i
        shape('AAD9E9',`\\move(${x},${650-h+40},${x},${650-h},${i*150},${650+i*150})`,`m 0 0 l 60 0 60 ${h} 0 ${h}`)
      }
    }
  }
  shape('EEE8DE','\\move(0,720,0,695,0,500)','m 0 35 l 180 18 245 27 490 0 720 17 720 585 0 585')
  add(1,'Title',`{\\an8\\move(360,785,360,752,0,600)}${clean(heading)}`)
  add(1,'Body',`{\\an8\\pos(360,955)}${clean(caption)}`)
  if (simulation) add(2,'Label','{\\an8\\pos(360,72)}PLANNING SCENARIO')
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,DejaVu Serif,50,&H0028231E,&H0,&H0,&H0,-1,0,0,0,100,100,0,0,1,0,0,8,55,55,0,1
Style: Body,DejaVu Sans,31,&H0028231E,&H0,&H0,&H0,0,0,0,0,100,100,0,0,1,0,0,8,64,64,0,1
Style: Label,DejaVu Sans,23,&H00FFFFFF,&H0,&H00382C24,&H00382C24,-1,0,0,0,100,100,1,0,3,8,0,8,40,40,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`
}
