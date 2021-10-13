import config from '../config'
import JSSHA from 'jssha'

export default function (body) {
  const secret = config.requests.key
  const shaObj = new JSSHA('SHA-1', 'TEXT')
  shaObj.setHMACKey(secret, 'TEXT')
  shaObj.update(body)
  return shaObj.getHMAC('HEX')
}
