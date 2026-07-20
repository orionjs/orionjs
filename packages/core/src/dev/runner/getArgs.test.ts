import {describe, expect, it} from 'bun:test'
import {devBuildPath} from '../devBuildPath'
import {getArgs} from './getArgs'

describe('getArgs', () => {
  it('runs the incremental development bundle with Node', () => {
    const result = getArgs(
      {node: true, repl: false, shell: false, clean: false, typecheck: false},
      {args: []},
    )

    expect(result).toEqual({
      startCommand: 'node',
      args: ['--enable-source-maps', devBuildPath],
    })
  })

  it('runs the incremental development bundle with Bun', () => {
    const result = getArgs(
      {node: false, repl: false, shell: false, clean: false, typecheck: false},
      {args: []},
    )

    expect(result).toEqual({
      startCommand: 'bun',
      args: ['--watch', devBuildPath],
    })
  })
})
