import colors from 'colors/safe'

export default function () {
  console.log(colors.bold(`To run tests run the following command`))
  console.log(colors.bold(`ORION_DEV=LOCAL ORION_TEST=1 jest`))
  process.exit(1)
}
