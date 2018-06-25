import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.log('Please set the environment variable "STRIPE_SECRET_KEY"')
}

export default Stripe(process.env.STRIPE_SECRET_KEY)
