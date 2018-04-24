import start from './start'
import {addRoute} from './routes'

export default function(path, ...args) {
  start()
  const passedOptions = typeof args[0] !== 'function'
  const options = passedOptions ? args[0] : {}
  const func = passedOptions ? args[1] : args[0]
  addRoute(path, options, func)
}
