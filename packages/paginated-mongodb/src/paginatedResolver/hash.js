export default function(string = '') {
  return JSON.stringify(string)
    .split('')
    .reduce((prevHash, currVal) => (prevHash << 5) - prevHash + currVal.charCodeAt(0), 0)
}
