import axios from 'axios'
import {executeWithRetries} from '@orion-js/helpers'

export default async function makeRequest({url, data, timeout, retries}) {
  const result = await executeWithRetries(
    async () => {
      return await axios({
        method: 'post',
        url,
        timeout,
        headers: {
          'User-Agent': 'Orionjs-Echoes/1.1'
        },
        data
      })
    },
    retries,
    200
  )

  return {
    data: result.data,
    statusCode: result.status
  }
}
