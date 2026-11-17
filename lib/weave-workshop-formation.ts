/**
 * Administration Formation Foundry: a deterministic source blueprint compiler.
 *
 * Natural-language cadence is treated as project content, never executable
 * instructions. The browser receives reviewable TSX only; source writes still
 * go through the Code Workshop draft/PR/CI controls.
 */
export type WeaveFormationKind = 'glass-page' | 'glass-world' | 'glass-component'

export type WeaveFormationInput = {
  kind: WeaveFormationKind
  name: string
  cadence: string
}

export type WeaveFormationDraft = {
  kind: WeaveFormationKind
  path: string
  content: string
  title: string
  slug: string
}

function boundedText(value: unknown, max: number) {
  return String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max)
}

export function weaveFormationSlug(name: string) {
  const normalized = boundedText(name, 90).normalize('NFKD')
    .toLowerCase().replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56)
  if (!normalized || !/^[a-z][a-z0-9-]*$/.test(normalized) ||
    ['api', 'admin', 'auth', 'login', 'client', 'agent', 'bridger', 'system'].includes(normalized)) {
    throw new Error('Give the workshop a name beginning with a letter.')
  }
  return normalized
}

function textLiteral(value: string) {
  // JSON string syntax inside a JSX expression is inert display text.
  return '{' + JSON.stringify(value) + '}'
}

export function buildWeaveFormationDraft(input: WeaveFormationInput): WeaveFormationDraft {
  const title = boundedText(input.name, 90)
  const cadence = boundedText(input.cadence, 1200)
  if (!title || cadence.length < 12) {
    throw new Error('Enter a workshop name and at least 12 characters of purpose/cadence.')
  }
  const slug = weaveFormationSlug(title)
  const heading = textLiteral(title)
  const purpose = textLiteral(cadence)
  const kind = input.kind
  if (!['glass-page', 'glass-world', 'glass-component'].includes(kind)) {
    throw new Error('Choose an approved Weave formation blueprint.')
  }

  let path: string
  let content: string

  if (kind === 'glass-world') {
    path = 'app/weave-labs/' + slug + '/page.tsx'
    content = [
      "'use client'",
      "import {Canvas} from '@react-three/fiber'",
      "import {OrbitControls} from '@react-three/drei'",
      "",
      "/** Standalone visual prototype. Not a purchased File Folder or a Client entitlement. */",
      "export default function WeaveGlassWorld() {",
      " return <main className=\"min-h-dvh bg-[#061522] px-4 py-10 text-slate-50\">",
      "  <div className=\"mx-auto max-w-6xl\">",
      "   <p className=\"text-xs font-semibold uppercase tracking-[.2em] text-cyan-300\">WEAVE · Formation Laboratory · 3D</p>",
      "   <h1 className=\"mt-3 text-3xl font-bold sm:text-5xl\">" + heading + "</h1>",
      "   <p className=\"mt-3 max-w-3xl text-sm leading-7 text-slate-300\">" + purpose + "</p>",
      "   <div className=\"mt-8 h-[min(65vh,600px)] min-h-[360px] overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#0c2339]\">",
      "    <Canvas camera={{position:[7,5,11],fov:43}} dpr={[1,1.5]} shadows>",
      "     <color attach=\"background\" args={['#0c2339']}/>",
      "     <ambientLight intensity={1.15}/>",
      "     <directionalLight position={[6,10,5]} intensity={2.4} castShadow/>",
      "     <pointLight position={[-4,5,-2]} color=\"#6cddff\" intensity={28}/>",
      "     <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-.12,0]}>",
      "      <planeGeometry args={[30,30]}/>",
      "      <meshStandardMaterial color=\"#142f45\" roughness={.65}/>",
      "     </mesh>",
      "     {[-3,0,3].map((x,i)=><group key={x} position={[x,0,0]}>",
      "      <mesh castShadow receiveShadow position={[0,1.2+i*.4,0]}>",
      "       <boxGeometry args={[1.8,2.4+i*.8,1.7]}/>",
      "       <meshPhysicalMaterial color=\"#8fdcff\" metalness={.2} roughness={.12} transmission={.35} transparent opacity={.77} clearcoat={1}/>",
      "      </mesh>",
      "      <mesh position={[0,2.5+i*.8,0]}>",
      "       <boxGeometry args={[2,.16,1.9]}/>",
      "       <meshStandardMaterial color=\"#edc67b\" metalness={.7} roughness={.22}/>",
      "      </mesh>",
      "     </group>)}",
      "     <OrbitControls enablePan={false} minDistance={5} maxDistance={21} maxPolarAngle={Math.PI/2.1}/>",
      "    </Canvas>",
      "   </div>",
      "   <p className=\"mt-3 text-xs text-slate-400\">Concept architecture only. Connect to verified Client builds, ownership and permissions before use as a business world.</p>",
      "  </div>",
      " </main>",
      "}",
      "",
    ].join('\n')
  } else if (kind === 'glass-component') {
    const componentName = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Glass'
    path = 'components/weave-labs/' + componentName + '.tsx'
    content = [
      "/** Composable WEAVE glass-tech surface; no access to Client records or finance. */",
      "export default function " + componentName + "() {",
      " return <section className=\"relative overflow-hidden rounded-[2rem] border border-cyan-100/30 bg-gradient-to-br from-slate-900 via-[#123c54] to-slate-950 p-8 text-white shadow-2xl\">",
      "  <div aria-hidden=\"true\" className=\"pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl\"/>",
      "  <div className=\"relative rounded-[1.5rem] border border-white/20 bg-white/[.06] p-8 backdrop-blur-xl\">",
      "   <p className=\"text-xs font-bold uppercase tracking-widest text-cyan-200\">WEAVE · Glass System</p>",
      "   <h2 className=\"mt-4 text-3xl font-black\">" + heading + "</h2>",
      "   <p className=\"mt-4 max-w-2xl text-sm leading-7 text-slate-200\">" + purpose + "</p>",
      "  </div>",
      " </section>",
      "}",
      "",
    ].join('\n')
  } else {
    path = 'app/weave-labs/' + slug + '/page.tsx'
    content = [
      "/** WEAVE independent glass-page prototype; no privileged data dependencies. */",
      "export default function WeaveGlassPage() {",
      " return <main className=\"min-h-dvh bg-[#071726] px-4 py-12 text-white\">",
      "  <div className=\"mx-auto max-w-6xl\">",
      "   <p className=\"text-xs font-bold uppercase tracking-[.22em] text-amber-200\">WEAVE · Presence into form</p>",
      "   <div className=\"relative mt-6 overflow-hidden rounded-[2rem] border border-sky-200/25 bg-gradient-to-br from-[#123f59] via-[#0b253b] to-[#071726] p-8 shadow-2xl sm:p-14\">",
      "    <div aria-hidden=\"true\" className=\"pointer-events-none absolute -right-12 -top-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl\"/>",
      "    <div className=\"relative max-w-3xl rounded-[1.6rem] border border-white/20 bg-white/[.06] p-6 backdrop-blur-xl sm:p-10\">",
      "     <p className=\"text-xs font-semibold uppercase tracking-widest text-cyan-200\">Company of Time · Working prototype</p>",
      "     <h1 className=\"mt-4 text-3xl font-black tracking-tight sm:text-5xl\">" + heading + "</h1>",
      "     <p className=\"mt-5 text-sm leading-8 text-slate-200\">" + purpose + "</p>",
      "    </div>",
      "   </div>",
      "  </div>",
      " </main>",
      "}",
      "",
    ].join('\n')
  }
  return {kind, path, content, slug, title}
}
