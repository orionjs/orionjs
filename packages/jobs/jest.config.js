module.exports = {
  verbose: true,
  roots: ['src'],
  globalSetup: './src/test/setup.js',
  globalTeardown: './src/test/teardown.js',
  testEnvironment: './src/test/mongo-environment.js'
}
