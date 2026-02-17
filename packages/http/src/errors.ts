import crypto from 'node:crypto'
import {logger} from '@orion-js/logger'
import express from 'express'

type onErrorFunction = (req: express.Request, res: express.Response, error: any) => Promise<void>

const defaultOnError: onErrorFunction = async (req, res, error) => {
  if (error.isOrionError) {
    let statusCode = 400
    if (error.code === 'AuthError') {
      statusCode = 401
    } else {
      logger.error(`[route/handler] OrionError in ${req.path}:`, {error})
    }

    const data = error.getInfo()

    res.status(statusCode)
    res.json(data)
  } else if (error.isGraphQLError) {
    res.writeHead(error.statusCode)
    res.end(error.message)
    logger.error(`[route/handler] GraphQLError in ${req.path}:`, {error})
  } else {
    const hash = crypto
      .createHash('sha1')
      .update(error.message, 'utf8')
      .digest('hex')
      .substring(0, 10)
    const statusCode = 500
    const data = {error: 500, message: 'Internal server error', hash}

    res.status(statusCode)
    res.json(data)

    error.hash = hash
    logger.error('[route/handler] Internal server error', {error, url: req.url, hash})
  }
}

let onErrorRef: onErrorFunction = defaultOnError

export const onError: onErrorFunction = async (req, res, error) => {
  return onErrorRef(req, res, error)
}

export const setOnError = (onErrorFunc: onErrorFunction): void => {
  onErrorRef = onErrorFunc
}
