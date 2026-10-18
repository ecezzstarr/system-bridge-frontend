/**
 * Platform projects are Client-owned construction plans, not packaged copies
 * of third-party services. A stage points to a real WEAVE blueprint; completing
 * a stage means a Client-owned system was commissioned, not that a TikTok/X/
 * Facebook-scale hosted product has been magically provisioned.
 */
export const FILE_FOLDER_PLATFORM_TEMPLATES = {
  short_video: {
    name: 'Short-video platform',
    example: 'Video discovery and creator community',
    description: 'Plan your own creator video product. Public uploads, recommendations, moderation, hosting and media processing need separate implementation before launch.',
    stages: ['customer_door','mobile_service_app','creator_booth','broadcast_studio','streaming_gate','media_network','campaign_system'],
    productionGap: 'User-created video upload, transcoding, storage, playback, recommendation ranking, account safety and public feed are not yet provisioned by these builds.',
  },
  microblog: {
    name: 'Public conversation platform',
    example: 'Posts, discussions and public timelines',
    description: 'Start a Client-owned conversation network. Social identities, public posts, follow graphs, timelines and moderation require additional working software.',
    stages: ['customer_door','mobile_service_app','data_room','campaign_system','integration_network','operations_suite'],
    productionGap: 'A public posting API, authentication for your members, follow graph, delivery feed, moderation and notifications are not yet included.',
  },
  social_community: {
    name: 'Social community platform',
    example: 'Profiles, groups and community spaces',
    description: 'Build the systems around a Client-owned social community; groups, messaging, feed and identity products must be developed and tested as operating software.',
    stages: ['customer_door','mobile_service_app','data_room','operations_suite','campaign_system','integration_network'],
    productionGap: 'Member profiles, friend/group graphs, feeds, messages, media safety, privacy controls and public signup still need dedicated implementation.',
  },
  video_channel: {
    name: 'Video and live platform',
    example: 'Channels, broadcasts and creator programs',
    description: 'Develop a Client-owned media service using the existing creator and public stream infrastructure.',
    stages: ['customer_door','creator_booth','broadcast_studio','streaming_gate','media_network','mobile_service_app'],
    productionGap: 'A general public on-demand upload service, transcoding, playback CDN, creator memberships and recommendation feed are not provided automatically.',
  },
  commerce_platform: {
    name: 'Multi-seller marketplace',
    example: 'A Client-owned platform for offers and orders',
    description: 'Develop a commerce platform using the existing Customer Door, store and marketplace construction and operating records.',
    stages: ['customer_door','commerce_storefront','marketplace_network','payments_gateway','route_station'],
    productionGap: 'Full marketplace settlement, seller onboarding, fraud controls and payment integration require explicit implementation and verification.',
  },
  custom_platform: {
    name: 'Original platform',
    example: 'A platform designed from your idea',
    description: 'Name your idea and construct the first operating components. You choose the future development path.',
    stages: ['customer_door','operations_board','mobile_service_app','integration_network'],
    productionGap: 'A custom public product, production hosting and its unique features still require design, integration and technical validation.',
  },
} as const

export type FileFolderPlatformKind = keyof typeof FILE_FOLDER_PLATFORM_TEMPLATES
export type FileFolderPlatformProject = {
  id:string
  client_id:string
  file_number:string
  kind:FileFolderPlatformKind
  title:string
  purpose:string|null
  created_at:string
  updated_at:string
}
export function isFileFolderPlatformKind(value:unknown):value is FileFolderPlatformKind{
  return typeof value==='string' && Object.hasOwn(FILE_FOLDER_PLATFORM_TEMPLATES,value)
}

type BuildRef={blueprint_key?:string;status?:string;title?:string;id?:string}
type SystemRef={system_type?:string;status?:string;title?:string;id?:string;configuration?:{blueprintKey?:string}}

export function platformProjectProgress(
  project:Pick<FileFolderPlatformProject,'kind'>,
  builds:readonly BuildRef[],
  systems:readonly SystemRef[],
  catalog:readonly {blueprint_key:string;name?:string;published?:boolean}[]=[]
){
  const blueprintNames=new Map(catalog.map(b=>[b.blueprint_key,b.name||b.blueprint_key]))
  const stages=FILE_FOLDER_PLATFORM_TEMPLATES[project.kind].stages.map((key)=>{
    const built=systems.find(s=>s.status==='active'&&(s.configuration?.blueprintKey===key||s.system_type===key))
    const pending=builds.find(b=>b.blueprint_key===key&&b.status==='building')
    return {
      blueprintKey:key,
      label:blueprintNames.get(key)||key.replaceAll('_',' '),
      status:built?'operating' as const:pending?'building' as const:'not_started' as const,
      buildId:pending?.id||null,
      systemId:built?.id||null,
    }
  })
  return {
    stages,
    completed:stages.filter(s=>s.status==='operating').length,
    total:stages.length,
    // Reaching the blueprint milestones does not establish that a complete
    // third-party-scale social platform is ready for public launch.
    technicalLaunchVerified:false as const,
  }
}
