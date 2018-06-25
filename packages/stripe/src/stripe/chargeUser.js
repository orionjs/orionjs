import getCustomerId from './getCustomerId'
import stripe from './stripe'

export default async function(user, data) {
  const customerId = await getCustomerId(user)

  const charge = await stripe.charges.create({
    customer: customerId,
    ...data
  })

  return charge
}
