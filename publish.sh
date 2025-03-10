#!/bin/bash

PUBLISH_ARGS="$@"

for pkg in packages/*; do
  if [ -f "$pkg/package.json" ]; then
    (
      echo "Publicando $pkg..."
      cd "$pkg" && bun publish $PUBLISH_ARGS
    ) &
  fi
done

wait
echo "✅ Todos los paquetes han sido publicados."