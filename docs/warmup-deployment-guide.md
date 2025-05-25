# Reddit Warm-up System Deployment Guide

This guide explains how to deploy and run the Reddit warm-up system for days at a time in the background using Firebase.

## Overview

The warm-up system consists of:
- **Post Generation**: Generates 2-5 posts daily per user
- **Post Queue Processing**: Submits queued posts to Reddit every 5 minutes
- **Comment Monitoring**: Checks for new comments every 30 minutes
- **Comment Reply Queue**: Submits comment replies with 3-4 minute spacing

## Deployment Options

### Option 1: Firebase Cloud Functions + Cloud Scheduler (Recommended)

This is the most reliable option for long-running background tasks.

#### Setup Steps:

1. **Initialize Firebase Functions**
```bash
firebase init functions
# Select TypeScript
# Select ESLint
```

2. **Install Dependencies**
```bash
cd functions
npm install firebase-functions firebase-admin
npm install --save-dev typescript
```

3. **Deploy the Cloud Functions**
```bash
# From the functions directory
npm run deploy
```

4. **Set up Cloud Scheduler Jobs**

In Google Cloud Console:
- Go to Cloud Scheduler
- Create jobs for each function:

**Job 1: Process Warm-up Queue**
- Name: `process-warmup-queue`
- Frequency: `*/5 * * * *` (every 5 minutes)
- Target type: Pub/Sub
- Topic: `process-warmup-queue`

**Job 2: Check Comments**
- Name: `check-warmup-comments`
- Frequency: `*/30 * * * *` (every 30 minutes)
- Target type: Pub/Sub
- Topic: `check-warmup-comments`

**Job 3: Generate Daily Posts**
- Name: `generate-daily-posts`
- Frequency: `0 2 * * *` (2 AM UTC daily)
- Target type: Pub/Sub
- Topic: `generate-daily-posts`

### Option 2: Vercel Cron Jobs (Alternative)

If deploying to Vercel, you can use their cron job feature.

1. **Create `vercel.json`**:
```json
{
  "crons": [
    {
      "path": "/api/queue/process-warmup",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/queue/check-warmup-comments",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/warmup/generate-posts-all",
      "schedule": "0 2 * * *"
    }
  ]
}
```

2. **Note**: Vercel cron jobs have limitations:
   - Maximum execution time: 10 seconds (Hobby), 60 seconds (Pro)
   - May not be suitable for processing many users

### Option 3: External Cron Service

Use services like:
- **Upstash**: Serverless Redis with cron
- **Quirrel**: Job queue for serverless
- **Inngest**: Event-driven serverless functions

Example with Upstash:
```typescript
import { Receiver } from "@upstash/qstash/nextjs"

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})

export const POST = receiver(async (request) => {
  // Your processing logic
})
```

## Environment Variables

Add these to your `.env.local` and Firebase Functions config:

```bash
# Cron Secret for API authentication
CRON_SECRET=your-secure-random-string

# Reddit OAuth
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
REDDIT_USER_AGENT=your-app-name:v1.0.0

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# App URL (for Firebase Functions to call your API)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Set Firebase Functions config:
```bash
firebase functions:config:set \
  cron.secret="your-secure-random-string" \
  app.url="https://your-app.vercel.app"
```

## Monitoring & Maintenance

### 1. Health Checks

The system includes a health check function that runs hourly to detect:
- Stuck posts (queued for >1 hour)
- Failed submissions
- Rate limit issues

### 2. Logging

Monitor logs in Firebase Console:
```bash
firebase functions:log
```

Or in your terminal:
```bash
firebase functions:log --only processWarmupQueue
```

### 3. Alerts

Set up alerts for:
- Function failures
- High error rates
- Stuck posts

Example alert integration:
```typescript
async function sendAlert(message: string) {
  // Send to Slack, Discord, email, etc.
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({ text: message })
  })
}
```

### 4. Database Indexes

Ensure these Firestore indexes exist:
```
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "warmupPosts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledFor", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "warmupPosts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "postedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Scaling Considerations

### For Large Numbers of Users:

1. **Batch Processing**: Process users in batches to avoid timeouts
2. **Parallel Execution**: Use Promise.all() for independent operations
3. **Rate Limiting**: Implement exponential backoff for Reddit API
4. **Queue Distribution**: Spread post times throughout the day

### Example Batch Processing:
```typescript
const BATCH_SIZE = 10

for (let i = 0; i < users.length; i += BATCH_SIZE) {
  const batch = users.slice(i, i + BATCH_SIZE)
  await Promise.all(batch.map(user => processUser(user)))
  
  // Add delay between batches
  await new Promise(resolve => setTimeout(resolve, 1000))
}
```

## Troubleshooting

### Common Issues:

1. **"Unauthorized" errors**
   - Check CRON_SECRET environment variable
   - Ensure Authorization header is set correctly

2. **Posts not being submitted**
   - Check Reddit OAuth token expiration
   - Verify rate limits aren't exceeded
   - Check Firebase logs for errors

3. **Comments not being generated**
   - Ensure posts have valid Reddit IDs
   - Check OpenAI API quota
   - Verify comment fetching from Reddit

4. **Function timeouts**
   - Increase function memory/timeout
   - Reduce batch sizes
   - Optimize database queries

## Cost Optimization

1. **Function Configuration**:
   - Use minimum memory for simple tasks
   - Set appropriate timeouts
   - Use Cloud Scheduler wisely

2. **Database Operations**:
   - Batch writes when possible
   - Use efficient queries
   - Clean up old data regularly

3. **API Calls**:
   - Cache subreddit analysis
   - Batch Reddit API calls
   - Monitor OpenAI usage

## Security Best Practices

1. **API Authentication**:
   - Use strong CRON_SECRET
   - Rotate secrets regularly
   - Validate all inputs

2. **Reddit OAuth**:
   - Store tokens securely
   - Implement token refresh
   - Handle revoked access

3. **Rate Limiting**:
   - Implement per-user limits
   - Monitor for abuse
   - Use Firebase Security Rules

## Deployment Checklist

- [ ] Set all environment variables
- [ ] Deploy Firebase Functions
- [ ] Configure Cloud Scheduler jobs
- [ ] Create Firestore indexes
- [ ] Test each endpoint manually
- [ ] Monitor initial runs
- [ ] Set up alerts
- [ ] Document any custom configuration 