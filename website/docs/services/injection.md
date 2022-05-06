---
id: injection
title: Injection
sidebar_label: Injection
sidebar_position: 6
---

Injection is core part of the framework. It is responsible for connecting all your modules.

Orionjs uses [TypeDI](https://github.com/typestack/typedi) to inject dependencies.

To use `@Inject()` decorator, you need to install initialize boths modules with any module decorator (`@Service`, `@Repository`, etc).

### Example

```ts
import {Inject, Service} from '@orion-js/services'
import {ExampleRepository} from 'app/exampleComponent/repos/Example'
import {ExampleSchema} from 'app/exampleComponent/schemas/ExampleSchema'

@Service()
export class ExampleService {
  @Inject()
  private exampleRepository: ExampleRepository

  async getExample(id: string): Promise<ExampleSchema> {
    return await this.exampleRepository.getExampleById(id)
  }
}
```

### Rules

You can connect any module to any other module with `@Inject()` decorator, without restrictions. But here are some recommendations:

- **Do not inject controllers between each other.** If you end up doing this it probably means that you are not writing the logic of your application in Services. You should try to write most of the code in services. A good excersise is to imagine that you will execute the same action in a GraphQL controller and in a HTTP controller, all the repeated code should be in a service.
- **Do not inject controllers into services or repositories.** All of the functions that your controllers have should be only for exposing for outside of your app.

### Circular injection

You may encounter circular injection. It will fail on runtime but you can fix it by doing this:

```ts
// Before
@Inject()
private exampleRepository: ExampleRepository

// After
@Inject(() => ExampleRepository)
private exampleRepository: ExampleRepository
```
