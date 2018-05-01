let appGetViewer = null

export const setGetViewer = function setGetViewer(getViewer) {
  appGetViewer = getViewer
}

export const getGetViewer = function() {
  return appGetViewer
}
