---
id: stripe
title: Stripe
sidebar_label: Stripe
---

## Initializing

The `stripe` package helps you integrate online payments using the [Stripe](https://stripe.com/) service.

```sh
yarn install @orion-js/stripe
```

## Configuration

The configuration of `stripe` is done by setting the following environment variable:

- `STRIPE_SECRET_KEY`: You must pass a valid Stripe Secret Key to be able to use the Stripe API services from your registered account.

You can call `@orion-js/stripe` methods directly, without starting a service in the server. `@orion-js/stripe` methods take advantage of the fact that internally Stripe has been instanciated from the package by using the `<STRIPE_SECRET_KEY>` from the environment variables previously established.

## Usage

For Example, the next mutation register a new payment from the client:

```js
import {resolver} from '@orion-js/app'
import Users from 'app/collections/Users'
import {createCard} from '@orion-js/stripe'

export default resolver({
  params: {
    sourceId: {
      type: String
    }
  },
  returns: Boolean,
  mutation: true,
  requireUserId: true,
  async resolve({sourceId}, viewer) {
    const user = await Users.findOne(viewer.userId)
    await createCard(user, sourceId)

    return true
  }
})
```

`createCard` receives the `user` and `sourceId` (`sourceId` will correspond to the payment method chosen by the user when triggering the mutation), and stores a new [Card](https://stripe.com/docs/api?lang=node#cards) with that user credentials.

## Available methods

- [`createCard(user, sourceId)`](https://stripe.com/docs/api?lang=node#create_card): Registers a Card for an user.
- [`getUserCards(user)`](https://github.com/orionjs/orionjs/blob/master/packages/stripe/src/stripe/getUserCards.js): Get all Cards from an user.
- [`getUserSubscriptions(user)`](https://github.com/orionjs/orionjs/blob/master/packages/stripe/src/stripe/getUserSubscriptions.js): Gets all user Subscription

* [`createCustomer(user)`](https://stripe.com/docs/api?lang=node#create_customer): Registers a new [Customer](https://stripe.com/docs/api?lang=node#customers).
* [`getCostumerId(user)`](https://github.com/orionjs/orionjs/blob/master/packages/stripe/src/stripe/getCustomerId.js): Gets the Stripe Costumer Id from an user.
* [`chargeUser(user, data)`](https://stripe.com/docs/api?lang=node#create_charge): Registers a new [Charge](https://stripe.com/docs/api?lang=node#charges) (data) to an user.
* [`setDefaultCard(user, cardId)`](https://stripe.com/docs/api?lang=node#update_customer): Sets a Card by default to an user.
* [`deleteUserCard(user, cardId)`](https://stripe.com/docs/api?lang=node#detach_source): Removes a Card from an user

- [`getProduct(producId)`](https://stripe.com/docs/api?lang=node#retrieve_product): Gets a [Product](https://stripe.com/docs/api?lang=node#service_products).
- [`getPlan(planId)`](https://stripe.com/docs/api?lang=node#retrieve_plan): Gets a [Plan](https://stripe.com/docs/api?lang=node#plans):
- [`getCoupon(couponId)`](https://stripe.com/docs/api?lang=node#retrieve_coupon): Gets a [Coupon](https://stripe.com/docs/api?lang=node#coupons).

* [`getSubscription(subscriptionId)`](https://stripe.com/docs/api?lang=node#retrieve_subscription): Gets a [Subscription](https://stripe.com/docs/api?lang=node#subscriptions)
* [`subscribe(user, planId, options = {})`](https://stripe.com/docs/api?lang=node#create_subscription): Registers a new Subscription
* [`retakeSubscription(subscriptionId)`](https://stripe.com/docs/api?lang=node#update_subscription): Updates the date of a Subscription cancelation to `false`.
* [`cancelSubscription(subscriptionId)`](https://stripe.com/docs/api?lang=node#update_subscription): Updates the date of a Subscription cancelation to `true`.
