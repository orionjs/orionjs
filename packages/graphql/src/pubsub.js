let pubsub = null

export const setPubsub = function(newPubsub) {
  pubsub = newPubsub
}

export const getPubsub = function() {
  return pubsub
}
