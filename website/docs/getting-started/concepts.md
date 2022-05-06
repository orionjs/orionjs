---
id: concepts
title: Core Concepts
sidebar_label: Core Concepts
sidebar_position: 3
---

## Controllers

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

## Repositories

Repositories are the data access layer. They are responsible for fetching data from the database and storing it. You can also use repositories access any kind of data, such as files, external services, etc.

You should only use repositories to fetch data from the database and not to manipulate it.

## Services

Services are the business logic layer. Controllers activate functions in services.

## Schemas

Schemas are the data model. They are core concept in the reusability of the code in Orionjs. They are used to validate data and to create the data model for the database. Also, they are used to create the GraphQL schema and TypeScript interfaces.

## Component

Component are the building blocks of the application. An app can have many components. Components have controllers, repositories, services, schemas, etc.

## Folder structure

This is the proposed folder structure for the application:

```
app
├── component-x
│   ├── controllers
│   │   ├── echoes
│   │   │   └── EchoesControllerName
│   │   │       └── index.ts
│   │   ├── http
│   │   │   └── RoutesControllerName
│   │   │       └── index.ts
│   │   ├── jobs
│   │   │   └── JobsControllerName
│   │   │       └── index.ts
│   │   ├── modelResolvers
│   │   │   └── ExampleModelResolversController
│   │   │       └── index.ts
│   │   └── resolvers
│   │       └── ResolversControllerName
│   │           └── index.ts
│   ├── repos
│   │   └── RepositoryName
│   │       └── index.ts
│   ├── schemas
│   │   └── SchemaName
│   │       └── index.ts
│   ├── services
│   │   └── ServiceName
│   │       └── index.ts
│   └── index.ts
├── component-y
│   ...
├── config
│   ...
└── index.ts
```
