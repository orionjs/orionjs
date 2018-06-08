export default function(workers) {
  for (const worker of workers) {
    if (worker.itsFree()) return worker
  }
}
