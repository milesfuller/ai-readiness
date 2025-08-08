# Database Contracts System

## Overview

The contracts directory contains the single source of truth for all database schemas and operations. This ensures consistency between the database, API, and frontend components.

## Structure

```
contracts/
├── database.ts        # Core database schemas (surveys, users, etc.)
├── organizations.ts   # Organization-related schemas
├── api.ts            # API contract definitions
├── components.ts     # Component prop contracts
└── README.md         # This file
```

## Why Contracts?

1. **Single Source of Truth**: All database schemas defined in one place
2. **Type Safety**: Full TypeScript support with Zod validation
3. **Runtime Validation**: Validate data at runtime, not just compile time
4. **Test Coverage**: Integration tests ensure contracts match database
5. **Documentation**: Self-documenting schemas with clear types

## Usage

### Import Schemas

```typescript
import { 
  Organization, 
  OrganizationMember,
  validateOrganization 
} from '@/contracts/organizations';
```

### Use in API Routes

```typescript
// app/api/organizations/route.ts
import { OrganizationService } from '@/services/database/organization.service';

const orgService = new OrganizationService(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    // Service handles validation using contracts
    const org = await orgService.createOrganization(body, userId);
    return Response.json(org);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
```

### Use in Components

```typescript
// components/OrganizationCard.tsx
import { Organization } from '@/contracts/organizations';

interface OrganizationCardProps {
  organization: Organization;
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
  // TypeScript knows all properties of Organization
  return (
    <div>
      <h2>{organization.name}</h2>
      <p>{organization.description}</p>
      {organization.industry && <span>{organization.industry}</span>}
    </div>
  );
}
```

## Database Services

All database operations go through service classes that use contracts:

```typescript
services/
└── database/
    ├── organization.service.ts  # Organization CRUD operations
    ├── survey.service.ts        # Survey operations
    └── user.service.ts          # User operations
```

### Service Pattern

```typescript
class OrganizationService {
  async createOrganization(data: Partial<Organization>) {
    // 1. Validate with contract schema
    const validated = OrganizationsTableSchema.parse(data);
    
    // 2. Execute database operation
    const result = await supabase.from('organizations').insert(validated);
    
    // 3. Validate response with contract
    return validateOrganization(result);
  }
}
```

## Testing

### Run Integration Tests

```bash
# Start Docker PostgreSQL
npm run test:integration:docker

# Run tests without Docker (requires PostgreSQL)
npm run test:integration

# Run with coverage
npm run test:integration:coverage

# Clean up Docker
npm run test:integration:docker:down
```

### Test Structure

```typescript
describe('Organization Database Integration Tests', () => {
  it('should create organization with valid data', async () => {
    const orgData: Partial<Organization> = {
      name: 'Test Org',
      industry: 'technology'
    };
    
    const org = await orgService.createOrganization(orgData, userId);
    
    expect(org).toMatchSchema(OrganizationsTableSchema);
  });
});
```

## Adding New Entities

### 1. Define Schema in Contracts

```typescript
// contracts/new-entity.ts
export const NewEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  // ... other fields
});

export type NewEntity = z.infer<typeof NewEntitySchema>;
```

### 2. Create Service

```typescript
// services/database/new-entity.service.ts
export class NewEntityService {
  async create(data: Partial<NewEntity>): Promise<NewEntity> {
    const validated = NewEntitySchema.parse(data);
    // ... database operation
  }
}
```

### 3. Write Integration Tests

```typescript
// tests/integration/database/new-entity.test.ts
describe('NewEntity Integration Tests', () => {
  it('should create entity', async () => {
    // Test implementation
  });
});
```

### 4. Create Migration

```sql
-- supabase/migrations/xxx_new_entity.sql
CREATE TABLE new_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  -- ... other columns
);
```

## Best Practices

1. **Always use contracts** for database operations
2. **Validate at boundaries** (API routes, form submissions)
3. **Test with real database** using Docker PostgreSQL
4. **Keep schemas in sync** with migrations
5. **Use service classes** for all database operations
6. **Document complex schemas** with comments
7. **Version migrations** properly

## Common Issues

### Organization Creation Errors

If you're getting errors creating organizations:

1. Check that all required fields are provided
2. Ensure user has proper permissions
3. Verify database migrations are applied
4. Check foreign key constraints

### Type Mismatches

If TypeScript types don't match database:

1. Regenerate types: `npm run generate:types`
2. Check migration files match contract schemas
3. Ensure all migrations are applied

### Test Failures

If integration tests fail:

1. Ensure Docker is running: `docker ps`
2. Check PostgreSQL logs: `docker logs ai-readiness-test-db`
3. Verify migrations applied: Check test output
4. Clean test data: Tests should clean up after themselves

## Migration to Contracts

For existing code not using contracts:

1. **Identify database queries** in your code
2. **Replace with service calls** that use contracts
3. **Update imports** to use contract types
4. **Add validation** at API boundaries
5. **Write tests** for the migrated code

Example migration:

```typescript
// Before (direct Supabase call)
const { data } = await supabase
  .from('organizations')
  .insert({ name: 'Test' });

// After (using service with contracts)
const org = await orgService.createOrganization(
  { name: 'Test' },
  userId
);
```

## Support

For issues or questions:
1. Check integration test output for schema mismatches
2. Verify contracts match your database migrations
3. Ensure all required environment variables are set
4. Run validation: `npm run validate:contracts`