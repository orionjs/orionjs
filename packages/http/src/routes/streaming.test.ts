import {getApp} from './../start'
import {route} from './route'
import registerRoute from './registerRoute'
import request from 'supertest'
import {range} from 'rambdax'
import {sleep} from '@orion-js/helpers'
import {describe, it} from 'vitest'

const app = getApp()

describe('Test streaming responses', () => {
  it('Should be able to send a streaming response', async () => {
    const testRoute = route({
      path: '/test-streaming',
      method: 'get',
      async resolve(_req, res) {
        for (const i of range(0, 5)) {
          res.write(`data: ${JSON.stringify({count: i})}\n\n`) // "data:" is important here
          await sleep(100)
        }

        res.end()
      },
    })

    registerRoute(testRoute)

    const response = await request(app)
      .get('/test-streaming')
      .parse((res, callback) => {
        let data = ''
        res.setEncoding('binary')
        res.on('data', chunk => {
          console.log('got chunk', chunk)
          data += chunk
        })
        res.on('end', () => {
          callback(null, '')
        })
      })

    const body = response.body

    console.log(body)
  })
})
