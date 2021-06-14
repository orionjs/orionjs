export default function defaultGetNextRun({timesExecuted}) {
  return new Date((new Date).getTime() + (5000 * timesExecuted))
}
