const Image = {
  url: {
    type: String
  },
  size: {
    type: Number
  }
}

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
    type: Image,
    optional: true
  },
  creatorId: {
    type: String
  }
}
