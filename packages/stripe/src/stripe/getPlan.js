import stripe from './stripe'
import Plan from '../Plan'

export default async function(planId) {
  const plan = await stripe.plans.retrieve(planId)
  return Plan.initItem({
    ...plan,
    productId: plan.product
  })
}
