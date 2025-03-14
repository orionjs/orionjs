import {generateId} from '@orion-js/helpers'
import {createCollection} from '..'
import {describe, it, expect} from 'vitest'

describe('estimatedDocumentCount operation', () => {
  it('should count all documents', async () => {
    const Tests = createCollection({name: generateId()})

    await Tests.insertMany([{hello: 'world'}, {hello: 'world'}])
    const count = await Tests.estimatedDocumentCount()
    expect(count).toBe(2)
  })
})
