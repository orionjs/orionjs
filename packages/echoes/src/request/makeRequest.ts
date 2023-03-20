import axios from 'axios'
import {RequestMaker} from '../types'
import {executeWithRetries} from '@orion-js/helpers'

export const makeRequest: RequestMaker = async options => {
  const result = await executeWithRetries(
    async () => {
      return await axios({
        method: 'post',
        url: options.url,
        timeout: options.timeout,
        headers: {
          'User-Agent': 'Orionjs-Echoes/1.1'
        },
        data: options.data
      })
    },
    options.retries,
    200
  )

  return {
    data: result.data as object,
    statusCode: result.status
  }
}
