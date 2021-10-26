import express from 'express'

let getViewerRef: (req: express.Request) => any = () => null

export const getViewer = async (req: express.Request): Promise<any> => {
  try {
    const viewer = await getViewerRef(req)
    if (!viewer) return {}
    return viewer
  } catch {
    return {}
  }
}

export const setGetViewer = (getViewerFunc: (req: express.Request) => any): void => {
  getViewerRef = getViewerFunc
}
