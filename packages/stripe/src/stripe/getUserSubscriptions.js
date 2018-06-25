import getCustomerId from './getCustomerId'
import stripe from './stripe'

export default async function(user) {
  const customerId = await getCustomerId(user)
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return customer.subscriptions.data.map(subscription => {
      const sub = {
        ...subscription,
        plan: {
          ...subscription.plan,
          productId: subscription.plan.product
        },
        items: subscription.items.data.map(item => {
          return {
            ...item,
            plan: {
              ...item.plan,
              productId: item.plan.product
            }
          }
        })
      }
      console.log(sub)
      return sub
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
