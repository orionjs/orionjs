import fs from 'node:fs'

const getDirectories = dir =>
  fs
    .readdirSync(dir)
    .map(file => `${dir}/${file}`)
    .filter(_file => {
      const stats = fs.statSync(dir)
      return stats.isDirectory()
    })

const getSymlinks = () => {
  const symlinks = []
  const dirs = getDirectories('./node_modules')
  for (const dir of dirs) {
    const stats = fs.statSync(dir)
    const isSymlink = stats.isSymbolicLink()
    if (isSymlink) {
      symlinks.push(dir)
    }

    if (dir.includes('@orion-js')) {
      const subDirs = getDirectories(dir)
      for (const subDir of subDirs) {
        symlinks.push(`${subDir}/lib`)
      }
    }
  }

  return symlinks
}

export default function () {
  const paths = ['node_modules']
  const symlinks = getSymlinks()
  return [...paths, ...symlinks]
}
