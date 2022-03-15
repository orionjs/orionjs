import {logger, setLogLevel} from './logger'

setLogLevel('debug')

describe('Log', () => {
  test('Test logs', () => {
    logger.debug('debug')
    logger.info('info')
    logger.warn('warn')
  })
})
