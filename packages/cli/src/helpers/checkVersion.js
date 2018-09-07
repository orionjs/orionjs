import rp from 'request-promise'

export default async function() {
  try {
    const url = 'http://registry.npmjs.org/@orion-js/cli'
    const response = await rp({
      uri: url,
      method: 'GET',
      json: true,
      timeout: 2000
    })
    const pjson = require('../../package.json')

    const latestVersion = response['dist-tags'].latest
    const currentVersion = pjson.version

    if (currentVersion !== latestVersion) {
      console.log('You are running an outdated version of the orionjs cli')
      console.log('Please upgrade by running "yarn global upgrade @orion-js/cli"\n')
    }
  } catch (error) {}
}
