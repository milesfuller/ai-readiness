# Migration Files

Place your SQL migration files here. They will be applied in alphabetical order.

## Naming Convention

Use a naming convention that ensures proper ordering:

```
001_initial_schema.sql
002_add_user_tables.sql
003_add_indexes.sql
```

Or use timestamps:

```
20240101_000001_initial_schema.sql
20240102_000001_add_features.sql
```

## Migration Requirements

Each migration should:
1. Be idempotent (safe to run multiple times)
2. Use `IF NOT EXISTS` clauses where appropriate
3. Include comments explaining the changes
4. Be tested in the test environment first