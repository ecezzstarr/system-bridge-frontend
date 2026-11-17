/**
 * Verified product names and withdrawal conditions from providers' public pages.
 * These are educational comparisons, not partner accounts or rate guarantees.
 * No APR is embedded: customers must use their own bank-confirmed rate.
 */
export const SUNSHINE_BANK_PRODUCTS=[
  {
    id:'ecobank_super_savers',bank:'Ecobank Nigeria',name:'SuperSavers',
    payout:'Interest credited monthly',liquidity:'Two monthly withdrawals retain the enhanced rate; fifth withdrawal forfeits interest.',
    rule:'two_monthly',source:'https://www.ecobank.com/ng/personal-banking/super-savers',
    monthlyIncomeSuitable:true
  },
  {
    id:'ecobank_all_savings',bank:'Ecobank Nigeria',name:'All Savings',
    payout:'Savings interest subject to current bank terms',liquidity:'A higher-rate qualification may permit up to four monthly withdrawals; verify current terms.',
    rule:'four_monthly',source:'https://ecobank.com/ng/personal-banking/everyday-banking/savings-accounts',
    monthlyIncomeSuitable:true
  },
  {
    id:'opay_owealth',bank:'OPay Microfinance Bank',name:'OWealth',
    payout:'Daily interest',liquidity:'Withdraw anytime; interest rate displayed in OPay app.',
    rule:'flexible',source:'https://cname.opayweb.com/',
    monthlyIncomeSuitable:true
  },
  {
    id:'opay_safebox',bank:'OPay',name:'SafeBox',
    payout:'Product-specific interest',liquidity:'Quarterly free redemption window; early redemption conditions apply.',
    rule:'quarterly_window',source:'https://static.opayweb.com/terms-and-conditions',
    monthlyIncomeSuitable:false
  },
  {
    id:'palmpay_cashbox',bank:'PalmPay',name:'CashBox',
    payout:'Daily interest',liquidity:'Free withdrawals at any time according to product terms.',
    rule:'flexible',source:'https://h5.palmpay.app/h5/cash-box/introduction-palmpay?channelName=Meta',
    monthlyIncomeSuitable:true
  },
  {
    id:'moniepoint_flexible',bank:'Moniepoint Microfinance Bank',name:'Flexible Savings',
    payout:'Interest accrues daily; accessible monthly',liquidity:'Withdraw anytime without losing accrued interest.',
    rule:'flexible',source:'https://www.moniepoint.com/ng/savings/flexible-savings',
    monthlyIncomeSuitable:true
  },
  {
    id:'fairmoney_fairsave',bank:'FairMoney',name:'FairSave',
    payout:'Interest accrues daily',liquidity:'Withdraw anytime without penalties, subject to current terms.',
    rule:'flexible',source:'https://fairmoney.io/Savings',
    monthlyIncomeSuitable:true
  },
  {
    id:'kuda_flexible',bank:'Kuda Microfinance Bank',name:'Flexible / Save Frequently',
    payout:'Interest under a goal and tenor',liquidity:'Early withdrawals can forfeit accrued interest; check account terms.',
    rule:'tenor_restricted',source:'https://help.kuda.com/en/articles/8954651-savings-faqs',
    monthlyIncomeSuitable:false
  },
  {
    id:'access_hida',bank:'Access Bank',name:'High Interest Deposit Account',
    payout:'Daily accrual, payable monthly',liquidity:'Tiered balance-rate qualification; use latest rates guide.',
    rule:'bank_specific',source:'https://www.accessbankplc.com/Rates-Guide/',
    monthlyIncomeSuitable:true
  },
  {
    id:'stanbic_maxyield',bank:'Stanbic IBTC Bank',name:'MaxYield',
    payout:'Interest paid monthly',liquidity:'More than one withdrawal per month reduces interest; fifth forfeits interest.',
    rule:'one_monthly_bonus',source:'https://www.stanbicibtcbank.com/nigeriabank/personal/products-and-services/grow/savings-accounts/see-all-accounts/max-yield-account',
    monthlyIncomeSuitable:true
  },
  {
    id:'union_unionsilver',bank:'Union Bank',name:'UnionSilver Savings',
    payout:'Tiered interest based on daily balance',liquidity:'Confirm withdrawal conditions and current rate with the bank.',
    rule:'bank_specific',source:'https://www.unionbankng.com/services/personal-banking/account//savings-and-investment/',
    monthlyIncomeSuitable:true
  },
  {
    id:'other_savings',bank:'Another bank',name:'Interest-bearing savings account',
    payout:'See the bank contract',liquidity:'Follow the bank contract; Weave uses a voluntary two-withdrawal discipline target.',
    rule:'bank_specific',source:null,
    monthlyIncomeSuitable:true
  }
] as const

export type SunshineBankProductId=typeof SUNSHINE_BANK_PRODUCTS[number]['id']
export function sunshineBankProduct(id:string){
  return SUNSHINE_BANK_PRODUCTS.find(product=>product.id===id)||null
}
export const SUNSHINE_PERSONAL_WITHDRAWAL_GOAL=2
