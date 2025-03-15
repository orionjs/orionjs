import {Echoes, EchoEvent, EchoRequest, getServiceEchoes} from '.'
import {describe, it, expect} from 'vitest'
import {createEchoEvent, createEchoRequest} from '../echo'

describe('Echoes with service injections', () => {
  it('Should define a echoes map using services', async () => {
    @Echoes()
    class ExampleEchoesService {
      @EchoRequest()
      async echo() {
        return 1
      }

      @EchoEvent()
      async echoEvent() {
        return 2
      }
    }

    const echoes = getServiceEchoes(ExampleEchoesService)

    expect(echoes).toMatchObject({
      echo: {
        type: 'request',
        onRequest: expect.any(Function),
      },
      echoEvent: {
        type: 'event',
        resolve: expect.any(Function),
      },
    })
  })

  it('should be able to define echoes using the v4 syntax', async () => {
    @Echoes()
    class ExampleEchoesService {
      @EchoRequest()
      echo = createEchoRequest({
        params: {
          name: {
            type: 'string',
          },
        },
        returns: String,
        resolve: async params => {
          return params.name
        },
      })

      @EchoEvent()
      echoEvent = createEchoEvent({
        params: 'string',
        returns: String,
        resolve: async params => {
          return params
        },
      })
    }

    const echoes = getServiceEchoes(ExampleEchoesService)

    expect(echoes).toMatchObject({
      echo: {
        type: 'request',
        onRequest: expect.any(Function),
      },
      echoEvent: {
        type: 'event',
        resolve: expect.any(Function),
      },
    })

    const requestResult = await echoes.echo.resolve({name: 'John'})
    expect(requestResult).toBe('John')

    const eventResult = await echoes.echoEvent.resolve(1 as any as string)
    expect(eventResult).toBe('1')
  })
})
