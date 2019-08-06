import {getGetViewer} from '../../setGetViewer'
import UserError from '../../../Errors/UserError'
import getIp from './getIp'

export default async function(params) {
  try {
    const getViewer = getGetViewer()
    const viewer = params && getViewer ? (await getViewer(params)) || {} : {}
    viewer.roles = viewer.roles || []
    viewer.locale = viewer.locale || (params && params.headers['x-orion-locale']) || 'en'
    viewer.ip = getIp(params.request)
    viewer.headers = params.headers
    return viewer
  } catch (error) {
    if (error.message === 'DB is not connected yet') {
      throw error
    }
    throw new UserError('AuthError', error.message)
  }
}
