import dot from 'dot-object'
import toDot from './toDot'

export default function fromDot(doc: any): any {
  doc = toDot(doc)
  return dot.object(doc)
}
