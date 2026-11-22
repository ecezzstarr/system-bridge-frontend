import type {ImgHTMLAttributes} from 'react'

/** Both faces share dimensions so a neutral viewpoint reconstructs the source image. */
export function BuildingRelief(props:ImgHTMLAttributes<HTMLImageElement>){
  return <span data-weave-relief-frame="">
    <img {...props}/>
    <img {...props} alt="" aria-hidden="true" data-weave-near-face=""/>
  </span>
}
