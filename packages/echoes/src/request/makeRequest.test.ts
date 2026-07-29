import {afterAll, beforeAll, describe, expect, it} from 'bun:test'
import {createServer, type Server} from 'node:http'
import {makeRequest} from './makeRequest'

describe('standalone request maker', () => {
  let server: Server
  let baseURL: string
  let retryAttempts = 0

  beforeAll(async () => {
    server = createServer(async (request, response) => {
      if (request.url === '/redirect') {
        response.writeHead(307, {location: '/receiver'})
        response.end()
        return
      }

      if (request.url === '/retry') {
        retryAttempts++
        if (retryAttempts === 1) {
          response.writeHead(503)
          response.end('not ready')
          return
        }
      }

      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(Buffer.from(chunk))
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      response.writeHead(200, {'content-type': 'application/json'})
      response.end(JSON.stringify({received: data}))
    })

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Test server did not start')
    baseURL = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    )
  })

  it('posts JSON and follows redirects', async () => {
    const result = await makeRequest({
      url: `${baseURL}/redirect`,
      data: {
        body: {method: 'ping'},
        signature: 'signature',
      },
    })

    expect(result.statusCode).toBe(200)
    expect(result.data).toEqual({
      received: {
        body: {method: 'ping'},
        signature: 'signature',
      },
    })
  })

  it('retries failed HTTP responses', async () => {
    const result = await makeRequest({
      url: `${baseURL}/retry`,
      retries: 1,
      data: {
        body: {method: 'retry'},
        signature: 'signature',
      },
    })

    expect(result.statusCode).toBe(200)
    expect(retryAttempts).toBe(2)
  })
})
