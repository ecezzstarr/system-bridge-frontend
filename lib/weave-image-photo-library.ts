/**
 * Documentary photographs of actual products for WEAVE branding previews.
 * These are explicitly attributed, free Unsplash photographs, not AI renders.
 * They are illustrative base photographs for transformed, branded outputs.
 * They do not establish that WEAVE or the participant owns physical stock.
 *
 * Remote image availability and cross-origin canvas permissions are checked
 * in the editor; users can replace the source with their OWN product photo.
 * The SVG catalogue remains an offline fallback and a separate vector product.
 */
export type WeavePhotoReference={
  sampleId:string;url:string;source:string;credit:string;subject:string;printZone?:{x:number;y:number;width:number;height:number}
}
const img=(id:string)=>'https://images.unsplash.com/'+id+'?auto=format&fit=crop&w=1080&h=1350&q=86'
const photoRefs:WeavePhotoReference[]=[
 {sampleId:'brand-tee-classic',url:img('photo-1581655353564-df123a1eb820'),source:'https://unsplash.com/photos/white-crew-neck-t-shirt-acn5ERAeSb4',credit:'Haryo Setyadi / Unsplash',subject:'Actual white cotton T-shirt on a hanger',printZone:{x:340,y:400,width:375,height:330}},
 {sampleId:'brand-tee-limited',url:img('photo-1581655353564-df123a1eb820'),source:'https://unsplash.com/photos/white-crew-neck-t-shirt-acn5ERAeSb4',credit:'Haryo Setyadi / Unsplash',subject:'Real cotton shirt photographed on a hanger',printZone:{x:340,y:400,width:375,height:330}},
 {sampleId:'brand-hoodie-studio',url:img('photo-1571273134620-1ef375de9b84'),source:'https://unsplash.com/photos/white-drawstring-jeans-and-hoodie-on-hanger-dVMu8MDBqlY',credit:'Korie Cull / Unsplash',subject:'Real hoodie on a clothes hanger',printZone:{x:350,y:425,width:345,height:280}},
 {sampleId:'brand-tote-atelier',url:img('photo-1780480999314-b82a1f2f9de6'),source:'https://unsplash.com/photos/white-canvas-tote-bag-with-purple-handles-and-yellow-base-HKOKxYK1FmY',credit:'Caesar Akbar / Unsplash',subject:'Real canvas tote with purple handles',printZone:{x:347,y:485,width:358,height:330}},
 {sampleId:'brand-cap-original',url:img('photo-1645266729222-17cd32e06fd0'),source:'https://unsplash.com/photos/a-yellow-baseball-cap-on-a-white-background-8XZBP38QJFM',credit:'sonu kumar / Unsplash',subject:'Real yellow baseball cap on a white background',printZone:{x:405,y:490,width:295,height:190}},
 {sampleId:'brand-mug-personal',url:img('photo-1504624855736-54c752430304'),source:'https://unsplash.com/photos/white-mug-against-white-background-ORo_hNxd4Ks',credit:'Brunxs / Unsplash',subject:'Real plain ceramic mug on white',printZone:{x:395,y:610,width:345,height:255}},
 {sampleId:'brand-package-box',url:img('photo-1597514402413-17eac2b501c0'),source:'https://unsplash.com/photos/brown-cardboard-box-on-white-table-OVVsdKrjkEY',credit:'Anna Hill / Unsplash',subject:'Real cardboard packing box',printZone:{x:405,y:460,width:315,height:310}},
 {sampleId:'brand-record-release',url:img('photo-1608321632050-4ad4a4a74ae5'),source:'https://unsplash.com/photos/vinyl-record-on-vinyl-record-buEB6_2qArw',credit:'Joyce G / Unsplash',subject:'Real vinyl record photography',printZone:{x:390,y:520,width:310,height:315}},
 {sampleId:'hydration-studio',url:'/weave-food/electrolyte.jpeg',source:'/weave-food/electrolyte.jpeg',credit:'WEAVE original product photograph',subject:'WEAVE Electrolyte product'},
 {sampleId:'fresh-supply',url:'/weave-food/agility.jpeg',source:'/weave-food/agility.jpeg',credit:'WEAVE original product photograph',subject:'WEAVE Agility product'},
]
export const WEAVE_PHOTOGRAPHIC_TEMPLATES=photoRefs.filter(x=>x.printZone)
export function photoForSample(id:string):WeavePhotoReference|null{return photoRefs.find(x=>x.sampleId===id)||null}
export function photoRequiresUserProductImage(id:string):boolean{return id==='brand-phonecase-studio'}
