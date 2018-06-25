export default {
  id: {
    type: String
  },
  name: {
    type: String
  },
  type: {
    type: String
  },
  active: {
    type: Boolean
  },
  caption: {
    type: String
  },
  created: {
    type: Date
  },
  description: {
    type: String
  },
  livemode: {
    type: Boolean
  },
  metadata: {
    type: 'blackbox',
    private: true
  },
  unit_label: {
    type: String
  }
}
