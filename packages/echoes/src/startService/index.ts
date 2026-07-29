import config from '../config'
import createEventBus from '../events/createEventBus'
import EventBus from '../events/EventBus'
import requestsHandler from '../requestsHandler'
import {getEchoesLogger, getEchoesRuntime} from '../runtime'
import {EchoesOptions} from '../types'

let eventBus: EventBus = null

export default async function startService(options: EchoesOptions) {
  config.echoes = options.echoes

  if (options.requests) {
    config.requests = options.requests
    const registerHandler =
      options.requests.registerHandler || getEchoesRuntime().registerRequestHandler
    if (!registerHandler) {
      throw new Error(
        'Echoes requests require requests.registerHandler in standalone servers. Orion applications can import @orion-js/echoes-orion once during startup.',
      )
    }
    await registerHandler(requestsHandler(options))
  }

  const nextEventBus = createEventBus(options)
  if (nextEventBus) {
    await nextEventBus.start()
    eventBus = nextEventBus
    config.eventBus = eventBus
  }
}

export async function stopService() {
  if (eventBus) {
    const logger = getEchoesLogger()
    logger.info('Stopping Echoes...')
    await eventBus.close()
    eventBus = null
    config.eventBus = undefined
    logger.info('Echoes stopped')
  }
}
