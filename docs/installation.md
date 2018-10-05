---
id: installation
title: Installation
sidebar_label: Installation
---

This page will help you install and build your first React Native app. If you already have React Native installed, you can skip this page.

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

## Installing the Atom plugin

The atom plugin named "orionjs", mantained by the Orionjs team, will help you writing your Orionjs app.

## Running the app

Run the following command:

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

