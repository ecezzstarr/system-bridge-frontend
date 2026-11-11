/** Current public names. Historical database keys and transaction values are separate. */
export function normalizeWeaveWording(text: string): string {
  return text
    .replace(/\bAdministration[’']s\b/g, 'Administrations’')
    .replace(/\bAdministration\b/g, 'Administrations')
    .replace(/\bADMINISTRATION\b/g, 'ADMINISTRATIONS')
    .replace(/\bBridge Radiance\b/g, 'Bridge of Radiance')
    .replace(/\bBRIDGE RADIANCE\b/g, 'BRIDGE OF RADIANCE')
    .replace(/\bFlame Coins?\b/g, 'System Switch')
    .replace(/\bFLAME COINS?\b/g, 'SYSTEM SWITCH')
}
