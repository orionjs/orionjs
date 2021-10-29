# Typed Model Package

Allows you to define a class that represents a model. This allows quicker development and better type checking of your models (since all class type definitions can be reused).

## Recommended usage example

### Folder structure

```
+-- models/
    +-- user/
        +-- index.ts
        +-- resolvers/
            +-- fullName.ts
```

### Resolver definition

```typescript
// models/user/resolvers/fullName.ts

export const fullNameResolver = async ({firstName, lastName}) => `${firstName} ${lastName}`

export const fullNameSchema = {
  returns: {type: String},
  resolve: fullNameResolver
}
```

### Model definition

```typescript
// models/user/index.ts

import {Prop, Schema, Resolver, getModelForClass} from '@orion-js/typed-model'
import {fullNameSchema, fullNameResolver} from './resolvers/fullName'

@Schema()
export class User {
  @Prop()
  firstName: string

  @Prop({optional: true})
  lastName: string

  @Resolver(fullNameSchema)
  fullName: typeof fullNameResolver
}

export default getModelForClass(User)
```
