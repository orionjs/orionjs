import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {extname, join} from 'node:path'
import chokidar from 'chokidar'
import * as esbuild from 'esbuild'
import {devBuildPath} from '../devBuildPath'
import type {Runner, RunnerOptions} from '../runner'

function getPackageName(specifier: string) {
  const segments = specifier.split('/')
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]
}

/**
 * Keep dependencies external while making source imports valid in plain Node
 * ESM. tsx accepts extensionless package subpaths and JSON imports, but Node
 * requires explicit extensions and JSON attributes.
 */
function nodeExternalCompatibilityPlugin(): esbuild.Plugin {
  const requireFromApp = createRequire(join(process.cwd(), 'package.json'))

  return {
    name: 'orion-node-external-compatibility',
    setup(build) {
      build.onResolve({filter: /^[^./].*\.json$/}, args => {
        try {
          return {path: requireFromApp.resolve(args.path)}
        } catch {
          return undefined
        }
      })

      build.onResolve({filter: /^[^./]/}, args => {
        const packageName = getPackageName(args.path)
        if (args.path === packageName || extname(args.path)) return undefined

        try {
          const packageJsonPath = requireFromApp.resolve(`${packageName}/package.json`)
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
            exports?: unknown
          }
          if (packageJson.exports) return undefined

          const resolvedExtension = extname(requireFromApp.resolve(args.path))
          if (!resolvedExtension) return undefined

          return {path: `${args.path}${resolvedExtension}`, external: true}
        } catch {
          return undefined
        }
      })
    },
  }
}

/**
 * Bundle application code once and rebuild it incrementally on edits.
 *
 * Running the bundle avoids making Node transform every TypeScript module on
 * every restart. Dependencies remain external so their native Node behavior
 * stays identical to a production build.
 */
export async function watchAndBundle(
  runner: Runner,
  options: RunnerOptions,
  onFilesChanged?: () => void,
) {
  let hasSuccessfulBuild = false
  let buildStartedAt = Date.now()
  let rebuildInProgress = false
  let rebuildRequested = false
  let rebuildTimer: NodeJS.Timeout | undefined

  const context = await esbuild.context({
    entryPoints: ['./app/index.ts'],
    outfile: devBuildPath,
    tsconfig: './tsconfig.json',
    format: 'esm',
    platform: 'node',
    bundle: true,
    target: 'node22',
    sourcemap: true,
    packages: 'external',
    plugins: [
      nodeExternalCompatibilityPlugin(),
      {
        name: 'orion-dev-restart',
        setup(build) {
          build.onStart(() => {
            buildStartedAt = Date.now()
          })

          build.onEnd(result => {
            if (result.errors.length > 0) {
              // Serving the previous bundle hides the broken save from the
              // browser. Stop it so the normal dev error state is visible,
              // then let the next successful build recover automatically.
              runner.stop()
              return
            }

            console.log(`=> Application bundled in ${Date.now() - buildStartedAt}ms`)

            if (hasSuccessfulBuild && options.node) {
              runner.restart()
            } else if (!hasSuccessfulBuild) {
              hasSuccessfulBuild = true
              runner.start()
            } else {
              // Bun normally reloads itself after the bundle changes. It may
              // instead be stopped after a build/type error and need recovery.
              runner.start()
            }
          })
        },
      },
    ],
  })

  const rebuild = async () => {
    if (rebuildInProgress) {
      rebuildRequested = true
      return
    }

    rebuildInProgress = true
    do {
      rebuildRequested = false
      try {
        await context.rebuild()
      } catch {
        // esbuild already prints diagnostics. Keep watching so the next edit
        // can recover without restarting the Orion CLI.
      }
    } while (rebuildRequested)
    rebuildInProgress = false
  }

  await rebuild()

  const watcher = chokidar.watch(['./app', './tsconfig.json'], {ignoreInitial: true})
  watcher.on('all', () => {
    onFilesChanged?.()
    clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(rebuild, 20)
  })
  watcher.on('error', error => console.error(`Unable to watch application files: ${error.message}`))

  return {context, watcher}
}
