import {route} from '@orion-js/http'
import {logger} from '@orion-js/logger'
import {isServerHealthy} from '../health'

export default route({
  path: '/health-check',
  method: 'get',
  async resolve() {
    try {
      const result = await isServerHealthy()
      return {
        statusCode: 200,
        body: {
          status: 'ok',
          message: result,
        },
      }
    } catch (error) {
      logger.error(`Error in health check: ${error.message}`, error)
      return {
        statusCode: 429,
        body: {
          status: 'error',
          message: 'One or more dependencies are unhealthy',
        },
      }
    }
  },
})
