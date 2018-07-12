import date from './date'
import Errors from '../Errors'

test('return an error when the value is incorrect', async () => {
  expect(date.validate(['Hello'])).toBe(Errors.NOT_A_DATE)
  expect(date.validate({name: 'Nicolás'})).toBe(Errors.NOT_A_DATE)
  expect(date.validate('A real string')).toBe(Errors.NOT_A_DATE)
  expect(date.validate(1234)).toBe(Errors.NOT_A_DATE)
})

test('return no error when the value is correct', async () => {
  expect(date.validate(new Date())).toBeFalsy()
})

test('dont autoConvert if not specified', async () => {
  const info = {options: {autoConvert: false}}
  expect(date.clean('2018-07-21T16:00:00.000Z', info)).toBe('2018-07-21T16:00:00.000Z')
})

test('return the same type if invalid is passed', async () => {
  const info = {options: {autoConvert: true}}
  expect(date.clean([123], info)).toEqual([123])
})

test('clean string types', async () => {
  const info = {options: {autoConvert: true}}
  expect(date.clean('2018-07-21T16:00:00.000Z', info)).toEqual(new Date('2018-07-21T16:00:00.000Z'))
})

test('clean number types', async () => {
  const info = {options: {autoConvert: true}}
  expect(date.clean(1532188800000, info)).toEqual(new Date('2018-07-21T16:00:00.000Z'))
})

test('return the same value when invalid types are passed', async () => {
  const info = {options: {autoConvert: true}}
  expect(date.clean('Nicolás', info)).toBe('Nicolás')
  expect(date.clean(1532188800000000000, info)).toBe(1532188800000000000)
})
