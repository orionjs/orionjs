---
id: installation
title: Installation
sidebar_label: Installation
sidebar_position: 2
---

This page will help you install and build your first Orionjs project. If you already have Orionjs installed, you can skip this page.

## Setup the starter project

### Download the project

```
git clone https://github.com/orionjs/orionjs-services-starter [myapp]
```

### Install packages

```
yarn
```

### Add you local env vars

First generate a new .env file to store your local environment variables.

```
yarn orion-env init
```

Save the passsword of the file in the start.sh and test.sh files

Add the local mongo url and http port to the .env file.

The file should look like this:

```yml
version: '1.0'
publicKey: xxx
cleanKeys:
  http_port: 8080
  mongo_url: mongodb://localhost:27017/myapp
encryptedKeys: {}
```

### Start the app

```
sh start.sh
```
