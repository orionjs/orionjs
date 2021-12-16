import express from 'express'
import crypto from 'crypto'

type onErrorFunction = (req: express.Request, res: express.Response, error: any) => Promise<void>

const defaultOnError: onErrorFunction = async (req, res, error) => {
  if (error.isOrionError) {
    let statusCode = 400
    if (error.code === 'AuthError') {
      statusCode = 401
    } else {
      console.warn(`[route/handler] OrionError in ${req.path}:`, error)
    }

    const data = error.getInfo()

    res.status(statusCode)
    res.json(data)
  } else if (error.isGraphQLError) {
    res.writeHead(error.statusCode)
    res.end(error.message)
    console.warn(`[route/handler] GraphQLError in ${req.path}:`, error)
  } else {
    const hash = crypto
      .createHash('sha1')
      .update(error.message, 'utf8')
      .digest('hex')
      .substring(0, 10)
    const statusCode = 500
    const data = {error: 500, message: 'Internal server error', hash}

    res.writeHead(statusCode)
    res.end(JSON.stringify(data, null, 2))

    error.hash = hash
    console.error(`[route/handler] Internal server error in ${req.url}:`, error)
  }
}

let onErrorRef: onErrorFunction = defaultOnError

export const onError: onErrorFunction = async (req, res, error) => {
  await onErrorRef(req, res, error)
}

export const setOnError = (onErrorFunc: onErrorFunction): void => {
  onErrorRef = onErrorFunc
}
