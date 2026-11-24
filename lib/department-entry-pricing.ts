export const DEPARTMENT_ENTRY_TICKET_PRICES_USD = {
  AGENT: 5,
  BRIDGER: 10,
} as const

export type DepartmentEntryRole = keyof typeof DEPARTMENT_ENTRY_TICKET_PRICES_USD

export function departmentEntryTicketPrice(department: DepartmentEntryRole): number {
  return DEPARTMENT_ENTRY_TICKET_PRICES_USD[department]
}
