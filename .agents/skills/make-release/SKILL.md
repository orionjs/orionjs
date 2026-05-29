---
name: make-release
description: Releases a new version of the package
---

We have changes in the git uncommited files or just committed changes.

You must follow the steps:
- commit the changes
- make the changeset manually, only making PATCH changes
- run the `pnpm changeset version` command and ensure all changes are only PATCH (x.x.PATCH)
- do `git add .` and `git commit -m "changeset"` to commit the changeset
- publish the changes with `pnpm publish -r`. If fails by otp, `op item get Npmjs --otp` or ask me for the OTP token, then run with `pnpm publish -r --otp=<code>`

You must make sure to:
- Execute all commands with permissions to access the files and internet for publish (without sandbox)
- Ensure all changes are PATCH, not minor, not major
