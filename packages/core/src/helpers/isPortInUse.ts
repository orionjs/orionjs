import net from 'node:net'

export default function (port) {
  return new Promise((resolve, reject) => {
    const tester = net
      .createServer()
      .once('error', (err: any) => {
        if (err.code !== 'EADDRINUSE') return reject(err)
        resolve(true)
      })
      .once('listening', () => {
        tester
          .once('close', () => {
            resolve(false)
          })
          .close()
      })
      .listen(port)
  })
}
