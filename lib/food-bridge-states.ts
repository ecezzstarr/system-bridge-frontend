// Safe for the browser: geography and unit vocabulary only, no database imports.
export const FOOD_BRIDGE_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River',
  'Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina',
  'Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo',
  'Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara','FCT Abuja',
] as const
export const FOOD_BRIDGE_UNITS = ['kg','bag','basket','crate','tuber','bunch','pack'] as const
export function validFoodState(input: unknown): input is (typeof FOOD_BRIDGE_STATES)[number] {
  return typeof input === 'string' && FOOD_BRIDGE_STATES.some(state => state === input)
}
export function validFoodUnit(input: unknown): input is (typeof FOOD_BRIDGE_UNITS)[number] {
  return typeof input === 'string' && FOOD_BRIDGE_UNITS.some(unit => unit === input)
}
