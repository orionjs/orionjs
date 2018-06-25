import stripe from './stripe'

export default async function(subscriptionId) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const sub = {
    ...subscription,
    plan: {
      ...subscription.plan,
      productId: subscription.plan.product
    },
    items: subscription.items.data.map(item => ({
      ...item,
      plan: {
        ...item.plan,
        productId: item.plan.product
      }
    }))
  }
  return sub
}
