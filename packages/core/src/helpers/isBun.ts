export function isBun(): boolean {
  return 'bun' in process.versions
}
