import validateModifier from './index'

it('should handle $inc correctly', async () => {
  const schema = {
    _id: {type: 'ID'},
    services: {type: 'blackbox'}
  }

  await validateModifier(schema, {$inc: {'services.phoneVerification.tries': 1}})
})
