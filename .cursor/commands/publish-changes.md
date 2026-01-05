We have changes in the git uncommited files.

We want to:
- commit the changes
- apply the `pnpm changeset` using ALWAYS patch for all changes (but manually, since command is interactive)
- apply the `pnpm changeset version` command and ensure all changes are only PATCH (x.x.PATCH)
- do `git add .` and `git commit -m "changeset"` to commit the changeset
- publish the changes `pnpm publish -r`

You must make sure to:
- Execute all commands with permissions to access the files and internet for publish (without sandbox)
- Ensure all changes are PATCH, not minor, not major