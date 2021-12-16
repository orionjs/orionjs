import express from 'express'
import {UserError} from '@orion-js/helpers'

global.getViewerRef = () => null

export const getViewer = async (req: express.Request): Promise<any> => {
  try {
    const viewer = await global.getViewerRef(req)
    if (!viewer) return {}
    return viewer
  } catch (err) {
    throw new UserError('AuthError', err.message)
  }
}

export const setGetViewer = (getViewerFunc: (req: express.Request) => any): void => {
  global.getViewerRef = getViewerFunc
}
