import {describe, expect, it} from 'bun:test'
import {
  normalizeDashboardUrlState,
  readDashboardUrlState,
  serializeDashboardUrlState,
  stateForView,
} from './urlState'

describe('dashboard URL state', () => {
  it('round-trips explorer filters, pagination, and an open record', () => {
    const state = readDashboardUrlState(
      '#/history?range=7d&live=false&search=timeout&status=error&lock=expired&page=3&topic=orders&consumer=billing&id=attempt-42',
    )

    expect(state).toEqual({
      view: 'history',
      range: '7d',
      live: false,
      search: 'timeout',
      status: 'error',
      lockState: 'expired',
      page: 3,
      topic: 'orders',
      consumerGroup: 'billing',
      recordId: 'attempt-42',
    })
    expect(serializeDashboardUrlState(state)).toBe(
      '#/history?range=7d&live=false&search=timeout&status=error&lock=expired&page=3&topic=orders&consumer=billing&id=attempt-42',
    )
  })

  it('stores topology search and selection without explorer-only parameters', () => {
    const state = normalizeDashboardUrlState({
      view: 'topology',
      range: '1h',
      live: true,
      search: 'payment',
      status: 'error',
      lockState: 'active',
      page: 5,
      recordId: 'ignored',
      topic: 'payments.completed',
    })

    expect(serializeDashboardUrlState(state)).toBe(
      '#/topology?range=1h&search=payment&topic=payments.completed',
    )
  })

  it('normalizes invalid input and resets view-specific state on navigation', () => {
    const invalid = readDashboardUrlState(
      '#/nope?range=forever&status=broken&lock=lost&page=-4&live=true',
    )
    expect(invalid).toMatchObject({
      view: 'overview',
      range: '24h',
      live: true,
      status: '',
      lockState: '',
      page: 1,
    })
    expect(readDashboardUrlState('#/events?status=error&lock=active')).toMatchObject({
      status: '',
      lockState: '',
    })

    expect(
      stateForView(
        normalizeDashboardUrlState({
          view: 'events',
          range: '30d',
          live: false,
          search: 'order',
          page: 4,
          recordId: 'event-1',
        }),
        'deliveries',
      ),
    ).toEqual({
      view: 'deliveries',
      range: '30d',
      live: false,
      search: '',
      status: '',
      lockState: '',
      page: 1,
    })
  })
})
