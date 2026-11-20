/**
 * A first-principles worksheet for a simplified, statically determinate beam.
 * This is a learning aid, not a bridge design, structural certification or a
 * substitute for code-compliant analysis by a qualified engineer.
 */
export type SimpleBeamStudyInput={
  spanMetres:number
  uniformLoadKnPerMetre:number
  midspanPointLoadKn:number
}
export type SimpleBeamStudyResult={
  totalLoadKn:number
  reactionAtEachSupportKn:number
  maximumShearKn:number
  maximumMomentKnMetres:number
}
export function calculateSimpleBeamStudy(input:SimpleBeamStudyInput):SimpleBeamStudyResult {
  const {spanMetres:L,uniformLoadKnPerMetre:q,midspanPointLoadKn:P}=input
  if(!Number.isFinite(L)||L<=0||L>1000)throw new Error('Span must be greater than 0 m and no more than 1,000 m.')
  if(!Number.isFinite(q)||q<0||q>100000)throw new Error('Uniform load must be between 0 and 100,000 kN/m.')
  if(!Number.isFinite(P)||P<0||P>100000)throw new Error('Midspan point load must be between 0 and 100,000 kN.')
  return {
    totalLoadKn:q*L+P,
    reactionAtEachSupportKn:(q*L+P)/2,
    maximumShearKn:(q*L+P)/2,
    maximumMomentKnMetres:q*L*L/8+P*L/4,
  }
}
export function beamStudyNote(title:string,input:SimpleBeamStudyInput,result:SimpleBeamStudyResult){
  const n=(v:number)=>v.toFixed(3)
  return [
    'WEAVE | School Project · Preliminary Beam Study',
    'Project: '+title,
    'Model: simply supported beam; two idealized pin/roller supports; uniform load across full span; optional single point load at midspan.',
    'Span (m): '+n(input.spanMetres),
    'Uniform load (kN/m): '+n(input.uniformLoadKnPerMetre),
    'Midspan point load (kN): '+n(input.midspanPointLoadKn),
    'Total applied vertical load (kN): '+n(result.totalLoadKn),
    'Vertical reaction at each support (kN): '+n(result.reactionAtEachSupportKn),
    'Maximum absolute shear (kN): '+n(result.maximumShearKn),
    'Maximum positive bending moment (kN·m): '+n(result.maximumMomentKnMetres),
    'Equations: R=(qL+P)/2; Vmax=R; Mmax=qL²/8+PL/4.',
    'Assumptions: linear static analysis, symmetric loading, no horizontal forces; deflection, buckling, material strength, fatigue, foundations, dynamic/water/wind/seismic loads and construction sequence NOT checked.',
    'Educational screening calculation only. Not a final design, approved drawing, safety clearance, academic validation or evidence of a constructed bridge. Independent code-compliant design and supervisor/professional verification required.',
  ].join('\n')
}
