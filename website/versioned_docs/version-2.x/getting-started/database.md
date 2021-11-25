---
id: database
title: Database
sidebar_label: Database
sidebar_position: 6
---

By default Orionjs creates a MongoDB instace locally in `mongodb://127.0.0.1:3001/orionlocal`, you can overwrite a `MONGO_URL` environment variable in `start.sh`.

```sh
# Add local env vars to this file
export CLIENT_URL="http://localhost:3010"
export MONGO_URL="mongodb://127.0.0.1:3001/orionlocal"
orion start --shell
```
