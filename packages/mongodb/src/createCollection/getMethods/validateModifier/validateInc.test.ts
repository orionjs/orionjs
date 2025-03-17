import validateModifier from './index'
import {it} from 'vitest'

it('should handle $inc correctly', async () => {
  const schema = {
    services: {type: 'blackbox'},
  }

  await validateModifier(schema, {$inc: {'services.phoneVerification.tries': 1}})
})
