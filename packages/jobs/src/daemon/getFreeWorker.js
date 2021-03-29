function returnWorkerOnExecutionFinished(worker) {
  return worker.currentExecution
    ? worker.currentExecution.then(() => worker).catch(() => worker)
    : worker
}

export default function (workers) {
  return Promise.race(workers.map(returnWorkerOnExecutionFinished))
}
