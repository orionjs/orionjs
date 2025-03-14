import {generateId} from '@orion-js/helpers'
import {createCollection} from '..'
import {describe, it, expect} from 'vitest'

describe('countDocuments operation', () => {
  it('should count all documents', async () => {
    const Tests = createCollection({name: generateId()})

    await Tests.insertMany([{hello: 'world'}, {hello: 'world'}])
    const count = await Tests.countDocuments({})
    expect(count).toBe(2)
  })

  it('should count filtering documents', async () => {
    const Tests = createCollection({name: generateId()})

    await Tests.insertMany([{name: '1'}, {name: '2'}])
    const count = await Tests.countDocuments({name: '1'})
    expect(count).toBe(1)
  })
})
