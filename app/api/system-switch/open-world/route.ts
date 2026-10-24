import {GET as readVerifiedClientDomains} from '@/app/api/events/flame/open-world/route'

export const dynamic='force-dynamic'

/** System Switch is the permanent Weave Open World container.
 * The event compatibility endpoint retains the same verified public data.
 */
export const GET=readVerifiedClientDomains
