export default function (fileContent: string, importString: string): string {
  if (/export default {/g.test(fileContent) && /}\n$/g.test(fileContent)) {
    return fileContent.replace(/\n}\n$/g, `,\n  ${importString}\n}\n`)
  } else if (/export default {/g.test(fileContent) && /}$/g.test(fileContent)) {
    return fileContent.replace(/\n}$/g, `,\n  ${importString}\n}\n`)
  } else {
    return fileContent.replace('export default {', `export default {\n  ${importString},`)
  }
}
