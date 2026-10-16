import { ImageResponse } from 'next/og'
import { getAgentByCarrierFoodCode } from '@/lib/carrier-food'
import { AGILITY_RETAIL_UNIT_PRICE_NGN } from '@/lib/agility-catalog'
import { getWeaveFoodVariantEconomics } from '@/lib/weave-food-economics'

export const size={width:1200,height:630}
export const contentType='image/png'

export default async function Image({params}:{params:Promise<{code:string}>}){
  const {code}=await params
  const agent=await getAgentByCarrierFoodCode(code).catch(()=>null)
  const agentName=String(agent?.name||agent?.username||'WEAVE Agent')
  const agilityPrice=`₦${AGILITY_RETAIL_UNIT_PRICE_NGN.toLocaleString('en-NG')}`
  const small=getWeaveFoodVariantEconomics('electrolyte')
  const medium=getWeaveFoodVariantEconomics('electrolyte-medium')
  const smallPrice=`₦${Number(small?.agentSellingUnitPriceNgn||4000).toLocaleString('en-NG')}`
  const mediumPrice=`₦${Number(medium?.agentSellingUnitPriceNgn||6000).toLocaleString('en-NG')}`

  return new ImageResponse(
    <div style={{width:'1200px',height:'630px',display:'flex',flexDirection:'column',background:'#07100b',color:'white',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'34px 48px',borderBottom:'1px solid rgba(255,255,255,.14)'}}>
        <div style={{display:'flex',flexDirection:'column'}}>
          <div style={{fontSize:24,fontWeight:900,letterSpacing:'4px'}}>WEAVE FOOD</div>
          <div style={{fontSize:18,color:'#a7f3d0',marginTop:'5px'}}>Carrier Door · {agentName}</div>
        </div>
        <div style={{display:'flex',background:'#ffffff',color:'#07100b',padding:'14px 24px',fontSize:24,fontWeight:900}}>PAY AGENT · ORDER ONLINE</div>
      </div>
      <div style={{display:'flex',flex:1}}>
        <div style={{width:'50%',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'44px 48px',background:'linear-gradient(135deg,#6b2d08,#1a0d06)'}}>
          <div style={{display:'flex',flexDirection:'column'}}>
            <div style={{fontSize:18,fontWeight:800,letterSpacing:'3px',color:'#fdba74'}}>MORNING FOOD PACKAGE</div>
            <div style={{fontSize:72,fontWeight:950,color:'#fb923c',marginTop:'8px'}}>AGILITY</div>
            <div style={{fontSize:30,fontWeight:900,marginTop:'8px'}}>{agilityPrice} / pack</div>
            <div style={{fontSize:21,color:'#fed7aa',lineHeight:1.45,marginTop:'24px'}}>Egg · Bread · Butter · Akara · Pap · Sardines · Fruit · Water · Milk</div>
          </div>
          <div style={{display:'flex',fontSize:22,fontWeight:800,color:'#fff7ed'}}>Complete food. Ready to move.</div>
        </div>
        <div style={{width:'50%',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'44px 48px',background:'linear-gradient(135deg,#14532d,#07150c)'}}>
          <div style={{display:'flex',flexDirection:'column'}}>
            <div style={{fontSize:18,fontWeight:800,letterSpacing:'3px',color:'#86efac'}}>FRESH SLICED FOOD</div>
            <div style={{fontSize:60,fontWeight:950,color:'#bbf7d0',marginTop:'8px'}}>ELECTROLYTE</div>
            <div style={{display:'flex',gap:'16px',marginTop:'14px'}}><div style={{display:'flex',flexDirection:'column',padding:'12px 16px',border:'1px solid rgba(187,247,208,.35)'}}><span style={{fontSize:16,color:'#a7f3d0'}}>SMALL BOWL</span><span style={{fontSize:30,fontWeight:900}}>{smallPrice}</span></div><div style={{display:'flex',flexDirection:'column',padding:'12px 16px',border:'1px solid rgba(187,247,208,.35)'}}><span style={{fontSize:16,color:'#a7f3d0'}}>MEDIUM BOWL</span><span style={{fontSize:30,fontWeight:900}}>{mediumPrice}</span></div></div>
            <div style={{fontSize:19,color:'#d1fae5',lineHeight:1.45,marginTop:'22px'}}>Cucumber · Coconut · Avocado · Carrot · Sweet Corn · Greens · Beef · Fried Fish · Egg</div>
          </div>
          <div style={{display:'flex',fontSize:21,fontWeight:800,color:'#ecfdf5'}}>Far location? Food + waybill before order.</div>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'22px 48px',fontSize:20,background:'#030806'}}>
        <div style={{display:'flex',fontWeight:900}}>Open the Carrier Door · Buy without a WEAVE account</div>
        <div style={{display:'flex',color:'#94a3b8'}}>Or understand the Bridger position and join this Agent</div>
      </div>
    </div>,
    size
  )
}
