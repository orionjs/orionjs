import {logger, setLogLevel} from './logger'
import {describe, it, test} from 'vitest'

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

  it('should log errors correctly', () => {
    logger.error('an error', new Error('message'))
    logger.error('an error2', {error: new Error('message'), info: 'of the log'})
  })

  it('should pass the context', () => {
    const withMeta = logger.addMetadata({context: 'context'})
    withMeta.info('info', {notContext: 'notContext'})
  })
})
