import net from 'net'

export default function(port) {
  return new Promise(function(resolve, reject) {
    const tester = net
      .createServer()
      .once('error', function(err) {
        if (err.code !== 'EADDRINUSE') return reject(err)
        resolve(true)
      })
      .once('listening', function() {
        tester
          .once('close', function() {
            resolve(false)
          })
          .close()
      })
      .listen(port)
  })
}
