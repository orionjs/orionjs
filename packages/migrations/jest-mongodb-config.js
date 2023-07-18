module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: '5.0.19',
      skipMD5: true
    },
    autoStart: true,
    instance: {
      dbName: 'main'
    }
  }
}
