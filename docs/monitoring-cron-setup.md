# 🚀 Monitoring Cron Jobs Setup Guide

This guide shows you how to set up automated cron jobs for the Real-Time Lead Monitoring feature.

## 📋 **Prerequisites**

1. ✅ App deployed to production (Vercel/other hosting)
2. ✅ `CRON_SECRET` environment variable set
3. ✅ Firestore indexes deployed and built
4. ✅ At least one campaign with monitoring enabled

## 🎯 **API Endpoints Overview**

### **Scanning Endpoint** (Lightweight - every 3-5 minutes)
```bash
GET /api/monitoring/scan
Authorization: Bearer YOUR_CRON_SECRET
```
- Scans Reddit for new posts matching campaign keywords
- Uses incremental scanning (only fetches new posts)
- Fast execution (~2-5 seconds per campaign)

### **Qualification Endpoint** (Heavy AI - every 10-15 minutes)
```bash
GET /api/monitoring/qualify?organizationId=ORG_ID
Authorization: Bearer YOUR_CRON_SECRET
```
- Runs AI analysis on potential leads
- Generates personalized comments/DMs
- Converts qualified leads to actionable items
- Slower execution (~30-60 seconds per batch)

## 🛠 **Setup Options**

### **Option 1: Vercel Cron Jobs (Recommended)**

✅ **Easiest setup - already configured in `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/monitoring/scan",
      "schedule": "*/3 * * * *"
    },
    {
      "path": "/api/monitoring/qualify",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

**Deployment:**
```bash
vercel deploy --prod
```

**Note:** Vercel cron jobs automatically include authentication headers.

### **Option 2: GitHub Actions**

✅ **Best for fine-grained control and multiple environments**

Already configured in `.github/workflows/monitoring-cron.yml`

**Required GitHub Secrets:**
- `CRON_SECRET`: Your cron authentication secret
- `DEPLOYMENT_URL`: Your production URL (e.g., `https://your-app.vercel.app`)
- `ORGANIZATION_IDS`: Comma-separated list of organization IDs

**Setup:**
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add the required secrets
3. Push to main branch to activate

### **Option 3: Traditional Server Cron**

✅ **Best for dedicated servers or VPS**

**Setup:**
```bash
# Make script executable
chmod +x scripts/monitoring-cron.sh

# Edit configuration in the script
nano scripts/monitoring-cron.sh

# Add to crontab
crontab -e

# Add these lines:
*/3 * * * * /path/to/leadify/scripts/monitoring-cron.sh scan >> /var/log/leadify-scan.log 2>&1
*/10 * * * * /path/to/leadify/scripts/monitoring-cron.sh qualify >> /var/log/leadify-qualify.log 2>&1
```

## 🔧 **Configuration**

### **Environment Variables**

Make sure these are set in your production environment:

```bash
# Required for cron authentication
CRON_SECRET=your-secure-random-string

# Required for AI qualification
OPENAI_API_KEY=your-openai-api-key

# Required for Reddit scanning
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
```

### **Getting Organization IDs**

To find your organization IDs for the qualification endpoint:

1. Go to your app's Firestore console
2. Navigate to the `organizations` collection
3. Copy the document IDs
4. Use them in the cron configuration

## 📊 **Monitoring & Troubleshooting**

### **Testing Endpoints**

```bash
# Test scanning
curl -X GET "https://your-domain.com/api/monitoring/scan" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test qualification
curl -X GET "https://your-domain.com/api/monitoring/qualify?organizationId=ORG_ID" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### **Expected Responses**

**Successful Scan:**
```json
{
  "message": "Reddit scanning completed",
  "monitorsScanned": 3,
  "totalPostsFound": 25,
  "totalNewPostsAdded": 5,
  "totalApiCalls": 3
}
```

**Successful Qualification:**
```json
{
  "message": "Lead qualification completed",
  "leadsProcessed": 5,
  "qualifiedLeads": 2,
  "ignoredLeads": 3,
  "errorLeads": 0
}
```

### **Common Issues**

**1. "Unauthorized" Error**
- Check `CRON_SECRET` environment variable
- Ensure `Authorization: Bearer SECRET` header is correct

**2. "Failed to get monitors"**
- Create campaigns with monitoring enabled
- Check Firestore indexes are built

**3. "No unqualified leads found"**
- This is normal - means all leads have been processed
- Check the real-time monitor tab in the UI

## 🎉 **Verification**

After setting up cron jobs:

1. **Monitor Logs**: Check your hosting platform's logs for cron execution
2. **Real-Time UI**: Visit `/reddit/lead-finder` → Monitor tab
3. **Database**: Check `potential_leads_feed` collection for new entries
4. **Generated Comments**: Check `generated_comments` collection for qualified leads

## 📈 **Recommended Schedule**

- **Scanning**: Every 3-5 minutes (lightweight, fast)
- **Qualification**: Every 10-15 minutes (heavy AI processing)
- **Monitor checking**: Every 30 minutes (existing campaigns)

This balance provides real-time discovery while managing API costs and rate limits. 