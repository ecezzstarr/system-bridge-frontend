/**
 * WEAVE Video Ad Studio · Real Texture render looks.
 *
 * These filters work on actual licensed photographs and filmed footage. They
 * do not synthesize customers, orders, recordings or photorealistic people.
 * Real footage should be preferred to stills for convincing work demos.
 */
export type WeaveVideoLook='natural'|'documentary'|'cinematic'
export type WeaveTextureFrame={
  assetType:'image'|'video'
  visualStyle?:string
  durationSeconds:number
  fontPath:string
  textPath:string
  demoMode:boolean
}
export function weaveRealTextureFilter(input:WeaveTextureFrame):string{
  const look:WeaveVideoLook=
    input.visualStyle==='cinematic'?'cinematic':
    input.visualStyle==='documentary'?'documentary':'natural'
  // Real videos preserve camera movement and are normalized to full-size
  // mobile portrait. Stills receive gentle optical motion, not an invented 3D
  // person or 3D scene. Limit export work to 720p on current self-hosted CPU.
  const framing=input.assetType==='image'
    ? [
      'scale=900:1600:force_original_aspect_ratio=increase',
      'crop=900:1600',
      "zoompan=z='min(zoom+0.00045,1.07)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1280:fps=30",
      'setsar=1',
    ]
    : [
      'scale=720:1280:force_original_aspect_ratio=increase',
      'crop=720:1280',
      'fps=30',
      'setsar=1',
    ]
  const grade=look==='cinematic'
    ? ['eq=contrast=1.075:saturation=1.12:brightness=-0.006','noise=alls=3:allf=t','vignette=angle=PI/7']
    : look==='documentary'
      ? ['eq=contrast=1.035:saturation=1.055:brightness=0.004','noise=alls=2:allf=t']
      : ['eq=contrast=1.012:saturation=1.025:brightness=0.002']
  const duration=Math.max(1,Math.min(90,Number(input.durationSeconds)||1))
  const captions=[
    // Keep text below faces, hands and the actual products being filmed.
    'drawbox=x=0:y=ih*0.79:w=iw:h=ih*0.21:color=black@0.38:t=fill',
    `drawtext=fontfile=${input.fontPath}:textfile=${input.textPath}:fontcolor=white:fontsize=35:line_spacing=9:x=(w-text_w)/2:y=h*0.85:box=1:boxcolor=black@0.08:boxborderw=16`,
  ]
  const simulation=input.demoMode?[
    'drawbox=x=0:y=0:w=iw:h=70:color=black@0.68:t=fill',
    `drawtext=fontfile=${input.fontPath}:text='SIMULATION - NOT ACTUAL EARNINGS':fontcolor=white:fontsize=20:x=(w-text_w)/2:y=25`,
  ]:[]
  return [...framing,...grade,...captions,...simulation,
    'fade=t=in:st=0:d=0.24',
    `fade=t=out:st=${Math.max(0,duration-0.24)}:d=0.24`,
  ].join(',')
}
