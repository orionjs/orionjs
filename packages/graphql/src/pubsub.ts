import {PubSub} from 'graphql-subscriptions'

let pubsub = null

export const setPubsub = function (newPubsub: PubSub) {
  pubsub = newPubsub
}

export const getPubsub: () => PubSub = function () {
  return pubsub
}
