// returns the duration in milliseconds of the duration string
export default function getDurationInMillis(duration: string) {
  const match = duration.match(/^(\d+)([a-zA-Z]+)$/)
  if (!match) {
    throw new Error('Invalid duration string')
  }
  const [, amount, unit] = match
  const amountNumber = parseInt(amount, 10)
  const unitString = unit.toLowerCase()
  if (unitString === 'y') {
    return amountNumber * 31536000000
  } else if (unitString === 'mo') {
    return amountNumber * 2628000000
  } else if (unitString === 'w') {
    return amountNumber * 604800000
  } else if (unitString === 'd') {
    return amountNumber * 86400000
  } else if (unitString === 'h') {
    return amountNumber * 3600000
  } else if (unitString === 'm') {
    return amountNumber * 60000
  } else if (unitString === 's') {
    return amountNumber * 1000
  } else {
    throw new Error('Invalid duration string')
  }
}