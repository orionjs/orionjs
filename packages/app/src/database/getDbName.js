module.exports = function(url) {
  let dbName = 'admin'
  let connectionPart = ''

  const startConnectionPart = url.indexOf('//') + 2

  if (url.indexOf('?') !== -1) {
    connectionPart = url.substring(startConnectionPart, url.indexOf('?'))
  } else {
    connectionPart = url.substring(startConnectionPart)
  }

  if (connectionPart.indexOf('.sock') !== -1) {
    if (connectionPart.indexOf('.sock/') !== -1) {
      dbName = connectionPart.split('.sock/')[1]
    }
  } else if (connectionPart.indexOf('/') !== -1) {
    dbName = connectionPart.split('/')[1]
  }

  return dbName
}
