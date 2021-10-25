import getSignature from '../request/getSignature'

export default function (body: any, signature: string) {
  const generatedSignature = getSignature(body)
  if (generatedSignature !== signature) {
    throw new Error('Echoes invalid signature')
  }
}
