---
id: installation
title: Installation
sidebar_label: Installation
sidebar_position: 1
---

This page will help you install and build your first Orionjs project. If you already have Orionjs installed, you can skip this page.

## Requirements

- Node: 14 (LTS)

## Installing Orionjs CLI

Assuming that you have Node installed, you can use yarn to install the `orion` command line utility:

```sh
yarn global add @orion-js/cli
```

## Using a starter kit

Now that you have the `orion` command you can download a starter kit. Let's start with the `graphql-fullstack` kit. This will create a new project with a already set up client and server:

```sh
orion create --kit graphql-fullstack --name myapp
```

This command will create a folder with two subfolders: `web` and `server`.
You should enter both folders and run `yarn install` on each one.

### Example use yarn install in server folder

```sh
cd server
yarn install
```

### Example use yarn install in web folder

```sh
cd web
yarn install
```

## Installing the Atom plugin

The atom plugin named "orionjs", mantained by the Orionjs team, will help you writing your Orionjs app.

## Running the server app

Run the following command in `server` folder:

```sh
orion start
```

The starter kit comes with a start.sh file that can receive environment variables and the start command.

```sh
# Add local env vars to this file
export CLIENT_URL="http://localhost:3010"
export VARIABLE_1="example"
orion start --shell
```

## Running the web app

Run the following command in `web` folder:

```sh
yarn start
```
