import createCustomer from './createCustomer'

export default async function(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId
  return createCustomer(user)
}
