export type ProspectSituation='observing'|'no_reply'|'conversation'|'need'|'agreed'|'declined'
export function hopeSearchTerms(industry:string,place:string){
 const subject=industry.trim().replace(/\s+/g,' ').slice(0,80)
 const area=place.trim().replace(/\s+/g,' ').slice(0,80)
 if(!subject)return []
 return [...new Set([
  [subject,area].filter(Boolean).join(' '),
  [subject,'small business',area].filter(Boolean).join(' '),
  [subject,'orders',area].filter(Boolean).join(' '),
  [subject,'business owner',area].filter(Boolean).join(' '),
 ])]
}
export function hopeNextAction(situation:ProspectSituation){
 switch(situation){
  case 'observing':return 'Watch the publication, read its context and respond naturally if you have something relevant to contribute. No sales pitch is required.'
  case 'no_reply':return 'Continue with other relevant accounts or your own publication. Do not repeat the same comment or send unsolicited repeated messages.'
  case 'conversation':return 'Listen and contribute to the discussion. If a business subject arises naturally, ask a useful question; do not force a sale.'
  case 'need':return 'Confirm the business need and ask whether the person wants to explore a suitable Weave system or File Folder preview.'
  case 'agreed':return 'Record the public handle, actual business need, agreed next action and follow-up date in Hope. Use Bridge AI or the appropriate File Folder preview when useful.'
  case 'declined':return 'Respect the decision. Do not pursue the person. Continue your work elsewhere.'
 }
}
export function hopeWorkDirection(record:{target:number;reviewed:number;pending:number;due:number;assigned:boolean}|null){
 if(!record?.assigned)return 'Read the current company event, prepare your publication and search naturally. Ask your Regional Manager for an active assignment before submitting work.'
 if(record.due>0)return 'Return to your due, agreed prospect follow-ups before starting additional conversations.'
 if(record.target>record.reviewed+record.pending)return 'Prepare and publish a relevant original post in your own TikTok app, then submit its public link for review.'
 if(record.pending>0)return 'Your submitted publication awaits review. Continue meaningful participation and check for feedback; pending work is not verified.'
 return 'Continue genuine participation, check your conversations and follow the current company direction. Do not invent extra activity to fill a target.'
}
