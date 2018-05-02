const DEFAULT_ALLOW_METHODS = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

const DEFAULT_ALLOW_HEADERS = [
  'X-Requested-With',
  'Access-Control-Allow-Origin',
  'X-HTTP-Method-Override',
  'Content-Type',
  'Authorization',
  'Accept'
]

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 // 24 hours

global.corsOptions = {
  maxAge: DEFAULT_MAX_AGE_SECONDS,
  origin: '*',
  allowHeaders: DEFAULT_ALLOW_HEADERS,
  exposeHeaders: [],
  allowMethods: DEFAULT_ALLOW_METHODS
}

export const setCorsOptions = options => {
  global.corsOptions = {...global.corsOptions, ...options}
}

export const getCorsOptions = () => global.corsOptions
