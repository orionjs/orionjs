import config from '../config'
import requestsHandler from '../requestsHandler'
import {EchoesOptions} from '../types'
import KafkaManager from './KafkaManager'
import {registerRoute} from '@orion-js/http'

let kafkaManager: KafkaManager = null

export default async function startService(options: EchoesOptions) {
  config.echoes = options.echoes

  if (options.requests) {
    config.requests = options.requests
    registerRoute(requestsHandler(options))
  }

  if (options.client) {
    kafkaManager = new KafkaManager(options)
    await kafkaManager.start()
    config.producer = kafkaManager.producer
    config.consumer = kafkaManager.consumer
  }
}

export async function stopService() {
  if (kafkaManager) {
    console.info('Stoping echoes...')
    await kafkaManager.stop()
    console.info('Echoes stopped')
  }
}
