import getCustomerId from './getCustomerId'
import stripe from './stripe'

export default async function(user) {
  const customerId = await getCustomerId(user)
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return customer.sources.data.map(source => {
      return {
        ...source.card,
        id: source.id,
        isDefault: customer.default_source === source.id
      }
    })
  } catch (error) {
    if (error.message === `No such customer: ${customerId}`) {
      console.log('Deleting customerId because was not found')
      await user.update({$unset: {stripeCustomerId: ''}})
      return []
    }
    throw error
  }
}
