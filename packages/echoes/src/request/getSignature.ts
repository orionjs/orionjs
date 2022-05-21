import JSSHA from 'jssha'
import {getEchoesPassword} from './getPassword'

export default function (body: any): string {
  const password = getEchoesPassword()
  const shaObj = new JSSHA('SHA-1', 'TEXT')
  shaObj.setHMACKey(password, 'TEXT')
  shaObj.update(body)
  return shaObj.getHMAC('HEX')
}
