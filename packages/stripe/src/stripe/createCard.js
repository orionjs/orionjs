import stripe from './stripe'
import getCustomerId from './getCustomerId'

export default async function(user, source) {
  const customerId = await getCustomerId(user)

  const card = await stripe.customers.createSource(customerId, {
    source
  })

  return card
}
