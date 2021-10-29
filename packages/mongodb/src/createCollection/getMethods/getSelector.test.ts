import {MongoSelector} from '../..'
import getSelector from './getSelector'

const mongoFunctionMock = function (selectorArg?: MongoSelector) {
  return getSelector(arguments)
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
