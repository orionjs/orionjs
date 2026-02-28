import {getInstance} from '@orion-js/services'
import bodyParser from 'body-parser'
import {getApp} from './start'

export function registerReplEndpoint() {
  const app = getApp()

  app.post('/__repl', bodyParser.json(), async (req, res) => {
    try {
      const {expression} = req.body
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
      const fn = new AsyncFunction('getInstance', expression)
      const result = await fn(getInstance)
      res.json({success: true, result})
    } catch (error) {
      res.json({success: false, error: error.message, stack: error.stack})
    }
  })
}
