function lastOfString(string: string, last: number) {
  return string.substring(string.length - last, string.length)
}

export function shortenMongoId(string: string) {
  return lastOfString(string, 5).toUpperCase()
}
