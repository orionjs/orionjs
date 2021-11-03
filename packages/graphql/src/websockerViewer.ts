// Declare a type.
interface ViewerNodeGlobal extends NodeJS.Global {
  getWebsocketViewerRef: (connectionParams: any) => Promise<any>
  // You can declare anything you need.
}

declare const global: ViewerNodeGlobal

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
