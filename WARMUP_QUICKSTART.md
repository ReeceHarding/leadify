# Reddit Warm-up System - Quick Start Guide

## ✅ Setup Complete!

Your environment is now configured with:
- CRON_SECRET: `UODgJFjSZQE/Vg47kCjfmyN0kd0XNQCcxB7HbSZj5Wc=`
- Reddit OAuth configured
- All required API keys set

## 🚀 Start Testing

### Terminal 1: Start the App
```bash
npm run dev
```

### Terminal 2: Start the Warm-up Scheduler (Test Mode)
```bash
npm run warmup:test
```

This runs with fast intervals:
- Process queue: every 30 seconds
- Check comments: every 2 minutes

## 📝 Test Steps

1. **Open the Warm-up Dashboard**
   - Go to: http://localhost:3000/reddit/warm-up
   - You should see the warm-up interface

2. **Connect Reddit Account**
   - Click "Connect Reddit Account"
   - Authorize the app
   - You'll be redirected back

3. **Set Up Warm-up**
   - Add 1-2 test subreddits (e.g., r/test, r/testingground4bots)
   - Click "AI Suggest" for recommendations
   - Set to "Auto" posting mode
   - Save settings

4. **Watch the Magic**
   - Check Terminal 2 for scheduler logs
   - You'll see:
     - Posts being generated
     - Posts being queued
     - Posts being submitted
     - Comments being checked

5. **Monitor Progress**
   - Refresh the dashboard to see generated posts
   - Check your Reddit account for actual posts
   - Edit posts before they're queued if needed

## 🛠️ Troubleshooting

**No posts generating?**
- Check Terminal 2 for errors
- Verify Reddit account is connected
- Make sure you have subreddits selected

**API errors?**
- Check OpenAI API key is valid
- Verify Reddit credentials
- Look for rate limit messages

**Want to test faster?**
- The test mode already runs fast (30 seconds)
- You can manually trigger: `npm run warmup:generate YOUR_USER_ID`

## 📊 What to Expect

- Posts will be generated matching subreddit styles
- They'll be queued with spacing to avoid spam
- Comments will be monitored and replied to
- Everything auto-saves as you edit

## 🎯 Next Steps

Once testing is successful:
1. Switch to production intervals: `npm run warmup:local`
2. Deploy to production (see docs/WARMUP_DEPLOYMENT.md)
3. Set up Firebase Functions for 24/7 operation

Happy testing! 🚀 