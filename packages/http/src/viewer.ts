import express from 'express'

global.getViewerRef = () => null

export const getViewer = async (req: express.Request): Promise<any> => {
  try {
    const viewer = await global.getViewerRef(req)
    if (!viewer) return {}
    return viewer
  } catch {
    return {}
  }
}

export const setGetViewer = (getViewerFunc: (req: express.Request) => any): void => {
  global.getViewerRef = getViewerFunc
}
