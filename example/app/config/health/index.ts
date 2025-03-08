import {checkDB} from './checkDB'

const checkers = [checkDB]

export async function isServerHealthy() {
  await Promise.all(checkers.map(checker => checker()))

  return 'yes'
}
