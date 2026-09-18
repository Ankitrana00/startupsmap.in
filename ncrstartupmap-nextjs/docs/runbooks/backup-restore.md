# Backup & Restore Runbook

## Backup Schedule

- **Full backup:** Daily at 2:00 AM UTC
- **Incremental:** Every 6 hours
- **Retention:** 30 days

## Backup Commands

### Create Backup

```bash
npm run backup:db
```

### Verify Backup

```bash
npm run verify:backup <file.sql>
```

### List Backups

```bash
ls -la backups/
```

## Restore Procedures

### Full Restore

```bash
npm run restore:db <backup-file.sql>
```

### Point-in-Time Restore

```bash
# 1. Restore to latest backup
npm run restore:db latest-backup.sql

# 2. Replay WAL logs
pg_restore --wal-replay
```

## Emergency Contacts

- DBA: dba@company.com
- DevOps: devops@company.com
- On-call: PagerDuty
