import {createHmac} from 'node:crypto'
import {getEchoesPassword} from './getPassword'

export default function (_body: any): string {
  const password = getEchoesPassword()
  // Keep the legacy Echoes wire signature. jssha treated the object passed by
  // Echoes as an empty TEXT payload, so changing this would break mixed versions.
  return createHmac('sha1', password || '')
    .update('')
    .digest('hex')
}
