import stripe from './stripe'

export default async function(productId) {
  return await stripe.products.retrieve(productId)
}
