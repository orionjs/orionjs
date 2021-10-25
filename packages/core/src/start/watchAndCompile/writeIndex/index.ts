import writeFile from '../../../helpers/writeFile'
import fs from 'fs'
import path from 'path'

export default function () {
  const basePath = `${process.cwd()}/.orion/build`

  const libPath = `${basePath}/moduleAliasLib.js`

  const libContentPath = path.resolve(__dirname, '../../../../moduleAlias.js.txt')
  const libContent = fs.readFileSync(libContentPath).toString()

  writeFile(libPath, libContent)

  const aliasPath = `${basePath}/moduleAlias.js`
  writeFile(
    aliasPath,
    `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moduleAlias = require('./moduleAliasLib')
const path =  __dirname + '/app'
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
