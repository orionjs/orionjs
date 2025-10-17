import {describe, it, expect} from 'vitest'
import {Echoes, EchoEvent, getServiceEchoes} from '.'
import {getOrionAsyncContext} from '@orion-js/logger'

describe('Echoes async context', () => {
  it('captures echo handler context', async () => {
    @Echoes()
    class SampleEchoService {
      @EchoEvent()
      async sampleEvent() {
        const context = getOrionAsyncContext()
        expect(context?.contextId).toBeDefined()
        expect(typeof context?.contextId).toBe('string')
        expect(context?.controllerType).toBe('echo')
        expect(context?.echoName).toBe('sampleEvent')
      }
    }

    const echoes = getServiceEchoes(SampleEchoService)
    const echo = echoes.sampleEvent

    await echo.resolve({})
  })
})
