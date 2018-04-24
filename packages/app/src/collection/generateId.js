import crypto from 'crypto'

var UNMISTAKABLE_CHARS = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz'

const hexString = function(digits) {
  var numBytes = Math.ceil(digits / 2)
  var bytes
  // Try to get cryptographically strong randomness. Fall back to
  // non-cryptographically strong if not available.
  try {
    bytes = crypto.randomBytes(numBytes)
  } catch (e) {
    // XXX should re-throw any error except insufficient entropy
    bytes = crypto.pseudoRandomBytes(numBytes)
  }
  var result = bytes.toString('hex')
  // If the number of digits is odd, we'll have generated an extra 4 bits
  // of randomness, so we need to trim the last digit.
  return result.substring(0, digits)
}

const fraction = function() {
  var numerator = parseInt(hexString(8), 16)
  return numerator * 2.3283064365386963e-10 // 2^-32
}

const choice = function(arrayOrString) {
  var index = Math.floor(fraction() * arrayOrString.length)
  if (typeof arrayOrString === 'string') return arrayOrString.substr(index, 1)
  else return arrayOrString[index]
}

const randomString = function(charsCount, alphabet) {
  var digits = []
  for (var i = 0; i < charsCount; i++) {
    digits[i] = choice(alphabet)
  }
  return digits.join('')
}

export default function(charsCount) {
  if (!charsCount) {
    charsCount = 17
  }

  return randomString(charsCount, UNMISTAKABLE_CHARS)
}
