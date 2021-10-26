import dot from 'dot-object'
import toDot from './toDot'

export default function fromDot(doc) {
  doc = toDot(doc)
  return dot.object(doc)
}
