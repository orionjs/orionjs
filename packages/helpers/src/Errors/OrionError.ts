export interface OrionErrorInformation {
  error: string
  message: string
  extra: any
}

export class OrionError extends Error {
  isOrionError = true

  isUserError: boolean
  isPermissionsError: boolean
  code: string
  extra: any

  getInfo: () => OrionErrorInformation
}
