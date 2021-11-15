export default function (fileContent: string, importString: string): string {
  if (/export default {\n}$/g.test(fileContent)) {
    return fileContent.replace(/{\n}$/g, `{\n  ${importString}\n}`)
  }
  if (/export default {\n}\n$/g.test(fileContent)) {
    return fileContent.replace(/{\n}\n$/g, `{\n  ${importString}\n}`)
  }
  if (/export default {/g.test(fileContent) && /}\n$/g.test(fileContent)) {
    return fileContent.replace(/\n}\n$/g, `,\n  ${importString}\n}\n`)
  }
  if (/export default {/g.test(fileContent) && /}$/g.test(fileContent)) {
    return fileContent.replace(/\n}$/g, `,\n  ${importString}\n}\n`)
  }
}
