module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: '8.0.0',
      skipMD5: true
    },
    autoStart: true,
    instance: {
      dbName: 'main'
    }
  }
}
