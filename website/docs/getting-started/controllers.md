---
id: controllers
title: Controllers
sidebar_label: Controllers
sidebar_position: 3
---

Controllers are the starting point of all code executions. There are 4 types of controllers:

- **HTTP** controllers who handle HTTP requests
- **GraphQL** controller who handle GraphQL requests. This have sub-types:
  - GraphQL Query controllers
  - GraphQL Mutation controllers
  - GraphQL Subscriptions controllers
  - GraphQL Model Resolvers controllers
- **Jobs** controllers who execute jobs
- **Echoes** controllers who communicate between services

In order to create a basic controller, we use classes and decorators. Decorators associate classes with required metadata and enable Nest to create a routing map (tie requests to the corresponding controllers).
