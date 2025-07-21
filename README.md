# Orionjs

A Node framework to build GraphQL server apps.

[orionjs.com](https://orionjs.com)

## Development
In order to deploy orionjs in your local you have to do the following:

1. Fork the repo
2. Clone the project forked
3. Inside the folder created with the clone command, run the following command:
```shell
pnpm install
```
4. Then run the following command to bootstrap the project
```shell
pnpm bootstrap
```
5. Then we need to link an specific package you need with the following command (for example job package):
```shell
cd packages/jobs
pnpm link
```
6. In your project that is using orionjs, you need to run the following command in order to use the local instance of 
   the package:
```shell
pnpm link "@orion-js/jobs"
```
