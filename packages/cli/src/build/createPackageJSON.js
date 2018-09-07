import fs from 'fs'
import writeFile from '../helpers/writeFile'

export default function(dirPath) {
  const packageJSON = JSON.parse(fs.readFileSync('./package.json').toString())
  delete packageJSON.devDependencies

  packageJSON.scripts = {
    ...packageJSON.scripts,
    start: 'node app/index.js'
  }

  writeFile(`${dirPath}/package.json`, JSON.stringify(packageJSON, null, 2))
}
