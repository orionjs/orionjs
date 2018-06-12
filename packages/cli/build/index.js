import compile from './compile'
import os from 'os'
import createPackageJSON from './createPackageJSON'
import colors from 'colors/safe'

export default async function({output}) {
  if (!output) {
    throw new Error('Output dir is required')
  }

  const finalDirPath = output.replace('~', os.homedir())
  console.log(colors.bold('Compiling your app...'))
  await compile(finalDirPath)
  createPackageJSON(finalDirPath)
  console.log(colors.bold('Build created'))
}
