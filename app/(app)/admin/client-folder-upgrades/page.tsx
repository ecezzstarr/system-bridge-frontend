import {redirect} from 'next/navigation'
// Preserve the old route but prevent Administrations accidentally
// opening the superseded personal-loan collection console.
export default function LegacyProUpgradeRedirect(){redirect('/admin/pro-activations')}
