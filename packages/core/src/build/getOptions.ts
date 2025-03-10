import ts from 'typescript'
import {getConfigPath} from '../start/watchAndCompile/getConfigPath'
import path from 'path'
import {reportDiagnostic} from '../start/watchAndCompile/reports'

export function getCompilerOptionsJSONFollowExtends(filename: string): {[key: string]: any} {
  let compopts = {}
  const config = ts.readConfigFile(filename, ts.sys.readFile).config
  if (config.extends) {
    const rqrpath = require.resolve(config.extends)
    compopts = getCompilerOptionsJSONFollowExtends(rqrpath)
  }

  return {
    ...compopts,
    ...config.compilerOptions
  }
}

export function getOptions({output}): ts.CompilerOptions {
  const configPath = getConfigPath()
  const config = getCompilerOptionsJSONFollowExtends(configPath)
  config.outDir = `${output}/app`
  config.incremental = false
  const {options, errors} = ts.convertCompilerOptionsFromJson(config, path.dirname(configPath))

  if (errors.length) {
    errors.forEach(reportDiagnostic)
    process.exit(1)
  }

  return options
}
