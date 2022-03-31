---
id: cli
title: CLI
sidebar_label: CLI
---

The cli is a module that will help you creating, running, and building your Orionjs app.

You must install the cli globally in your computer by running the following command:

```sh
yarn global add @orion-js/cli
```

To list all available commands run

```sh
orion --help
```

## Create

This command will create a new Orionjs project using a boilerplate available in the Orionjs repo.

```sh
orion create --kit <kit-name> --name <app-name>
```

> Remember to always run `yarn install` after creating a new app.

Available kits:

- **graphql-fullstack**: Contains a basic Orionjs server app with a React app integrated to it.
- **graphql-app**: Contains a React Native app that integrates to a Orionjs server app.

## Start

This command will start the app for local developing. It compiles your code, refreshes to changes
and starts a MongoDB instance.

```sh
orion start
```

You can pass the `--shell` option to start Node inspector.

> The Google Chrome dev tool [Node Inspector Manager](https://chrome.google.com/webstore/detail/nodejs-v8-inspector-manag/gnhhdgbaldcilmgcpfddgdbkhjohddkj) will help you opening the console in Google Chrome.

It's a good practice to create a `start.sh` file that contains some local environment variables and ends with the `orion start` command. Like this:

```sh
# Add local env vars to this file
export CLIENT_URL="http://localhost:3010"
orion start --shell
```

To skip the provision of the MongoDB instace locally you can pass a `MONGO_URL` environment variable. In production this is required.

## Build

An Orionjs app compiles to a standard Node.js project.
You can deploy Orionjs to any server that run Node v8.
To build the app you must run the command:

```sh
orion build --output <build-dir>
```
