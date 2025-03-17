import {describe, it, expect} from 'vitest'
import {setupTelemetry} from './index'

/**
 * This is a simple test file to ensure the tests run for the telemetry package.
 * Since setupTelemetry creates actual instrumentation and starts an SDK,
 * we're only testing the function's existence and structure, not its actual execution.
 */
describe('Telemetry', () => {
  it('should export the setupTelemetry function', () => {
    expect(setupTelemetry).toBeDefined()
    expect(typeof setupTelemetry).toBe('function')
  })
})
