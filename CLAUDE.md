# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orionjs is a Node.js/TypeScript framework for building GraphQL server applications. It's a monorepo with 21 packages under `/packages/*` managed by pnpm workspaces.

Website: https://orionjs.com

## Common Commands

```bash
# Root level
pnpm install              # Install dependencies
pnpm build                # Build all packages in dependency order
pnpm test                 # Run tests for all packages

# Per-package (from packages/<name>)
pnpm build                # Build package (tsup - ESM + CJS)
pnpm test                 # Run tests (vitest)
pnpm dev                  # Watch mode development

# Run a single test file
pnpm vitest packages/<name>/src/path/to/file.test.ts

# Publishing (uses changesets)
pnpm changeset            # Create changeset (always use patch)
pnpm changeset version    # Update versions
pnpm publish -r --otp=<code>  # Publish all packages
```

## Architecture

### Package Tiers

**Foundation** (no internal deps):
- `schema` - Schema definition utilities
- `helpers` - Utility functions (uuid, etc.)
- `services` - Dependency injection via TypeDI
- `resolvers` - GraphQL resolver helpers
- `logger` - Winston-based logging with OpenTelemetry

**Mid-tier** (depend on foundation):
- `models` - Model definition system
- `env` - Environment variable management (has CLI: `orion-env`)
- `http` - Express-based HTTP server
- `cryptography` - Encryption, signing, hashing
- `typed-model` - Type-safe model wrapper

**High-level** (heavy integration):
- `graphql` - Apollo Server v4 integration
- `mongodb` - MongoDB driver with encryption support
- `paginated-mongodb` - MongoDB pagination utilities

**Feature packages**:
- `dogs` - Background job scheduling
- `migrations` - Database migrations
- `file-manager` - S3 file management
- `echoes` - Event/message handling (Kafka)
- `components` - UI component system
- `core` - CLI tool for project scaffolding (bin: `orion`)

### Core Concepts

- **Controllers**: Entry points (HTTP routes, GraphQL resolvers, jobs, echoes)
- **Services**: Business logic with `@Inject()` for dependency injection
- **Repositories**: Data access layer
- **Schemas**: Data models for validation, GraphQL generation, TypeScript types

## Code Style

- TypeScript with explicit types (avoid `any`)
- Functions: <20 lines, verb-based naming (isX, hasX, executeX, saveX)
- Use early returns to avoid nesting
- RO-RO pattern: object params and object returns
- Prefer `for of` over `.forEach`; use `.map` for transformations
- File size limit: 200-300 lines max

## Testing

- Framework: Vitest with mongodb-memory-server
- Pattern: Arrange-Act-Assert
- Variable naming: `inputX`, `mockX`, `actualX`, `expectedX`
- Mock services with `mockService` from `@orion-js/services`
- Mocking is only for tests, never for dev/prod

## Tech Stack

- **Runtime**: Node.js v22, ESM modules
- **Build**: tsup (esbuild-based)
- **Formatter/Linter**: Biome (not ESLint/Prettier)
- **Package Manager**: pnpm with workspaces
- **GraphQL**: Apollo Server v4
- **Database**: MongoDB v6
- **DI**: TypeDI

## Important Notes

- Install dependencies with `--ignore-scripts` flag
- Use `pnpx tsx` to run TypeScript scripts
- Prefer resolvers over HTTP routes for client APIs
- Use `ValidationError` for data validation failures
- Use `UserError` for user-facing errors (not system errors)
