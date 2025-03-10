// Declare a type.

global.getWebsocketViewerRef = () => null

export const getWebsockerViewer = async (connectionParams: any): Promise<any> => {
  try {
    const viewer = await global.getWebsocketViewerRef(connectionParams)
    if (!viewer) return {}
    return viewer
  } catch {
    return {}
  }
}

export const setGetWebsockerViewer = (getViewerFunc: (connectionParams: any) => any): void => {
  global.getWebsocketViewerRef = getViewerFunc
}
