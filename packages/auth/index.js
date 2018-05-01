const lib = require('./lib')

for (const key of Object.keys(lib)) {
  exports[key] = lib[key]
}
