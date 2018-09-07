import fs from 'fs'

export default function(dirPath) {
  const filesToCopy = ['.npmrc']

  for (const fileName of filesToCopy) {
    const path = `./${fileName}`
    if (!fs.existsSync(path)) continue
    const newPath = `${dirPath}/${fileName}`
    fs.createReadStream(path).pipe(fs.createWriteStream(newPath))
  }
}
