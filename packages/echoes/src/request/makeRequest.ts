import axios from 'axios'
import {RequestMaker} from '../types'

export const makeRequest: RequestMaker = async options => {
  const result = await axios({
    method: 'post',
    url: options.url,
    headers: {
      'User-Agent': 'Orionjs-Echoes/1.1'
    },
    data: options.data
  })

  return {
    data: result.data as object,
    statusCode: result.status
  }
}
