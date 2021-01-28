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
  params: {
    type: 'blackbox',
    optional: true
  },
  priority: {
    type: Number,
    allowedValues: [0, 1, 2, 3], // 0 = Urgent, 1 = High, 2 = Medium , 3 = Low
    defaultValue: 3,
    optional: true
  }
}
