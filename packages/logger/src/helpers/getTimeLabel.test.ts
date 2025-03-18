import {describe, it, expect} from 'vitest'
import {getTimeLabel} from './getTimeLabel'

// Mock Date for consistent testing
const mockDate = new Date('2023-03-18T01:34:56')

// Test suite for getTimeLabel
describe('getTimeLabel', () => {
  it('should return the correct time label for a given date', () => {
    // Arrange
    const inputDate = mockDate
    const expectedLabel = '01:34:56'

    // Act
    const actualLabel = getTimeLabel(inputDate)

    // Assert
    expect(actualLabel).toBe(expectedLabel)
  })

  it('should return the current time label if no date is provided', () => {
    // Arrange
    const realDate = new Date()
    const expectedLabel = `${realDate.getHours().toString().padStart(2, '0')}:${realDate.getMinutes().toString().padStart(2, '0')}:${realDate.getSeconds().toString().padStart(2, '0')}`

    // Act
    const actualLabel = getTimeLabel(undefined)

    // Assert
    expect(actualLabel).toBe(expectedLabel)
  })
})
