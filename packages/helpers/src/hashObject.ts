import hash from 'object-hash'

export default function (object: any): string {
  return hash(object)
}
