import assert from 'node:assert/strict'
import { test } from 'node:test'
import { saturdayFreeEntryWindow } from '../lib/saturday-free-entry'

test('free entry opens at 08:00 and closes exactly at 10:00 Africa/Lagos', () => {
  assert.deepEqual(saturdayFreeEntryWindow(new Date('2026-11-14T06:59:59Z')), { active:false, closesAt:null })
  assert.deepEqual(saturdayFreeEntryWindow(new Date('2026-11-14T07:00:00Z')), { active:true, closesAt:'2026-11-14T09:00:00.000Z' })
  assert.deepEqual(saturdayFreeEntryWindow(new Date('2026-11-14T08:59:59Z')), { active:true, closesAt:'2026-11-14T09:00:00.000Z' })
  assert.deepEqual(saturdayFreeEntryWindow(new Date('2026-11-14T09:00:00Z')), { active:false, closesAt:null })
})

test('every Saturday in Burning River qualifies, never weekdays or beyond the event', () => {
  assert.equal(saturdayFreeEntryWindow(new Date('2026-11-13T08:30:00Z')).active, false)
  assert.equal(saturdayFreeEntryWindow(new Date('2026-11-21T08:00:00Z')).active, true)
  assert.equal(saturdayFreeEntryWindow(new Date('2026-12-26T08:30:00Z')).active, true)
  assert.equal(saturdayFreeEntryWindow(new Date('2027-01-02T08:30:00Z')).active, false)
})
