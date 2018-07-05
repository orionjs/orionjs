import micro from 'micro'
import handler from './handler'

let server = null

export default function() {
  if (server) return server
  server = micro(handler)
  server.listen(process.env.PORT || 3000)
  return server
}
