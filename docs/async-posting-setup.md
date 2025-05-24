# Async Reddit Posting with Rate Limiting - Setup Guide

## Overview

This system implements a sophisticated rate-limited posting mechanism for Reddit that:
- Limits posts to one per Reddit account every 5-7 minutes (randomized)
- Processes posts asynchronously via a queue system
- Provides automatic retry on failures
- Prevents Reddit rate limiting and shadow bans

## Architecture

### Components

1. **Rate Limiting Service** (`actions/integrations/reddit-posting-queue.ts`)
   - Tracks last post time per user
   - Enforces 5-7 minute delays between posts
   - Randomizes delays to appear more human-like

2. **Posting Queue** (Firestore collection: `postingQueue`)
   - Stores pending posts with scheduled times
   - Tracks status: pending, processing, completed, failed
   - Enables retry logic with exponential backoff

3. **Queue Processor** (`app/api/queue/process-posts/route.ts`)
   - API endpoint called by cron job
   - Processes one post at a time
   - Updates queue status and handles errors

4. **Dashboard Integration** (`app/reddit/lead-finder/_components/lead-finder-dashboard.tsx`)
   - Uses async queue for batch operations
   - Shows queue status and progress
   - Provides estimated completion times

## Setup Instructions

### 1. Environment Configuration

Add the following to your `.env.local`:

```env
# Queue Processing
CRON_SECRET=your-secure-random-string-here
```

Generate a secure random string for `CRON_SECRET`:
```bash
openssl rand -hex 32
```

### 2. Firestore Setup

The system will automatically create these collections:
- `postingQueue` - Stores queued posts
- `redditRateLimits` - Tracks rate limits per user

No manual setup required, but ensure your Firebase project has Firestore enabled.

### 3. Cron Job Setup

You need to set up a cron job to call the queue processor every minute. Here are options:

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/queue/process-posts",
    "schedule": "* * * * *",
    "headers": {
      "Authorization": "Bearer YOUR_CRON_SECRET"
    }
  }]
}
```

#### Option B: External Cron Service

Use services like:
- Upstash Cron
- Cron-job.org
- EasyCron
- Google Cloud Scheduler

Configure to:
- URL: `https://your-domain.com/api/queue/process-posts`
- Method: GET or POST
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: Every 1 minute (`* * * * *`)

#### Option C: Self-Hosted (Development)

For local development, you can use a simple Node.js script:

```javascript
// scripts/queue-processor.js
const INTERVAL = 60000; // 1 minute

async function processQueue() {
  try {
    const response = await fetch('http://localhost:3000/api/queue/process-posts', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });
    const data = await response.json();
    console.log('Queue processed:', data);
  } catch (error) {
    console.error('Error processing queue:', error);
  }
}

setInterval(processQueue, INTERVAL);
console.log('Queue processor started...');
```

Run with: `node scripts/queue-processor.js`

## Usage

### 1. Single Post with Rate Limiting

```typescript
import { processPostWithRateLimit } from '@/actions/integrations/reddit-posting-queue'

const result = await processPostWithRateLimit(
  userId,
  leadId,
  threadId,
  comment
)

if (!result.isSuccess) {
  // User is rate limited, show wait time
  console.log(result.message)
}
```

### 2. Batch Queue Posts

```typescript
import { queuePostsForAsyncProcessing } from '@/actions/integrations/reddit-posting-queue'

const posts = [
  { leadId: '1', threadId: 'abc', comment: 'Great post!' },
  { leadId: '2', threadId: 'def', comment: 'Thanks for sharing!' },
  // ... more posts
]

const result = await queuePostsForAsyncProcessing(userId, posts)

if (result.isSuccess) {
  console.log(`Queued ${result.data.queuedCount} posts`)
  console.log(`Estimated completion: ${result.data.estimatedTime} minutes`)
}
```

### 3. Check Queue Status

```typescript
import { getPostingQueueStatus } from '@/actions/integrations/reddit-posting-queue'

const status = await getPostingQueueStatus(userId)

if (status.isSuccess) {
  console.log(`Pending: ${status.data.pending}`)
  console.log(`Processing: ${status.data.processing}`)
  console.log(`Next post allowed at: ${status.data.nextPostTime}`)
}
```

## Rate Limiting Logic

The system implements smart rate limiting:

1. **Minimum Delay**: 5 minutes between posts
2. **Maximum Delay**: 7 minutes between posts
3. **Randomization**: Actual delay is randomized between 5-7 minutes
4. **Per-User Tracking**: Each user has independent rate limits
5. **Hourly Limits**: Tracks posts per hour (optional enhancement)

## Error Handling

The system includes robust error handling:

1. **Automatic Retries**: Failed posts retry up to 3 times
2. **Exponential Backoff**: 10-minute delay between retries
3. **Status Tracking**: All errors are logged with timestamps
4. **Graceful Degradation**: Queue continues processing despite individual failures

## Monitoring

Monitor the system through:

1. **Console Logs**: Detailed logging with emojis for easy scanning
2. **Queue Status API**: Check pending/completed/failed posts
3. **Firestore Console**: View queue documents directly
4. **Error Tracking**: Integration with your error monitoring service

## Security Considerations

1. **CRON_SECRET**: Keep this secret and rotate regularly
2. **Rate Limits**: Respect Reddit's API limits
3. **User Isolation**: Each user's posts are isolated
4. **Input Validation**: Validate all inputs before queueing

## Troubleshooting

### Posts Not Processing

1. Check cron job is running: Look for logs every minute
2. Verify CRON_SECRET matches in both env and cron config
3. Check Firestore for pending posts with past `scheduledFor` times
4. Look for errors in queue processor logs

### Rate Limit Issues

1. Check `redditRateLimits` collection for user's last post time
2. Verify time calculations are correct
3. Ensure server time is synchronized

### Queue Buildup

1. Monitor queue size regularly
2. Increase cron frequency if needed (with caution)
3. Check for stuck posts in "processing" status
4. Clear failed posts after investigation

## Best Practices

1. **Don't Bypass Rate Limits**: They protect your Reddit account
2. **Monitor Queue Size**: Large queues indicate issues
3. **Log Everything**: Comprehensive logging helps debugging
4. **Test Locally**: Use the local processor script for development
5. **Gradual Rollout**: Start with small batches to test the system 