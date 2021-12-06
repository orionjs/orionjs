import {getOptions} from '../options'
import refreshJWT from '../apollo/refreshJWT'
import repeatWithHeaders from './repeatWithHeaders'

export default function ({networkError, operation, forward}) {
  if (!operation || !forward) return

  return repeatWithHeaders(
    async () => {
      await refreshJWT(getOptions())
      // los nuevos headers se van a pasar solos por el getAuthHeaders
    },
    {
      operation,
      forward
    }
  )
}
