# Scaling Runbook

## Horizontal Scaling

### Current Setup

- **Server:** Next.js on Vercel/AWS
- **Database:** PostgreSQL (single instance)
- **Cache:** Redis (optional)

### Scaling Triggers

| Metric               | Threshold | Action       |
| -------------------- | --------- | ------------ |
| CPU > 80%            | 5 min     | Add instance |
| Memory > 85%         | 5 min     | Scale up     |
| DB Connections > 80% | 5 min     | Read replica |
| Cache hit rate < 50% | 10 min    | Add Redis    |

## Database Scaling

### Read Replicas

```sql
-- Create read replica
CREATE REPLICA DATABASE startup_map_read
FROM startup_map;
```

### Connection Pooling

```bash
# PgBouncer configuration
max_client_conn = 200
default_pool_size = 20
```

## Caching Strategy

### Application Cache

- Use TanStack Query caching
- Set appropriate stale times
- Implement cache invalidation

### Database Cache

- PostgreSQL query cache
- Redis for hot data
- CDN for static assets

## Monitoring

### Key Metrics

- Request latency (p95)
- Error rate
- Database query time
- Cache hit rate
- Memory usage

### Alert Rules

- Error rate > 1% for 5 min
- Latency p95 > 500ms
- Database connections > 90%
