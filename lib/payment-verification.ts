export function matchesVerifiedPayment(data: any, reference: string, expectedUsd: number): boolean {
 return data?.status === 'successful' && data?.tx_ref === reference && data?.currency === 'USD' &&
  Number.isFinite(expectedUsd) && expectedUsd > 0 && Number.isFinite(Number(data?.amount)) &&
  Math.abs(Number(data.amount) - expectedUsd) < 0.000001
}
