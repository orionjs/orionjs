import {ModelClassBase, ModelToMongoSelector, MongoSelector} from '../..'
import getSelector from './getSelector'
import {TypedSchema, Prop} from '@orion-js/typed-model'
import {expect, it} from 'vitest'

const mongoFunctionMock = function <Model extends ModelClassBase>(selectorArg?: MongoSelector) {
  return getSelector<Model>(arguments)
}

it('should find by id when a string is passed', async () => {
  expect(mongoFunctionMock('hello')).toEqual({_id: 'hello'})
})

it('should return none selector when not an object or a string is passed', async () => {
  expect(mongoFunctionMock(null)).toEqual({_id: 'shouldReturnNull'})
  expect(mongoFunctionMock(undefined)).toEqual({_id: 'shouldReturnNull'})
})

it('should return full selector when no argument is passed', async () => {
  expect(mongoFunctionMock()).toEqual({})
})

it('should return the selector when a valid mongo selector is passed', async () => {
  const selector = {_id: 'hello', number: 123}
  expect(mongoFunctionMock(selector)).toBe(selector)
})

it('should allow passing $in to selectors with typed id', async () => {
  @TypedSchema()
  class Example {
    @Prop({type: String})
    _id: `prefix_${string}`
  }

  const selector1: ModelToMongoSelector<Example> = {_id: {$in: ['prefix_']}}
  const selector2: ModelToMongoSelector<Example> = 'prefix_1'
})
