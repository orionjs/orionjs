---
id: cli
title: CLI
sidebar_label: CLI
sidebar_position: 6
---

The cli is a module that will help you creating, running, and building your Orionjs app.

You must install the cli globally in your computer by running the following command:

```bash
yarn global add @orion-js/core
```

To list all available commands run

```bash
orion --help
```

## Create

This command will create a new Orionjs project using a boilerplate available in the Orionjs repo.

```bash
orion create --kit <kit-name> --name <app-name>
```

> Remember to always run `yarn install` after creating a new app.

Available kits:

- **typescript-starter**: Contains a basic Orionjs TypeScript starter project.
- **graphql-starter**: Contains a basic Orionjs GraphQL server.
- **http-starter**: Contains a basic Orionjs HTTP server.
- **service-starter**: Contains a basic Orionjs 3.1 Service architecture.

## Start

This command will start the app for local developing. It compiles your code, refreshes to changes
and starts a MongoDB instance.

```bash
orion start
```

You can pass the `--shell` option to start Node inspector.

> The Google Chrome dev tool [Node Inspector Manager](https://chrome.google.com/webstore/detail/nodejs-v8-inspector-manag/gnhhdgbaldcilmgcpfddgdbkhjohddkj) will help you opening the console in Google Chrome.

## Build

An Orionjs app compiles to a standard Node.js project.
You can deploy Orionjs to any server that run Node v8.
To build the app you must run the command:

```bash
orion build --output <build-dir>
```
