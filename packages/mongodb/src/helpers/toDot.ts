import Dot from 'dot-object'

var dot = new Dot('.', false, true, false)

export default function (doc) {
  return dot.dot(doc)
}
