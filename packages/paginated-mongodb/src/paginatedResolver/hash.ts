export default function (obj: object = {}) {
  return JSON.stringify(obj)
    .split('')
    .reduce((prevHash, currVal) => (prevHash << 5) - prevHash + currVal.charCodeAt(0), 0)
}
