import stripe from './stripe'

export default async function(couponId) {
  return await stripe.coupons.retrieve(couponId)
}
