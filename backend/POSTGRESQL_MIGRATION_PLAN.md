# PostgreSQL Migration Plan

## Overview

This document outlines the migration strategy from SQLite (current development database) to PostgreSQL for production deployment.

## Current State

- **Database**: SQLite (`prisma/dev.db`)
- **ORM**: Prisma
- **Provider**: `sqlite` in `schema.prisma`
- **Schema Size**: ~838 lines with 25+ models

## Why Migrate to PostgreSQL?

| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| Concurrency | File-level locking | Row-level locking |
| Scalability | Single file, limited | Horizontal & vertical scaling |
| Production Use | Development only | Production-ready |
| Cloud Support | Limited | Azure, AWS RDS, Supabase, Neon |
| Features | Basic | Full ACID, JSON, Full-text search |
| Connection Pooling | Not supported | Built-in & PgBouncer |

## Migration Steps

### Phase 1: Preparation (Before Migration)

#### 1.1 Backup Current Data
```bash
# Create SQLite backup
cp backend/prisma/dev.db backend/prisma/dev.db.backup

# Export data to JSON for safety
bun run prisma/export-data.ts
```

#### 1.2 Update Prisma Schema

Update `backend/prisma/schema.prisma`:

```prisma
// Change from:
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// Change to:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 1.3 Handle SQLite-specific Syntax

Review and update any SQLite-specific patterns:

| SQLite | PostgreSQL | Action Required |
|--------|------------|-----------------|
| `AUTOINCREMENT` | `SERIAL` | Handled by Prisma |
| `DATETIME` | `TIMESTAMP` | Handled by Prisma |
| `TEXT` for JSON | `JSONB` | Consider updating |
| Case-insensitive `LIKE` | `ILIKE` | Update queries |

### Phase 2: PostgreSQL Setup

#### 2.1 Choose a PostgreSQL Provider

**Recommended Options:**

1. **Supabase** (Recommended for quick setup)
   - Free tier: 500MB database
   - Built-in Auth, Realtime
   - Easy dashboard

2. **Neon** (Recommended for serverless)
   - Free tier: 0.5GB storage
   - Serverless scaling
   - Branching support

3. **Azure Database for PostgreSQL**
   - Production-grade
   - Integrated with Azure services
   - Managed backups

4. **Railway**
   - Easy deployment
   - Integrated with CI/CD

#### 2.2 Create Database

```bash
# For Supabase (get URL from dashboard)
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# For Neon (get URL from dashboard)
# Format: postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require
```

#### 2.3 Environment Variables

Update `.env`:

```env
# Development (SQLite fallback)
DATABASE_URL="postgresql://postgres:password@localhost:5432/helfer_dev"

# Production (from provider)
DATABASE_URL="postgresql://..."
```

### Phase 3: Schema Migration

#### 3.1 Generate PostgreSQL Migrations

```bash
cd backend

# Reset migrations directory (keep backup)
mv prisma/migrations prisma/migrations_sqlite_backup

# Generate fresh PostgreSQL migrations
bunx prisma migrate dev --name init_postgres

# Or create from existing schema
bunx prisma db push
```

#### 3.2 Schema Optimizations for PostgreSQL

Consider these optimizations:

```prisma
// Use native PostgreSQL JSON type
model UserProfile {
  // From:
  businessCategories String? // JSON array stored as text
  
  // To:
  businessCategories Json? @db.JsonB
}

// Add indexes for frequently queried fields
model Order {
  @@index([status, createdAt])
  @@index([userId, status])
}

model Product {
  @@index([sellerId, isActive])
  @@index([categoryId])
}

// Full-text search preparation
model Product {
  // Consider adding search vectors
  searchVector String? @db.TsVector
}
```

### Phase 4: Data Migration

#### 4.1 Export from SQLite

Create `backend/prisma/export-sqlite.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function exportData() {
  const tables = [
    'user', 'session', 'account', 'verification',
    'userProfile', 'warehouse', 'floorPlan', 'area',
    'rack', 'shelf', 'bin', 'product', 'productVariant',
    'productLocation', 'category', 'order', 'orderItem',
    'address', 'earning', 'shippingLocation', 'adminSettings'
  ];

  const data: Record<string, unknown[]> = {};

  for (const table of tables) {
    try {
      // @ts-ignore - dynamic access
      data[table] = await prisma[table].findMany();
      console.log(`Exported ${data[table].length} records from ${table}`);
    } catch (error) {
      console.error(`Error exporting ${table}:`, error);
    }
  }

  fs.writeFileSync(
    'prisma/data-export.json',
    JSON.stringify(data, null, 2)
  );
  
  console.log('Export complete!');
}

exportData().finally(() => prisma.$disconnect());
```

#### 4.2 Import to PostgreSQL

Create `backend/prisma/import-postgres.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function importData() {
  const data = JSON.parse(
    fs.readFileSync('prisma/data-export.json', 'utf-8')
  );

  // Import in dependency order
  const importOrder = [
    'user', 'session', 'account', 'verification',
    'userProfile', 'category', 'warehouse', 'floorPlan',
    'area', 'rack', 'shelf', 'bin', 'product',
    'productVariant', 'productLocation', 'address',
    'order', 'orderItem', 'earning', 'shippingLocation',
    'adminSettings'
  ];

  for (const table of importOrder) {
    if (data[table]?.length > 0) {
      try {
        // @ts-ignore - dynamic access
        await prisma[table].createMany({
          data: data[table],
          skipDuplicates: true,
        });
        console.log(`Imported ${data[table].length} records to ${table}`);
      } catch (error) {
        console.error(`Error importing ${table}:`, error);
      }
    }
  }

  console.log('Import complete!');
}

importData().finally(() => prisma.$disconnect());
```

### Phase 5: Application Updates

#### 5.1 Update Connection Configuration

Update `backend/server/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  // Connection pooling for production
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

#### 5.2 Update Case-Insensitive Searches

Find and update all `contains` searches:

```typescript
// SQLite (case-insensitive by default)
where: { name: { contains: search } }

// PostgreSQL (case-sensitive, use mode: 'insensitive')
where: { name: { contains: search, mode: 'insensitive' } }
```

Files to update:
- `backend/server/routers/admin/admin.ts` - seller search
- `backend/server/routers/admin/orders.ts` - order search
- `backend/server/routers/admin/customers.ts` - customer search
- `backend/server/routers/admin/products.ts` - product search
- `backend/server/routers/admin/drivers.ts` - driver search

### Phase 6: Testing

#### 6.1 Local PostgreSQL Testing

```bash
# Run PostgreSQL locally with Docker
docker run --name postgres-local \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=helfer_dev \
  -p 5432:5432 \
  -d postgres:15

# Update .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/helfer_dev"

# Run migrations
bunx prisma migrate deploy

# Run seed
bun run prisma/seed.ts

# Start server
bun run dev
```

#### 6.2 Test Checklist

- [ ] User authentication (login, signup, OTP)
- [ ] Admin dashboard loads
- [ ] Seller management (list, details, approve/reject)
- [ ] Order management (list, details, update status)
- [ ] Customer management (list, filter, search)
- [ ] Product management (list, filter, search)
- [ ] Inventory overview
- [ ] Analytics page data
- [ ] Settings page

### Phase 7: Production Deployment

#### 7.1 Production Checklist

- [ ] PostgreSQL instance provisioned
- [ ] DATABASE_URL set in production environment
- [ ] SSL/TLS enabled for database connection
- [ ] Connection pooling configured (PgBouncer or provider's pooler)
- [ ] Backups scheduled
- [ ] Monitoring set up (query performance, connections)

#### 7.2 Deployment Commands

```bash
# Generate Prisma client for production
bunx prisma generate

# Run migrations in production
bunx prisma migrate deploy

# Verify connection
bunx prisma db execute --stdin <<< "SELECT 1"
```

### Rollback Plan

If issues occur during migration:

1. **Immediate**: Revert DATABASE_URL to SQLite
2. **Schema**: Restore `prisma/migrations_sqlite_backup`
3. **Data**: Use `dev.db.backup`

```bash
# Emergency rollback
cp backend/prisma/dev.db.backup backend/prisma/dev.db
# Update schema.prisma back to sqlite
# Restart server
```

## Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| Preparation | 1-2 hours | Backup, documentation |
| PostgreSQL Setup | 30 mins | Choose provider, create instance |
| Schema Migration | 1-2 hours | Update schema, generate migrations |
| Data Migration | 1-2 hours | Export/import, verify |
| Application Updates | 2-4 hours | Update queries, test |
| Testing | 2-4 hours | Full regression testing |
| Production Deploy | 1-2 hours | Deploy, monitor |

**Total Estimated Time: 1-2 days**

## Recommended Provider Setup

### Supabase (Quickest)

1. Create account at supabase.com
2. Create new project
3. Go to Settings > Database
4. Copy connection string (URI format)
5. Update `DATABASE_URL` in `.env`

### Neon (Serverless)

1. Create account at neon.tech
2. Create new project
3. Copy connection string from dashboard
4. Add `?sslmode=require` if not present
5. Update `DATABASE_URL` in `.env`

## Post-Migration Optimizations

After successful migration, consider:

1. **Indexes**: Add indexes based on query patterns
2. **Connection Pooling**: Configure PgBouncer for high traffic
3. **Read Replicas**: Set up read replicas for analytics queries
4. **Monitoring**: Set up query performance monitoring
5. **Backups**: Configure automated daily backups

---

*Document Version: 1.0*  
*Last Updated: January 2026*
