import validateModifier from './index'
import {it} from 'vitest'

it('should handle $ correctly', async () => {
  const Email = {
    address: {type: String},
    verified: {type: Boolean},
  }
  const schema = {
    emails: {type: [Email]},
  }

  await validateModifier(schema, {$set: {'emails.$.verified': true}})
})
