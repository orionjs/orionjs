import {exec} from 'node:child_process'

export default async function (command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({stdout, stderr})
      }
    })
  })
}
