---
id: service
title: Service
sidebar_label: Service
sidebar_position: 2
---

Services are the logic layer. Controllers activate functions in services. Many controllers can call the same service.

To define a service you need to create a class that has the `@Service` decorator.

```ts
import {Service} from '@orion-js/services'

@Service()
export class ExampleService {

  async getDoc() {
    ...
  }
}
```
