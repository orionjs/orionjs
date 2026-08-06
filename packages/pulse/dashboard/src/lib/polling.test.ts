import {describe, expect, it} from 'bun:test'
import {canPollDashboard, canQueryDashboard} from './polling'

describe('dashboard polling policy', () => {
  it('never queries while the browser page is hidden', () => {
    expect(canQueryDashboard(false, true)).toBe(false)
    expect(canPollDashboard(false, true, true)).toBe(false)
  })

  it('queries only the active view and polls it only in live mode', () => {
    expect(canQueryDashboard(true, false)).toBe(false)
    expect(canQueryDashboard(true, true)).toBe(true)
    expect(canPollDashboard(true, true, false)).toBe(false)
    expect(canPollDashboard(true, true, true)).toBe(true)
  })
})
