import {logger, setLogLevel} from './logger'

setLogLevel('debug')

describe('Log', () => {
  test('Test logs', () => {
    logger.debug('debug')
    logger.info('info')
    logger.warn('warn')
    logger.warn('warn', {info: 'of the log'})
  })

  it('shouldnt fail when passing a non object to the metadata', () => {
    logger.info('info', 'a string')
    logger.info('info', ['array'])
  })

  it('should pass the context', () => {
    const withMeta = logger.addMetadata({context: 'context'})
    withMeta.info('info', {notContext: 'notContext'})
  })
})
