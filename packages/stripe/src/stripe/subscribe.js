import stripe from './stripe'
import getCustomerId from './getCustomerId'

export default async function(user, planId, options = {}) {
  const customerId = await getCustomerId(user)

  await stripe.subscriptions.create({
    customer: customerId,
    items: [{plan: planId}],
    ...options
  })
}
