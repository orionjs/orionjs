import stripe from './stripe'
import getCustomerId from './getCustomerId'

export default async function(user, cardId) {
  const customerId = await getCustomerId(user)
  await stripe.customers.update(customerId, {
    default_source: cardId
  })
}
