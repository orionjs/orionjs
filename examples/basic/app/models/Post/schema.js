import Image from '../Image'

export default {
  title: {
    type: String
  },
  content: {
    type: String
  },
  tags: {
    type: [String],
    optional: true
  },
  image: {
    type: Image.schema,
    optional: true
  },
  creatorId: {
    type: String,
    optional: true,
    private: true
  }
}
