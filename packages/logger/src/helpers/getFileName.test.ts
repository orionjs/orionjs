import {improveFileName} from './getFileName'
import {describe, it, expect} from 'vitest'

describe('GetFileName', () => {
  it('Should clean @package in node_modules', () => {
    const fileName =
      '/Users/nicolaslopezj/Code/Projects/justo/drivers/server/node_modules/@orion-js/dogs/lib/services/WorkerService.js:39:25'
    const improvedFileName = improveFileName(fileName)
    expect(improvedFileName).toBe('@orion-js/dogs')
  })

  it('Should clean simple package in node modules', () => {
    const fileName =
      '/Users/nicolaslopezj/Code/Projects/justo/drivers/server/node_modules/dogs/lib/services/WorkerService.js:39:25'
    const improvedFileName = improveFileName(fileName)
    expect(improvedFileName).toBe('dogs')
  })
})
