export const LOOP1_AGENT_REVEAL_KEY = 'weave:show-loop1-agent-ad'
export const AGILITY_AGENT_REVEAL_KEY = 'weave:show-agility-agent-ad'

export type WeaveRevealCampaign = {
  key:string
  eyebrow:string
  title:string
  body:string
  movement:string
  actionLabel?:string
  actionUrl?:string
}

export const AGENT_REVEAL_CAMPAIGNS:WeaveRevealCampaign[]=[
  {
    key:LOOP1_AGENT_REVEAL_KEY,
    eyebrow:'LOOP 1 · AGENT CONTINUANCE',
    title:'Bridgers move Prospects. Agents share the return.',
    body:'Eligible Prospect-package purchases by Bridgers attached to your Agent position produce the Agent return already recorded by WEAVE.',
    movement:'Prospect purchase → Agent share → Continuance record',
    actionLabel:'Open Continuance',
    actionUrl:'/agent/commissions',
  },
  {
    key:AGILITY_AGENT_REVEAL_KEY,
    eyebrow:'AGILITY · AGENT MOVEMENT',
    title:'Intelligence in Action.',
    body:'Agility is the Agent distribution movement: acquire organized morning-food boxes through WEAVE, move them to real customers, and preserve the return.',
    movement:'Acquire → distribute → sell → record return',
    actionLabel:'Open Agility',
    actionUrl:'/agility',
  },
]
