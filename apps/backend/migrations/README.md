# Database Migrations

## How to Run Migrations in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Create a new query
5. Copy and paste the contents of each migration file
6. Click **Run** to execute

## Migration Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Creates all tables, indexes, and RLS policies |

## Order of Execution

Run migrations in numerical order:
1. `001_initial_schema.sql`

## Notes

- The migrations use PostgreSQL syntax compatible with Supabase
- Row Level Security (RLS) is enabled on all tables
- Since we use FastAPI JWT auth (not Supabase Auth), policies allow full access via service role
- Indexes are created for common query patterns
- The `updated_at` column is auto-updated via triggers
