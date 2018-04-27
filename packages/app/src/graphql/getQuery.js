import {json} from 'micro'
import {parse} from 'url'

export default async function(req) {
  if (req.method === 'POST') {
    try {
      return await json(req)
    } catch (error) {
      console.error(error)
    }
  } else {
    return parse(req.url, true).query
  }
}
