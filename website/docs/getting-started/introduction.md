---
id: basics
title: Introduction
sidebar_label: Introduction
sidebar_position: 1
---

Orionjs was born with the vision of being a NodeJS framework that is focused on looking for simplicity when developing and being friendly for the developer.

This framework consists basically in controllers, services and models.
A controller is a function that starts an operation in your app, service is the logic of the application and a model contains the business rules.

## Architecture Proposed

What you will see below is a proposed architecture, but you are free to choose the one that best suits your needs.

![OrionJS](/img/docs/orionjs-architecture.png)

This architecture proposes, the use of the following folder structure in a project:

```
app
├── controllers
│  ├── http
│  ├── echoes
│  ├── jobs
│  └── resolvers
├── services
└── models
```
