# Automatic Lead Monitoring System

## Overview
Automatic monitoring system that periodically checks Reddit for new posts matching campaign keywords without exhausting API rate limits.

## Recommended Polling Intervals

### Tiered Approach Based on Campaign Activity
1. **Hot Campaigns** (high-value keywords): Every 30 minutes
2. **Active Campaigns**: Every 1 hour  
3. **Standard Campaigns**: Every 2-4 hours
4. **Inactive Campaigns**: Every 6-12 hours

### Smart Polling Features
- **Time-based adjustment**: More frequent during business hours
- **Keyword priority**: Higher frequency for competitive keywords
- **Result-based throttling**: Reduce frequency if no new posts found repeatedly
- **Burst protection**: Spread API calls across the interval

## Implementation Strategy

### 1. Scheduled Cloud Function
```typescript
// Run every 30 minutes
export const monitorRedditPosts = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async (context) => {
    // Process campaigns in batches
    // Check for new posts
    // Add to lead generation queue
  });
```

### 2. Campaign-Based Monitoring
- Each campaign tracks its last check timestamp
- Stagger checks to avoid API bursts
- Priority queue for hot keywords

### 3. Incremental Updates
- Only fetch posts newer than last check
- Use Reddit's 'before' parameter to limit results
- Store thread IDs to avoid duplicates

## API Usage Optimization

### Request Batching
- Combine multiple keyword searches when possible
- Use Reddit's multireddit search syntax: `(keyword1 OR keyword2)`
- Maximum 10 keywords per search query

### Caching Strategy
- Cache subreddit metadata
- Store processed thread IDs
- Skip already-analyzed posts

### Rate Limit Management
```typescript
// Example rate limiter
const rateLimiter = {
  maxRequests: 60,
  perMinute: 1,
  currentRequests: 0,
  resetTime: Date.now() + 60000
};
```

## Monitoring Frequency Recommendations

### For Your Use Case (Hot Leads)
- **Recommended**: Every 30-60 minutes
- **Why**: Balances freshness with API efficiency
- **Daily API calls**: ~48-96 per campaign
- **Monthly cost**: Well within free tier limits

### Frequency Options

| Interval | Daily Checks | Use Case | Pros | Cons |
|----------|--------------|----------|------|------|
| 15 min | 96 | Critical/paid monitoring | Very fresh leads | High API usage |
| 30 min | 48 | Hot campaigns | Fresh leads, reasonable API | Good balance |
| 1 hour | 24 | Standard monitoring | Low API usage | May miss time-sensitive |
| 2 hours | 12 | Budget conscious | Very low API | Less competitive |
| 6 hours | 4 | Low priority | Minimal API | Delayed discovery |

## Implementation Steps

1. **Create Monitoring Collection**
   - Store monitoring schedules
   - Track last check times
   - Record API usage

2. **Build Queue Processor**
   - Process campaigns by priority
   - Respect rate limits
   - Handle failures gracefully

3. **Add to Existing Workflow**
   - Integrate with current lead generation
   - Reuse scoring/comment generation
   - Update Monitor tab automatically

4. **User Controls**
   - Toggle automatic monitoring per campaign
   - Set monitoring frequency
   - View monitoring status

## Best Practices

1. **Start Conservative**: Begin with hourly checks
2. **Monitor Usage**: Track API calls and adjust
3. **User Tiers**: Different frequencies for free/paid users
4. **Error Handling**: Exponential backoff on failures
5. **Notification Limits**: Don't overwhelm users with alerts

## Deployment Instructions

### Setting up Automatic Monitoring

#### Option 1: Vercel Cron Jobs (Recommended)
Add to your `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/monitor/check-campaigns",
    "schedule": "0 */30 * * * *"
  }]
}
```

This runs every 30 minutes. Adjust the schedule as needed.

#### Option 2: External Cron Service
Use a service like:
- Uptime Robot
- EasyCron
- Google Cloud Scheduler

Set them to call: `https://yourdomain.com/api/monitor/check-campaigns`

#### Option 3: GitHub Actions
Create `.github/workflows/monitor-campaigns.yml`:

```yaml
name: Monitor Reddit Campaigns
on:
  schedule:
    - cron: '0,30 * * * *' # Every 30 minutes
jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger monitoring
        run: |
          curl -X POST https://yourdomain.com/api/monitor/check-campaigns \
            -H "Authorization: Bearer ${{ secrets.MONITOR_API_KEY }}"
```

### Security

1. Set `MONITOR_API_KEY` in your environment variables
2. The endpoint validates this key to prevent unauthorized access
3. Consider IP whitelisting for additional security

### Testing

Test the endpoint manually:
```bash
curl http://localhost:3000/api/monitor/check-campaigns
```

With authentication:
```bash
curl -X POST http://localhost:3000/api/monitor/check-campaigns \
  -H "Authorization: Bearer your-secret-key"
``` 