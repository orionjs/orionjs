---
id: deploying
title: Deploying
sidebar_label: Deploying
sidebar_position: 5
---

An Orionjs app compiles to a standard Node.js project.

You can deploy Orionjs to any server that run Node.

The deploy script is very standard and should look like this:

- `yarn install` will install all the dependencies of your project, including the needed for the build
- `yarn build` will compile the project to a standard Node.js project and leave the files in the build folder
- `yarn start` will start the Node.js server on build/index.js

Rembember that you must set the environment variables needed to load the .env file before starting the server (`ORION_ENV_SECRET_KEY` and `ORION_ENV_FILE_PATH`).
