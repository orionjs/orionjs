import stripe from './stripe'

export default async function(subscriptionId) {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false
  })
}
