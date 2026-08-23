export function validatePartitionsCount(nPartitions: number) {
  if (!Number.isInteger(nPartitions) || nPartitions <= 0) {
    throw new Error('nPartitions must be a positive integer')
  }
}

export function getRandomPartition(nPartitions: number) {
  return Math.floor(Math.random() * nPartitions)
}

export function createShuffledPartitions(nPartitions: number) {
  const partitions = Array.from({length: nPartitions}, (_, partition) => partition)

  for (let index = partitions.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[partitions[index], partitions[swapIndex]] = [partitions[swapIndex], partitions[index]]
  }

  return partitions
}
