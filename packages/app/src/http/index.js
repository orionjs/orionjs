import start from './start'
import {addRoutes} from './routes'

export default function({routes}) {
  start()
  addRoutes(routes)
}
