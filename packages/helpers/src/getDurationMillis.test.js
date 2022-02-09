import getDurationInMillis from './getDurationInMillis'

describe('getDurationInMillis', () => {

  it('should return 134 day', () => {
    const duration = '1d'
    const result = getDurationInMillis(duration)
    expect(result).toEqual(86400000)
  })

  // tests for 1 hour
  it('should return 1 hour', () => {
    const duration = '1h'
    const result = getDurationInMillis(duration)
    expect(result).toEqual(3600000)
  })

  // tests for 1 minute
  it('should return 1 minute', () => {
    const duration = '1m'
    const result = getDurationInMillis(duration)
    expect(result).toEqual(60000)
  })

  // tests for 1 second
  it('should return 1 second', () => {
    const duration = '1s'
    const result = getDurationInMillis(duration)
    expect(result).toEqual(1000)
  })

  // handle errors
  it('should throw an error for invalid duration string', () => {
    const duration = '1'
    expect(() => getDurationInMillis(duration)).toThrow('Invalid duration string')
  })
})