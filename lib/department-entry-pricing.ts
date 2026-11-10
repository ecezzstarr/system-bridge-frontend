/**
 * Official departmental entrance ticket prices in Weave's internal System Switch
 * accounting unit. This changes only NEW tickets; an already issued ticket
 * retains its own locked price and NGN payment quote.
 */
export const DEPARTMENT_ENTRY_TICKET_PRICES_SYSTEM_SWITCH = {
  AGENT: 5,
  BRIDGER: 8,
} as const

export type DepartmentEntryRole = keyof typeof DEPARTMENT_ENTRY_TICKET_PRICES_SYSTEM_SWITCH

export function departmentEntryTicketPrice(department: DepartmentEntryRole): number {
  return DEPARTMENT_ENTRY_TICKET_PRICES_SYSTEM_SWITCH[department]
}
