export default {
  _id: {
    type: 'ID'
  },
  publicKey: {
    type: 'ID'
  },
  secretKey: {
    type: 'ID'
  },
  createdAt: {
    type: Date
  },
  nonce: {
    type: String
  },
  lastCall: {
    type: Date,
    optional: true
  },
  userId: {
    type: 'ID'
  }
}
