import chalk from 'chalk'

export default function () {
  console.log(chalk.bold('To run tests run the following command'))
  console.log(chalk.bold('ORION_DEV=LOCAL ORION_TEST=1 jest'))
  process.exit(1)
}
