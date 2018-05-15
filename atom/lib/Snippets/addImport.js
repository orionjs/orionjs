'use babel'

export default function(fileContent, importString) {
  if (/import .+\n\n/g.test(fileContent)) {
    return fileContent.replace(/import .+\n\n/g, function(input) {
      return input.replace(/\n\n/g, '\n') + `${importString}\n\n`
    })
  } else {
    return `${importString}\n${fileContent}`
  }
}
