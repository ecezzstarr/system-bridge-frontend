import { HOPE_VIDEO_FILTERS } from '@/lib/hope-video-filter-catalog'

/**
 * Fixed, one-time product collections. A purchase buys the named effects below,
 * not future effects added to the catalogue. Prices are server-controlled.
 */
export const HOPE_STUDIO_BUNDLES = [
  {
    id:'studio-starter',
    name:'Studio Starter',
    description:'A professional first impression for live outreach.',
    priceSystemSwitch:36,
    filterIds:['scene-executive-suite','scene-white-citadel','scene-creative-studio','radiance-warm','background-hide'],
    featured:false,
  },
  {
    id:'presence-pro',
    name:'Presence Pro',
    description:'Premium meeting settings and a signature digital appearance.',
    priceSystemSwitch:82,
    filterIds:[
      'scene-executive-suite','scene-white-citadel','scene-golden-hall',
      'scene-creative-studio','scene-library-of-time','scene-city-rooftop',
      'scene-sky-garden','scene-warm-lounge','radiance-warm','studio-light',
      'ocean-cool','cinema-noir','background-hide','face-gold-mask',
    ],
    featured:true,
  },
  {
    id:'full-studio',
    name:'Full Studio Collection',
    description:'Own all 28 current premium looks, backgrounds and synthetic face masks.',
    priceSystemSwitch:165,
    filterIds:HOPE_VIDEO_FILTERS.map(filter=>filter.id),
    featured:false,
  },
] as const

export type HopeStudioBundle=typeof HOPE_STUDIO_BUNDLES[number]
export function getHopeStudioBundle(value:unknown):HopeStudioBundle|undefined {
  return HOPE_STUDIO_BUNDLES.find(bundle=>bundle.id===value)
}

export function quoteHopeStudioBundle(bundle:HopeStudioBundle,owned:Iterable<string>){
  const ownedSet=new Set(owned)
  const missingIds=bundle.filterIds.filter(id=>!ownedSet.has(id))
  const totalValue=bundle.filterIds.reduce((total,id)=>{
    const filter=HOPE_VIDEO_FILTERS.find(item=>item.id===id)
    if(!filter)throw new Error('Studio pack references an unknown product')
    return total+filter.priceSystemSwitch
  },0)
  const missingListValue=missingIds.reduce((total,id)=>
    total+(HOPE_VIDEO_FILTERS.find(item=>item.id===id)?.priceSystemSwitch||0),0)
  // Never charge for effects the buyer already owns. Offer the same bundle rate
  // proportional to missing licensed effects; never exceed standalone prices.
  const charge=missingIds.length?Math.max(1,Math.min(missingListValue,
    Math.ceil(bundle.priceSystemSwitch*missingListValue/totalValue))):0
  return {
    bundleId:bundle.id,missingIds,
    remaining:missingIds.length,total:bundle.filterIds.length,
    listValue:totalValue,remainingListValue:missingListValue,
    chargedSystemSwitch:charge,savedSystemSwitch:Math.max(0,missingListValue-charge),
  }
}
