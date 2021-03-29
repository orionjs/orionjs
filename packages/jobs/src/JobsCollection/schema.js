export default {
  _id: {
    type: 'ID'
  },
  identifier: {
    type: String
  },
  job: {
    type: String
  },
  runAfter: {
    type: Date
  },
  lockedAt: {
    type: Date,
    optional: true
  },
  lastExecution: {
    type: Date,
    optional: true
  },
  params: {
    type: 'blackbox',
    optional: true
  }
}
