---
id: database
title: Database
sidebar_label: Database
sidebar_position: 7
---

By default OrionJS doesn't instantiate any connections to MongoDB, so this must be specified.

To add a connection instance to MongoDB, you will need to add a `MONGO_URL` environment variable in your `.env` configuration file.

### Example add MONGO_URL environment variable

```bash title=".env"
...
MONGO_URL="mongodb://localhost:3003/orionlocal"
...
```
