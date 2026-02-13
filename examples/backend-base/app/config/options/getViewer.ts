import {Request} from '@orion-js/http'

export interface Viewer {
  userId?: string
  userAgent: string
}
/**
 * Returns the viewer using the shared get viewer method
 */
export default async function (req: Request) {
  return {
    userId: 'xx',
    userAgent: req.headers['user-agent'],
  }
}
