import {afterEach, beforeEach, describe, expect, it, jest, mock} from 'bun:test'
import type {JobToRun} from '../types/Worker'
import {Executor} from './Executor'

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return {promise, resolve, reject}
}

function createContext(
  extendLockTime: (jobId: string, extraTime: number, lockId?: string) => Promise<boolean>,
  lockTime = 10_000,
) {
  const executor = new Executor() as any
  const extendLockTimeMock = mock(extendLockTime)
  executor.jobsRepo = {extendLockTime: extendLockTimeMock}

  let executionActive = true
  const onStale = mock(() => {
    executionActive = false
  })
  const jobToRun: JobToRun = {
    jobId: 'job-id',
    executionId: 'execution-id',
    lockId: 'lock-id',
    name: 'test-job',
    type: 'event',
    params: {},
    tries: 1,
    lockTime,
    priority: 1,
  }
  const context = executor.getContext(
    {type: 'event', resolve: async () => {}} as any,
    jobToRun,
    onStale,
    () => executionActive,
  )

  return {
    context,
    extendLockTime: extendLockTimeMock,
    onStale,
    markExecutionStale: () => {
      executionActive = false
    },
  }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('Executor lock renewal', () => {
  beforeEach(() => {
    jest.useFakeTimers({now: 1_000_000})
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('serializes overlapping renewals when the first renewal finishes first', async () => {
    const first = createDeferred<boolean>()
    const second = createDeferred<boolean>()
    const {context, extendLockTime, onStale} = createContext(
      mock(async () => (extendLockTime.mock.calls.length === 1 ? first.promise : second.promise)),
    )

    const firstRenewal = context.extendLockTime(100)
    const secondRenewal = context.extendLockTime(200)

    expect(extendLockTime).toHaveBeenCalledTimes(1)

    first.resolve(true)
    await flushPromises()

    expect(extendLockTime).toHaveBeenCalledTimes(2)

    second.resolve(true)
    await Promise.all([firstRenewal, secondRenewal])

    expect(jest.getTimerCount()).toBe(1)
    jest.advanceTimersByTime(199)
    expect(onStale).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(onStale).toHaveBeenCalledTimes(1)
  })

  it('does not allow a later renewal to finish before the in-flight renewal', async () => {
    const first = createDeferred<boolean>()
    const second = createDeferred<boolean>()
    const {context, extendLockTime, onStale} = createContext(
      mock(async () => (extendLockTime.mock.calls.length === 1 ? first.promise : second.promise)),
    )

    const firstRenewal = context.extendLockTime(100)
    const secondRenewal = context.extendLockTime(200)
    second.resolve(true)
    await flushPromises()

    expect(extendLockTime).toHaveBeenCalledTimes(1)

    first.resolve(true)
    await Promise.all([firstRenewal, secondRenewal])

    expect(extendLockTime).toHaveBeenCalledTimes(2)
    expect(jest.getTimerCount()).toBe(1)
    jest.advanceTimersByTime(100)
    expect(onStale).not.toHaveBeenCalled()
    jest.advanceTimersByTime(100)
    expect(onStale).toHaveBeenCalledTimes(1)
  })

  it('coalesces many pulses received while a renewal is pending', async () => {
    const first = createDeferred<boolean>()
    const {context, extendLockTime} = createContext(
      mock(() => (extendLockTime.mock.calls.length === 1 ? first.promise : Promise.resolve(true))),
    )

    const renewals: Array<Promise<void>> = [context.extendLockTime(100)]
    for (let index = 0; index < 100; index++) {
      renewals.push(context.extendLockTime(200 + index))
    }

    expect(extendLockTime).toHaveBeenCalledTimes(1)

    first.resolve(true)
    await Promise.all(renewals)

    expect(extendLockTime).toHaveBeenCalledTimes(2)
    expect(extendLockTime).toHaveBeenLastCalledWith('job-id', 299, 'lock-id')
    expect(jest.getTimerCount()).toBe(1)
  })

  it('does not lose a pulse queued while the in-flight promise is settling', async () => {
    const first = createDeferred<boolean>()
    const {context, extendLockTime} = createContext(
      mock(() => (extendLockTime.mock.calls.length === 1 ? first.promise : Promise.resolve(true))),
    )

    const firstRenewal = context.extendLockTime(100)
    let settlementPulse: Promise<void> | undefined
    void first.promise.then(() => {
      settlementPulse = context.extendLockTime(200)
    })

    first.resolve(true)
    await firstRenewal
    await settlementPulse

    expect(extendLockTime).toHaveBeenCalledTimes(2)
    expect(extendLockTime).toHaveBeenLastCalledWith('job-id', 200, 'lock-id')
    expect(jest.getTimerCount()).toBe(1)
  })

  it('does not reinstall the watchdog after it is cleared during a renewal', async () => {
    const renewal = createDeferred<boolean>()
    const {context, onStale} = createContext(async () => renewal.promise)

    const pendingRenewal = context.extendLockTime(100)
    context.clearStaleTimeout()
    renewal.resolve(true)
    await pendingRenewal

    expect(jest.getTimerCount()).toBe(0)
    jest.advanceTimersByTime(10_000)
    expect(onStale).not.toHaveBeenCalled()
  })

  it('does not renew or rearm the watchdog when the execution becomes stale mid-renewal', async () => {
    const renewal = createDeferred<boolean>()
    const {context, extendLockTime, markExecutionStale, onStale} = createContext(
      async () => renewal.promise,
    )

    const pendingRenewal = context.extendLockTime(100)
    markExecutionStale()
    renewal.resolve(true)
    await pendingRenewal
    await context.extendLockTime(200)

    expect(extendLockTime).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
    jest.advanceTimersByTime(10_000)
    expect(onStale).not.toHaveBeenCalled()
  })

  it('marks the execution stale exactly once when Mongo no longer owns the lock', async () => {
    const {context, extendLockTime, onStale} = createContext(async () => false)

    await Promise.all([context.extendLockTime(100), context.extendLockTime(200)])
    await context.extendLockTime(300)
    jest.runAllTimers()

    expect(extendLockTime).toHaveBeenCalledTimes(1)
    expect(onStale).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('marks the execution stale and preserves the Mongo error', async () => {
    const mongoError = new Error('Mongo renewal failed')
    const renewal = createDeferred<boolean>()
    const {context, extendLockTime, onStale} = createContext(() => renewal.promise)

    const pendingRenewal = context.extendLockTime(100)
    renewal.reject(mongoError)
    await expect(pendingRenewal).rejects.toBe(mongoError)
    await context.extendLockTime(200)
    jest.runAllTimers()

    expect(extendLockTime).toHaveBeenCalledTimes(1)
    expect(onStale).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('does not leave an orphan watchdog after successful overlapping renewals', async () => {
    const first = createDeferred<boolean>()
    const second = createDeferred<boolean>()
    const {context, extendLockTime, onStale} = createContext(
      mock(async () => (extendLockTime.mock.calls.length === 1 ? first.promise : second.promise)),
    )

    const firstRenewal = context.extendLockTime(100)
    const secondRenewal = context.extendLockTime(200)
    first.resolve(true)
    await flushPromises()
    second.resolve(true)
    await Promise.all([firstRenewal, secondRenewal])

    jest.advanceTimersByTime(199)
    expect(onStale).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(1)
    jest.advanceTimersByTime(1)
    expect(onStale).toHaveBeenCalledTimes(1)
  })

  it('uses the Mongo write deadline instead of adding response latency to the watchdog', async () => {
    const renewal = createDeferred<boolean>()
    let writtenDeadline = 0
    const {context, onStale} = createContext(async (_jobId, extraTime) => {
      writtenDeadline = Date.now() + extraTime
      return renewal.promise
    })

    const pendingRenewal = context.extendLockTime(100)
    jest.advanceTimersByTime(40)
    renewal.resolve(true)
    await pendingRenewal

    expect(writtenDeadline).toBe(1_000_100)
    jest.advanceTimersByTime(59)
    expect(onStale).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(Date.now()).toBe(writtenDeadline)
    expect(onStale).toHaveBeenCalledTimes(1)
  })
})
