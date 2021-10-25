import execute from '../../helpers/execute'

export default async function cleanDirectory() {
  try {
    await execute(`rm -rf ${process.cwd()}/.orion/build`)
  } catch {}

  try {
    await execute(`rm ${process.cwd()}/.orion/tsconfig.tsbuildinfo`)
  } catch {}
}
