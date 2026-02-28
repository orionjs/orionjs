import chalk from 'chalk'
import {execSync} from 'node:child_process'
import version from './version'

function detectRuntime(): string {
  const runtimes: string[] = []

  try {
    const bunVersion = execSync('bun --version', {encoding: 'utf-8'}).trim()
    runtimes.push(`Bun ${bunVersion}`)
  } catch {}

  runtimes.push(`Node ${process.versions.node}`)

  return runtimes.join(', ')
}

export default function info() {
  console.log(`Orion CLI v${version} — Available runtimes: ${chalk.bold(detectRuntime())}`)
  console.log(`Default runtime: ${chalk.bold('Bun')} (use --node flag to switch to Node.js)`)
}
