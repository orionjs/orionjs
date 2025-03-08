import { EchoesMap, startService } from '@orion-js/echoes'
import { services } from './services'
import logCreator from './logCreator'
// import {env} from '@orion-js/env'
import { logger } from '@orion-js/logger'
import { isEmpty } from 'lodash'

const brokers = process.env.KAFKA_BROKERS
  ? process.env.KAFKA_BROKERS.split(',')
  : null
const ssl = process.env.KAFKA_BROKERS_USE_SSL === 'true'

export default function startEchoes(echoes: EchoesMap) {
  startService({
    client: {
      clientId: 'multiapp_clientid',
      brokers,
      ssl,
      logCreator,
    },
    consumer: {
      groupId: `this_service_name`,
    },
    producer: {},
    requests: {
      key: 'set a strong password here', // env.echoes_password,
      services,
    },
    echoes,
  })
}
