import chalk from 'chalk'
import {isBun} from './helpers/isBun'
import version from './version'

export default function info() {
  const runtime = isBun() ? `Bun ${process.versions.bun}` : `Node ${process.versions.node}`

  console.log(`Orion CLI v${version} — Runtime: ${chalk.bold(runtime)}`)
}
