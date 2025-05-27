# Firebase Admin SDK Setup Guide

This guide explains how to securely set up Firebase Admin SDK credentials for server-side operations.

## Why Firebase Admin SDK?

The Firebase Admin SDK is needed for:
- Server-side database operations
- Running migration scripts
- Background jobs and cron tasks
- Secure operations that bypass client-side security rules

## Security Best Practices

⚠️ **NEVER commit service account credentials to your repository!**

The service account JSON file contains sensitive credentials that provide full admin access to your Firebase project.

## Setup Options

### Option 1: Service Account JSON File (Development)

Best for local development:

1. **Download your service account key:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely OUTSIDE your project directory

2. **Set the environment variable in `.env.local`:**
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/Users/yourusername/.config/firebase/your-service-account.json
   ```

3. **Add to `.gitignore`:**
   ```
   *firebase-adminsdk*.json
   ```

### Option 2: Individual Environment Variables (Production)

Best for production deployments (Vercel, etc.):

1. **Extract values from your service account JSON:**
   ```json
   {
     "project_id": "your-project-id",
     "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   }
   ```

2. **Set environment variables:**
   ```bash
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   **Note:** Keep the quotes around the private key and preserve the `\n` characters.

3. **In Vercel:**
   - Go to Project Settings → Environment Variables
   - Add each variable individually
   - For `FIREBASE_PRIVATE_KEY`, paste the entire key including headers

## Migration from JSON File

If you currently have a service account JSON file in your repository:

1. **Extract the credentials** (see Option 2 above)
2. **Update `.env.local`** with the new variables
3. **Delete the JSON file:**
   ```bash
   rm /Users/reeceharding/Leadify/austen-reddit-app-firebase-adminsdk-fbsvc-83ff3586fc.json
   ```
4. **Update any references** to use the new `firebase-admin.ts` helper

## Usage in Code

The new `lib/firebase-admin.ts` helper automatically detects which method you're using:

```typescript
import { adminDb, adminAuth } from '@/lib/firebase-admin'

// Use in server actions
const db = adminDb()
const auth = adminAuth()
```

## Troubleshooting

### "Firebase Admin SDK credentials not found"
- Ensure environment variables are set correctly
- Check that `.env.local` is loaded (restart dev server)
- Verify the private key format (should have `\n` characters)

### "Invalid private key"
- Make sure the private key is wrapped in quotes
- Preserve all `\n` characters in the key
- Don't add extra escaping to the `\n` characters

### Migration script issues
- The migration script will automatically use the new initialization
- Ensure credentials are set before running migrations 