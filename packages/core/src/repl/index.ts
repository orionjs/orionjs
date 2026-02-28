import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import chalk from 'chalk'

export interface ReplOptions {
  expression?: string
  port?: string
}

function resolvePort(options: ReplOptions): number {
  if (options.port) {
    return Number(options.port)
  }

  try {
    const portFile = resolve(process.cwd(), '.orion/port')
    const port = readFileSync(portFile, 'utf-8').trim()
    return Number(port)
  } catch {}

  if (process.env.PORT) {
    return Number(process.env.PORT)
  }

  return 3000
}

export default async function repl(options: ReplOptions) {
  const expression = options.expression

  if (!expression) {
    console.error(chalk.red('Error: expression is required. Use -e "<expression>"'))
    process.exit(1)
  }

  const port = resolvePort(options)

  try {
    const response = await fetch(`http://localhost:${port}/__repl`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({expression}),
    })

    const data = await response.json()

    if (!data.success) {
      console.error(chalk.red(`Error: ${data.error}`))
      if (data.stack) {
        console.error(chalk.dim(data.stack))
      }
      process.exit(1)
    }

    if (data.result !== undefined) {
      console.log(
        typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2),
      )
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
      console.error(
        chalk.red(
          `Could not connect to dev server on port ${port}. Make sure "orion dev --repl" is running.`,
        ),
      )
    } else {
      console.error(chalk.red(`Error: ${error.message}`))
    }
    process.exit(1)
  }
}
