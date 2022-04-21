import {Echoes, EchoEvent, EchoRequest, getServiceEchoes} from './echoes'

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
        onRequest: expect.any(Function)
      },
      echoEvent: {
        type: 'event',
        resolve: expect.any(Function)
      }
    })
  })
})
