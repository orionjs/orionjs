export function canQueryDashboard(pageVisible: boolean, viewActive = true) {
  return pageVisible && viewActive
}

export function canPollDashboard(pageVisible: boolean, viewActive: boolean, live: boolean) {
  return live && canQueryDashboard(pageVisible, viewActive)
}
