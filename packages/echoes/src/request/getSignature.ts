import config from '../config'
import JSSHA from 'jssha'

export default function (body: any): string {
  const secret = config.requests.key || ''
  if (!secret) {
    console.warn('Warning: no secret key found for echoes requests')
  }
  const shaObj = new JSSHA('SHA-1', 'TEXT')
  shaObj.setHMACKey(secret, 'TEXT')
  shaObj.update(body)
  return shaObj.getHMAC('HEX')
}
