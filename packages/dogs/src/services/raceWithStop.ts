interface RaceWithStopOptions<T, S> {
  promise: Promise<T>
  signal: AbortSignal
  valueOnStop?: S
}

/**
 * Waits for `promise`, or returns `valueOnStop` as soon as `signal` aborts.
 *
 * The abort listener is removed when the wait ends, so calling this in a loop leaves nothing
 * attached to the long-lived signal. Racing against a promise that only settles on stop would
 * instead keep one reaction (and the race result) alive per call until stop.
 */
export async function raceWithStop<T, S = undefined>(
  options: RaceWithStopOptions<T, S>,
): Promise<T | S> {
  const {promise, signal, valueOnStop} = options
  if (signal.aborted) return valueOnStop as S

  let onAbort!: () => void
  const stopped = new Promise<S>(resolve => {
    onAbort = () => resolve(valueOnStop as S)
  })
  signal.addEventListener('abort', onAbort, {once: true})

  try {
    return await Promise.race([promise, stopped])
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}
