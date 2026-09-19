# Developer Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Git
- VS Code (recommended)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ncrstartupmap.git
cd ncrstartupmap
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 4. Setup Database

The data layer is Supabase (the app never opens a raw Postgres connection), so
migrations are applied with the Supabase CLI:

```bash
# One-time: link this checkout to your Supabase project
supabase link --project-ref <your-project-ref>

# Apply supabase/migrations/*.sql in order
supabase db push
supabase migration list        # confirm what is applied
```

Sample data is optional and needs `DATABASE_URL` (script-only variable):

```bash
node scripts/seed.mjs
```

### 5. Start Development

```bash
npm run dev
```

## VS Code Extensions

Recommended extensions:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Next.js Snippets
- GitLens

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
pg_isready
# Start if needed
pg_ctl start
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
