import waitAppStopped from './waitAppStopped'

export default async function () {
  global.appProcess.kill()
  await waitAppStopped()
}
