export type BroadcastMedium='radio'|'tv'|'stream'
export type PublicWorldDoor={slug:string;name:string;branding:string;logoUrl:string|null;preset:string;level:'door'|'storefront'|'market_hall';sign:string;tagline:string;offers:number;channel:null|{slug:string;live:boolean;title:string;programs:{id:string;title:string;medium:BroadcastMedium;scheduledAt:string|null;status:string}[]}}
export function doorWorldPosition(index:number):[number,number,number]{
  const ring=Math.floor(index/12),angle=(index%12)/12*Math.PI*2
  return [Math.sin(angle)*(14+ring*9),0,-Math.cos(angle)*(14+ring*9)]
}
export function broadcastMedium(value:unknown):BroadcastMedium{return value==='radio'||value==='tv'?value:'stream'}
export function publicWorldDoor(row:any):PublicWorldDoor{
  const config=row.environment_config||{}
  return {slug:String(row.public_slug),name:String(row.name||'Client Enterprise'),branding:String(row.description||config.featuredMessage||''),logoUrl:typeof config.logoUrl==='string'&&/^https:\/\//i.test(config.logoUrl)?config.logoUrl:null,preset:String(config.preset||'radiant_arcade'),level:row.has_market_hall?'market_hall':row.has_storefront?'storefront':'door',sign:String(config.sign||'Customer Door'),tagline:String(config.tagline||''),offers:Number(row.offer_count||0),channel:row.channel_slug?{slug:String(row.channel_slug),live:Boolean(row.is_live),title:String(row.live_title||row.channel_name||''),programs:(row.programs||[]).map((p:any)=>({id:String(p.id),title:String(p.title),medium:broadcastMedium(p.broadcast_medium),scheduledAt:p.scheduled_at||null,status:String(p.status)}))}:null}
}
