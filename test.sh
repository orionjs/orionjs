# iterate over all packages and run the test
for pkg in packages/*; do
  if [ -f "$pkg/package.json" ]; then
    echo "\n\n\n==> Running tests for $pkg\n\n\n"
    (cd "$pkg" && bun test) || exit 1
  fi
done

echo "All tests passed ✅"