import {createHmac} from 'node:crypto'
import {createEchoRequest} from '../echo'
import deserialize from '../echo/deserialize'
import serialize from '../publish/serialize'
import type {EchoesRequestHandlerDefinition} from '../runtime'
import startService from '../startService'

describe('standalone request receiver', () => {
  it('registers a framework-neutral handler and executes a request', async () => {
    let handler: EchoesRequestHandlerDefinition
    await startService({
      echoes: {
        greet: createEchoRequest({
          async resolve(params: {name: string}) {
            return {message: `Hello ${params.name}`}
          },
        }),
      },
      requests: {
        key: 'test-secret',
        registerHandler(definition) {
          handler = definition
        },
      },
    })

    expect(handler.path).toBe('/echoes-services')
    const body = {
      method: 'greet',
      service: 'demo',
      serializedParams: serialize({name: 'Pulse'}),
      date: new Date(),
    }
    const response = (await handler.handle({
      body,
      signature: createHmac('sha1', 'test-secret').update('').digest('hex'),
    })) as any

    expect(deserialize(response.result)).toEqual({message: 'Hello Pulse'})
  })
})
