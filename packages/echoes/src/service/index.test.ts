import {createEchoEvent, createEchoRequest} from '../echo'
import {typedEchoesSchema} from '../schema'
import {EchoEvent, Echoes, EchoRequest, getServiceEchoes} from '.'

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

    expect(echoes.echo.type).toBe('request')
    expect(typeof echoes.echo.onRequest).toBe('function')
    expect(echoes.echoEvent.type).toBe('event')
    expect(typeof echoes.echoEvent.resolve).toBe('function')
  })

  it('should be able to define echoes using the v4 syntax', async () => {
    const paramsSchema = typedEchoesSchema<{name: string}>({
      clean(value: any) {
        return {name: String(value.name)}
      },
      validate(value: any) {
        if (!value.name) throw new Error('name is required')
      },
    })
    const stringSchema = typedEchoesSchema<string>({
      clean(value: any) {
        return String(value)
      },
      validate() {},
    })

    @Echoes()
    class ExampleEchoesService {
      @EchoRequest()
      echo = createEchoRequest({
        params: paramsSchema,
        returns: stringSchema,
        resolve: async params => {
          return params.name
        },
      })

      @EchoEvent()
      echoEvent = createEchoEvent({
        params: stringSchema,
        returns: stringSchema,
        resolve: async params => {
          return params
        },
      })
    }

    const echoes = getServiceEchoes(ExampleEchoesService)

    // Test functional behavior first (before any matchers that might mutate the object)
    const requestResult = await echoes.echo.resolve({name: 'John'})
    expect(requestResult).toBe('John')

    const eventResult = await echoes.echoEvent.resolve(1 as any as string)
    expect(eventResult).toBe('1')

    // Verify structure
    expect(echoes.echo.type).toBe('request')
    expect(typeof echoes.echo.onRequest).toBe('function')
    expect(echoes.echoEvent.type).toBe('event')
    expect(typeof echoes.echoEvent.resolve).toBe('function')
  })
})
