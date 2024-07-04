import axios from 'axios'
import getURL from './getURL'
import getSignature from './getSignature'
import serialize from '../publish/serialize'
import deserialize from '../echo/deserialize'
import {ValidationError} from '@orion-js/schema'
import UserError from './UserError'

export default async function ({method, service, params}) {
  const serializedParams = serialize(params)
  const date = new Date()
  const body = {method, service, serializedParams, date}
  const signature = getSignature(body)

  try {
    const result = await axios({
      method: 'post',
      url: getURL(service),
      headers: {
        'User-Agent': 'Orionjs-Echoes/1.1',
      },
      data: {
        body,
        signature,
      },
    })

    if (result.status !== 200) {
      throw new Error(`${result.status}`)
    }

    if (result.data.error) {
      const info = result.data.errorInfo
      if (info) {
        if (result.data.isValidationError) {
          throw new ValidationError(info.validationErrors)
        }
        if (result.data.isUserError) {
          throw new UserError(info.error, info.message, info.extra)
        }
      }

      throw new Error(`${result.data.error}`)
    }

    const response = deserialize(result.data.result)
    return response
  } catch (error) {
    if (error.isOrionError) throw error

    throw new Error(`Echoes request network error ${error.message}`)
  }
}
