export function getTimeLabel(date: Date): string {
  /**
   * Returns a time label in the format HH:MM:SS.
   * @param date - The date object to extract the time from.
   * @returns A string representing the time in HH:MM:SS format.
   */
  const time = date || new Date()
  const hoursWithZero = time.getHours().toString().padStart(2, '0')
  const minutesWithZero = time.getMinutes().toString().padStart(2, '0')
  const secondsWithZero = time.getSeconds().toString().padStart(2, '0')

  return `${hoursWithZero}:${minutesWithZero}:${secondsWithZero}`
}
