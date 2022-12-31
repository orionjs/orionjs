import {PubSubEngine} from 'graphql-subscriptions'

let pubsub = null

export const setPubsub = function (newPubsub: PubSubEngine) {
  pubsub = newPubsub
}

export const getPubsub: () => PubSubEngine = function () {
  return pubsub
}
