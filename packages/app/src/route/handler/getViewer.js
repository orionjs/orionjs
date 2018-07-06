import {getGetViewer} from '../setGetViewer'
import UserError from '../../Errors/UserError'

export default async function(params) {
  try {
    const getViewer = getGetViewer()
    const viewer = params ? (await getViewer(params)) || {} : {}
    viewer.locale = viewer.locale || (params && params.headers['x-orion-locale']) || 'en'
    return viewer
  } catch (error) {
    if (error.message === 'DB is not connected yet') {
      throw error
    }
    throw new UserError('AuthError', error.message)
  }
}
