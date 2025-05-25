# Reddit Warm-up System Deployment Guide

## Overview

The Reddit warm-up system helps users build karma and authority in target subreddits before launching lead generation campaigns. This guide covers local testing and production deployment.

## Local Testing

### 1. Set Up Environment Variables

Add to your `.env.local`:
```bash
CRON_SECRET=your-secure-cron-secret-here
```

### 2. Run the Application

In one terminal, start the Next.js app:
```bash
npm run dev
```

### 3. Test the Warm-up System

In another terminal, run the local scheduler:

**Test Mode (faster intervals for testing):**
```bash
npm run warmup:test
```
- Processes queue every 30 seconds
- Checks comments every 2 minutes

**Production Mode (real intervals):**
```bash
npm run warmup:local
```
- Processes queue every 5 minutes
- Checks comments every 30 minutes

### 4. Manual Testing

Generate posts for a specific user:
```bash
npm run warmup:generate <userId>
```

## Production Deployment

### Option 1: Vercel + External Cron Service

1. **Deploy to Vercel**
   - Set environment variables in Vercel dashboard
   - Deploy your Next.js app

2. **Set up Cron Jobs** (using cron-job.org, EasyCron, or similar):
   
   **Process Queue (every 5 minutes):**
   - URL: `https://your-app.vercel.app/api/queue/process-warmup`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`
   
   **Check Comments (every 30 minutes):**
   - URL: `https://your-app.vercel.app/api/queue/check-warmup-comments`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 2: Firebase Functions (Recommended)

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase Functions:**
   ```bash
   firebase init functions
   ```

3. **Set Firebase Config:**
   ```bash
   firebase functions:config:set app.url="https://your-app.vercel.app"
   firebase functions:config:set cron.secret="YOUR_CRON_SECRET"
   ```

4. **Deploy Functions:**
   ```bash
   firebase deploy --only functions
   ```

5. **Monitor in Firebase Console:**
   - View logs in Firebase Console > Functions
   - Check execution history and errors

## Monitoring & Maintenance

### Logs to Monitor

1. **Post Generation:**
   - Number of posts generated per user
   - Failed generation attempts
   - Rate limit violations

2. **Post Submission:**
   - Successful Reddit posts
   - Failed submissions with error reasons
   - Queue processing times

3. **Comment Monitoring:**
   - New comments detected
   - Replies generated and scheduled
   - Comment submission success/failure

### Health Checks

1. **Daily Checks:**
   - Verify posts are being generated
   - Check queue processing logs
   - Monitor Reddit API rate limits

2. **Weekly Checks:**
   - Review warm-up account progress
   - Check karma growth
   - Analyze post engagement

### Troubleshooting

**Posts not generating:**
- Check user has active warm-up account
- Verify Reddit OAuth token is valid
- Check OpenAI API key and limits

**Posts not submitting:**
- Verify Reddit credentials
- Check subreddit posting restrictions
- Monitor rate limits

**Comments not processing:**
- Ensure posts have `redditPostId` set
- Check Reddit API access
- Verify comment generation prompts

## Cost Considerations

### OpenAI API Usage
- Post generation: ~$0.0015 per post (o3-mini medium)
- Comment generation: ~$0.0001 per comment (gpt-4o-mini)
- Style analysis: ~$0.001 per subreddit (o3-mini low)

### Firebase Functions
- Invocations: First 2M free/month
- Compute time: First 400K GB-seconds free/month
- Typical usage: Well within free tier for <100 users

### Scaling Considerations
- Implement user-based rate limiting
- Consider queuing system for large user bases
- Monitor API costs and set alerts

## Security Best Practices

1. **API Keys:**
   - Rotate CRON_SECRET regularly
   - Use different secrets for dev/prod
   - Never commit secrets to git

2. **Rate Limiting:**
   - Implement per-user limits
   - Add circuit breakers for API failures
   - Monitor for abuse

3. **Data Privacy:**
   - Encrypt sensitive user data
   - Implement data retention policies
   - Follow Reddit's API terms of service 