import {registerRoute} from '@orion-js/http'
import config from '../config'
import createEventBus from '../events/createEventBus'
import EventBus from '../events/EventBus'
import requestsHandler from '../requestsHandler'
import {EchoesOptions} from '../types'

let eventBus: EventBus = null

export default async function startService(options: EchoesOptions) {
  config.echoes = options.echoes

  if (options.requests) {
    config.requests = options.requests
    registerRoute(requestsHandler(options))
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
    console.info('Stoping echoes...')
    await eventBus.close()
    eventBus = null
    config.eventBus = undefined
    console.info('Echoes stopped')
  }
}
