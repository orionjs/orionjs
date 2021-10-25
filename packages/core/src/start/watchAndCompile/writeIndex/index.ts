import writeFile from '../../../helpers/writeFile'
import fs from 'fs'
import path from 'path'

const libPath = path.resolve(__dirname, '../../../../moduleAlias.js.txt')
const libContent = fs.readFileSync(libPath).toString()

export default function () {
  const basePath = `${process.cwd()}/.orion/build`

  const libPath = `${basePath}/moduleAliasLib.js`

  writeFile(libPath, libContent)

  const aliasPath = `${basePath}/moduleAlias.js`
  writeFile(
    aliasPath,
    `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moduleAlias = require('./moduleAliasLib')
const path =  __dirname + '/app'
console.log('registering alias',  path)
moduleAlias.addAlias('app', path)
  `
  )

  const indexPath = `${basePath}/index.js`
  writeFile(
    indexPath,
    `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./moduleAlias");
require("./app");
  `
  )
}
