import net from 'net'

export default function(port) {
  return new Promise(function(resolve) {
    var server = net.createServer(function(socket) {
      socket.write('Echo server\r\n')
      socket.pipe(socket)
    })

    server.listen(port, '127.0.0.1')
    server.on('error', function(e) {
      resolve(true)
    })
    server.on('listening', function(e) {
      server.close()
      resolve(false)
    })
  })
}
