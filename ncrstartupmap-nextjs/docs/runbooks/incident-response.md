# Incident Response Runbook

## Severity Levels

### P1 - Critical

- Site down
- Data loss
- Security breach

**Response Time:** 15 minutes
**Resolution Target:** 1 hour

### P2 - High

- Major feature broken
- Performance degraded
- API errors > 5%

**Response Time:** 30 minutes
**Resolution Target:** 4 hours

### P3 - Medium

- Minor feature broken
- Non-critical bug
- UI issues

**Response Time:** 2 hours
**Resolution Target:** 24 hours

### P4 - Low

- Cosmetic issues
- Feature requests
- Documentation

**Response Time:** 24 hours
**Resolution Target:** 1 week

## Escalation Path

1. On-call engineer
2. Tech lead
3. Engineering manager
4. CTO

## Communication Templates

### Initial Alert

```
[P{severity}] {incident-title}
Status: Investigating
Impact: {description}
ETA: {time}
```

### Update

```
[P{severity}] {incident-title}
Status: {investigating|mitigated|resolved}
Update: {description}
ETA: {time}
```
