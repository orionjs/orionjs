import validateModifier from './index'

it('should handle $ correctly', async () => {
  const Email = {
    address: {type: String},
    verified: {type: Boolean}
  }
  const schema = {
    _id: {type: 'ID'},
    emails: {type: [Email]}
  }

  await validateModifier(schema, {$set: {'emails.$.verified': true}})
})
