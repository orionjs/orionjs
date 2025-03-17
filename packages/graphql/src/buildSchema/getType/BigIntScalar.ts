import {GraphQLScalarType} from 'graphql'

const MAX_INT = Number.MAX_SAFE_INTEGER
const MIN_INT = Number.MIN_SAFE_INTEGER

const coerceBigInt = function coerceBigInt(value) {
  if (value === '') {
    throw new TypeError('BigInt cannot represent non 53-bit signed integer value: (empty string)')
  }
  const num = Number(value)
  if (num > MAX_INT || num < MIN_INT) {
    throw new TypeError('BigInt cannot represent non 53-bit signed integer value: ' + String(value))
  }
  const int = Math.floor(num)
  if (int !== num) {
    throw new TypeError('BigInt cannot represent non-integer value: ' + String(value))
  }
  return int
}

export default new GraphQLScalarType({
  name: 'BigInt',
  description:
    'The `BigInt` scalar type represents non-fractional signed whole numeric ' +
    'values. BigInt can represent values between -(2^53) + 1 and 2^53 - 1. ',
  serialize: coerceBigInt,
  parseValue: coerceBigInt,
  parseLiteral(ast) {
    if (ast.kind === 'IntValue') {
      const num = parseInt(ast.value, 10)
      if (num <= MAX_INT && num >= MIN_INT) {
        return num
      }
    }
    return null
  },
})
