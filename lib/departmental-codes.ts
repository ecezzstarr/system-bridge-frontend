// Departmental Code System
// Maps departmental codes to user roles

export const DEPARTMENTAL_CODES = {
  HOPE: {
    code: 'HOPE',
    department: 'Bridger',
    role: 'mentor',
    description: 'Bridger - Connect and facilitate transactions',
    color: 'bg-blue-500/10 text-blue-700 border-blue-200',
  },
  STABILITY: {
    code: 'STABILITY',
    department: 'Agent',
    role: 'admin',
    description: 'Agent - Execute and manage operations',
    color: 'bg-purple-500/10 text-purple-700 border-purple-200',
  },
  MOVEMENT: {
    code: 'MOVEMENT',
    department: 'Client',
    role: 'user',
    description: 'Client - Participate in the ecosystem',
    color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  },
  CAT: {
    code: 'CAT',
    department: 'Admin',
    role: 'creator',
    description: 'Admin - Oversee and manage platform',
    color: 'bg-red-500/10 text-red-700 border-red-200',
  },
} as const

export type DepartmentalCode = keyof typeof DEPARTMENTAL_CODES
export type Role = 'admin' | 'user' | 'creator' | 'mentor'

export function validateDepartmentalCode(code: string): {
  valid: boolean
  role?: Role
  department?: string
  error?: string
} {
  const upperCode = code.toUpperCase().trim()
  
  if (!Object.keys(DEPARTMENTAL_CODES).includes(upperCode)) {
    return {
      valid: false,
      error: `Invalid code. Please verify your departmental code.`,
    }
  }

  const codeData = DEPARTMENTAL_CODES[upperCode as DepartmentalCode]
  return {
    valid: true,
    role: codeData.role,
    department: codeData.department,
  }
}

export function getCodeByRole(role: string): DepartmentalCode | null {
  for (const [code, data] of Object.entries(DEPARTMENTAL_CODES)) {
    if (data.role === role) {
      return code as DepartmentalCode
    }
  }
  return null
}

export function getAllCodes() {
  return Object.values(DEPARTMENTAL_CODES)
}
