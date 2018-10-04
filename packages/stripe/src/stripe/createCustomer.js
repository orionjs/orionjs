import stripe from './stripe'

export default async function(user) {
  if (!user.email) {
    throw new Error('Please add email resolver to the user model')
  }

  const customer = await stripe.customers.create({
    email: await user.email(),
    metadata: {
      userId: user._id
    }
  })

  await user.update({$set: {stripeCustomerId: customer.id}})

  return customer.id
}
