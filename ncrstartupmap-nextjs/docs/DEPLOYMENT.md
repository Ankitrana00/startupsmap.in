# Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (optional, for caching)
- SMTP server (for emails)

## Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/ncr_startup_map
NEXTAUTH_SECRET=your-secret-key
REDIS_HOST=localhost
REDIS_PORT=6379
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Deployment Steps

### 1. Build

```bash
npm run build
```

### 2. Run Migrations

```bash
npm run db:migrate
```

### 3. Seed Database (optional)

```bash
npm run db:seed
```

### 4. Deploy

```bash
npm run deploy
```

## Platforms

### Vercel (Recommended)

```bash
npx vercel --prod
```

### AWS Lambda

```bash
npm run deploy:aws
```

### Docker

```bash
docker build -t ncr-startup-map .
docker run -p 3000:3000 ncr-startup-map
```
