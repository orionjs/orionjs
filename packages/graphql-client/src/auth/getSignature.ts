import JSSHA from 'jssha'

export default function(text, session) {
  if (!session) return {}
  const {publicKey, secretKey} = session
  if (!publicKey || !secretKey) return {}

  const shaObj = new JSSHA('SHA-512', 'TEXT')
  shaObj.setHMACKey(secretKey, 'TEXT')
  shaObj.update(text)
  const signature = shaObj.getHMAC('HEX')

  return signature
}
