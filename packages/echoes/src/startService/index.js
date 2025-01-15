import config from '../config'
import requestsHandler from '../requestsHandler'
import KafkaManager from './KafkaManager'

let kafkaManager = null
export default async function startService(options) {
  if (options.client) {
    kafkaManager = new KafkaManager(options)
    await kafkaManager.start()
    config.kafkaManager = kafkaManager
  }
  if (options.requests) {
    config.requests = options.requests

    config.echoes = options.echoes
    if (config.requests.startHandler) {
      config.requests.startHandler(requestsHandler)
    }
  }
}

export async function stopService() {
  if (kafkaManager) {
    console.info("Stoping echoes...")
    await kafkaManager.stop()
    console.info("Echoes stopped")
  }
}