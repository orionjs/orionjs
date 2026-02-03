import {TRPCError} from '@trpc/server'

interface OrionError extends Error {
  isOrionError?: boolean
  isValidationError?: boolean
  isUserError?: boolean
  isPermissionsError?: boolean
  code?: string
  getInfo?: () => any
  validationErrors?: Record<string, string>
  labels?: Record<string, string>
}

export function mapErrorToTRPCError(error: OrionError): TRPCError {
  if (error.isValidationError) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
      cause: error,
    })
  }

  if (error.isUserError) {
    if (error.code === 'AuthError') {
      return new TRPCError({
        code: 'UNAUTHORIZED',
        message: error.message,
        cause: error,
      })
    }

    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
      cause: error,
    })
  }

  if (error.isPermissionsError) {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: error.message,
      cause: error,
    })
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error.message,
    cause: error,
  })
}

export function getErrorData(error: OrionError): Record<string, any> {
  const data: Record<string, any> = {}

  if (error.isValidationError) {
    data.isValidationError = true
    data.validationErrors = error.validationErrors
    data.labels = error.labels
  }

  if (error.isUserError) {
    data.isUserError = true
    data.code = error.code
  }

  if (error.isPermissionsError) {
    data.isPermissionsError = true
  }

  if (error.getInfo) {
    data.info = error.getInfo()
  }

  return data
}
