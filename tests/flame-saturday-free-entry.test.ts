import assert from 'node:assert/strict'
import { isFlameSaturdayFreeEntry } from '../lib/flame-saturday-free-entry'

const check = (stamp: string, expected: boolean) => {
  assert.equal(isFlameSaturdayFreeEntry(new Date(stamp)), expected, stamp)
}

// Nigeria (WAT, UTC+1); explicit beginning and ending boundaries.
check('2026-11-14T06:59:59Z', false) // 07:59:59 WAT
check('2026-11-14T07:00:00Z', true) // 08:00 WAT
check('2026-11-14T08:59:59Z', true) // 09:59 WAT
check('2026-11-14T09:00:00Z', false) // 10:00 WAT
check('2026-11-13T08:00:00Z', false) // Friday
check('2026-11-15T08:00:00Z', false) // Sunday
check('2026-12-26T08:30:00Z', true) // Last Saturday of Burning River
check('2027-01-02T08:30:00Z', false) // After Burning River
check('2026-09-26T08:30:00Z', false) // Before Burning River
assert.equal(isFlameSaturdayFreeEntry(new Date('invalid')), false)
console.log('Burning River Saturday free entry boundaries: passed')
