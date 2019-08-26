import {micro} from '@orion-js/app'
import {parse} from 'url'

const {json} = micro

export default async function(request) {
  if (request.method === 'POST') {
    try {
      return await json(request, { limit: (process.env.MICRO_BODY_LIMIT || '1mb') })
    } catch (error) {
      console.error(error)
    }
  } else {
    return parse(request.url, true).query
  }
}
