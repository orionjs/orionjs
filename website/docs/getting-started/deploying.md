---
id: deploying
title: Deploying
sidebar_label: Deploying
sidebar_position: 5
---

An Orionjs app compiles to a standard Node.js project.

You can deploy Orionjs to any server that run Node v14.

## Building

Build your site for production:

```bash
yarn build
```

The static files are generated in the `build` folder.

## Deploy

Test your production build locally:

```bash
yarn start:prod
```

The build folder is now served at [http://localhost:3000](http://localhost:3000), (3000 is PORT defined in environment variable).

Now it's time to upload the folder to a server that allows you to run the compiled in production 🚀.
