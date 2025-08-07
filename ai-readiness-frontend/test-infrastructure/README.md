# SQL Test Infrastructure

This directory contains test infrastructure for validating SQL migration scripts before deploying to production Supabase.

## Features

- 🐳 Docker-based PostgreSQL test database
- 🧪 Automated SQL script testing
- ✅ Validates table creation, columns, indexes, foreign keys, and RLS policies
- 🔄 Database reset between tests
- 📊 Integration testing with sample data

## Usage

### Start Test Database
```bash
cd test-infrastructure
docker-compose up -d
```

### Run Tests
```bash
./test-sql-scripts.sh
```

### Reset Database
```bash
./test-sql-scripts.sh reset
```

### Stop & Clean
```bash
./test-sql-scripts.sh stop
```

## Test Coverage

The test suite validates:

1. **Table Creation** - All required tables are created
2. **Column Existence** - Critical columns like `user_id` exist
3. **Indexes** - Performance indexes are created
4. **Foreign Keys** - Referential integrity is maintained
5. **RLS Policies** - Row Level Security is properly configured
6. **Data Insertion** - Tables accept valid data
7. **Constraint Enforcement** - Foreign keys are enforced

## Adding New SQL Scripts

To test a new SQL script:

1. Add the script path to the `SQL_SCRIPTS` array in `test-sql-scripts.sh`
2. Run `./test-sql-scripts.sh`
3. Review the test output

## CI/CD Integration

You can integrate this into your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Test SQL Migrations
  run: |
    cd test-infrastructure
    docker-compose up -d
    ./test-sql-scripts.sh
    docker-compose down
```

## Environment Variables

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5434)
- `DB_USER` - Database user (default: postgres)
- `DB_PASS` - Database password (default: postgres)
- `DB_NAME` - Database name (default: test_db)