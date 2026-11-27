/** Deterministic, bounded source edit application. Never executes generated code. */
export type EightSourceEdit={before:string;after:string}
export function applyEightSourceEdits(source:string,raw:unknown):string{
 if(!Array.isArray(raw)||raw.length<1||raw.length>12)throw Error('Eight must return one to twelve precise source edits')
 let result=source
 for(const edit of raw){
  if(!edit||typeof edit.before!=='string'||typeof edit.after!=='string'||!edit.before.length||edit.before===edit.after)
   throw Error('Each edit must identify exact existing text and a different replacement')
  const index=result.indexOf(edit.before)
  if(index<0||result.indexOf(edit.before,index+1)>=0)throw Error('Eight returned a missing or ambiguous source anchor; refine the instruction')
  result=result.slice(0,index)+edit.after+result.slice(index+edit.before.length)
  if(result.length>96*1024)throw Error('Proposed source exceeds the workshop limit')
 }
 if(result===source||!result.trim())throw Error('Eight did not produce a valid change')
 return result
}
