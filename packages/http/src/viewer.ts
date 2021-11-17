import express from 'express'

global.getViewerRef = () => null

export const getViewer = async (req: express.Request): Promise<any> => {
  try {
    const viewer = await global.getViewerRef(req)
    if (!viewer) return {}
    return viewer
  } catch (err) {
    console.error('Orion HTTP Error: error getting viewer: ', err)
    return {}
  }
}

export const setGetViewer = (getViewerFunc: (req: express.Request) => any): void => {
  global.getViewerRef = getViewerFunc
}
