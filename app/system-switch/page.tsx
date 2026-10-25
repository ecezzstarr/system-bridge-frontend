import {redirect} from 'next/navigation'

/** System Switch — Bridge of Radiance IS the permanent WEAVE Open World.
 * The previous extra Burning River gate is retired; legacy position links
 * resolve directly to the same live WEAVE land.
 */
export default function SystemSwitchPage(){
  redirect('/system-switch/world?via=system-switch')
}
