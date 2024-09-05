export default {
  _id: {
    type: 'ID',
  },
  hash: {
    type: String,
    optional: true,
  },
  externalUrl: {
    type: String,
    optional: true,
    private: true,
  },
  key: {
    type: String,
    optional: true,
  },
  bucket: {
    type: String,
    optional: true,
  },
  name: {
    type: String,
    optional: true,
  },
  type: {
    type: String,
    optional: true,
  },
  size: {
    type: Number,
    optional: true,
  },
  status: {
    type: String,
    optional: true,
  },
  createdBy: {
    type: String,
    optional: true,
  },
  createdAt: {
    type: Date,
    optional: true,
  },
  metadata: {
    type: 'blackbox',
    optional: true,
  },
}
