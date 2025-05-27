# Organization ID Migration Checklist

## Database Schema Issues

### Collections Missing Organization ID
- [ ] `keyword-performance-collections.ts` - Add organizationId field
- [ ] Update `KeywordPerformanceDocument` interface
- [ ] Update create/update data interfaces

### Collections Already Have Organization ID (Verified)
- [x] `organizations-collections.ts`
- [x] `personalization-collections.ts` (KnowledgeBase, VoiceSettings, ScrapedContent, TwitterAnalysis)
- [x] `lead-generation-collections.ts` (Campaigns, GeneratedComments)
- [x] `warmup-collections.ts` (WarmupAccounts, WarmupPosts, WarmupComments, WarmupRateLimits)
- [x] `posting-queue-collections.ts` (PostingQueue, RedditRateLimits)

## Actions to Update

### Keyword Performance Actions
- [ ] Check if `keyword-performance-actions.ts` exists
- [ ] Add organizationId parameter to all CRUD operations
- [ ] Update queries to filter by organizationId

### Profile Actions
- [ ] Review `profiles-actions.ts` for any organization-specific data that should be moved
- [ ] Ensure profile is user-specific, not organization-specific

## API Routes to Update

### Lead Generation API
- [ ] `/api/lead-generation/start/route.ts` - Ensure organizationId is passed
- [ ] `/api/test-keywords/route.ts` - Add organizationId support
- [ ] `/api/test-personalized-comments/route.ts` - Add organizationId support
- [ ] `/api/test-warmup/route.ts` - Add organizationId support

### Queue Processing APIs
- [ ] `/api/queue/process-posts/route.ts` - Ensure organizationId filtering
- [ ] `/api/queue/process-warmup/route.ts` - Ensure organizationId filtering
- [ ] `/api/queue/check-warmup-comments/route.ts` - Ensure organizationId filtering

### Warmup APIs
- [ ] `/api/warmup/generate-posts/route.ts` - Ensure organizationId is used

### Reddit APIs
- [ ] `/api/reddit/auth/route.ts` - Verify organization-based auth
- [ ] `/api/reddit/comments/[commentId]/replies/route.ts` - Add organizationId context

## Frontend Pages to Update

### Dashboard Pages
- [ ] `/dashboard/page.tsx` - Add organization context/selector
- [ ] Ensure organization selection is available

### Reddit Pages
- [ ] `/reddit/knowledge-base/page.tsx` - Ensure organizationId filtering
- [ ] `/reddit/lead-finder/page.tsx` - Ensure organizationId filtering
- [ ] `/reddit/my-posts/page.tsx` - Ensure organizationId filtering
- [ ] `/reddit/personalization/page.tsx` - Ensure organizationId filtering
- [ ] `/reddit/settings/page.tsx` - Ensure organizationId context
- [ ] `/reddit/voice-settings/page.tsx` - Ensure organizationId filtering
- [ ] `/reddit/warm-up/page.tsx` - Ensure organizationId filtering

### Debug Pages
- [ ] `/debug/lead-generation-debug/page.tsx` - Add organizationId support
- [ ] `/debug/test-page/page.tsx` - Add organizationId support

## Components to Update

### Lead Finder Components
- [ ] Check all components in `/reddit/lead-finder/_components/`
- [ ] Ensure organizationId is passed to all actions

### Knowledge Base Components
- [ ] Check all components in `/reddit/knowledge-base/_components/`
- [ ] Ensure organizationId is passed to all actions

### My Posts Components
- [ ] Check all components in `/reddit/my-posts/_components/`
- [ ] Ensure organizationId is passed to all actions

### Personalization Components
- [ ] Check all components in `/reddit/personalization/_components/`
- [ ] Ensure organizationId is passed to all actions

### Voice Settings Components
- [ ] Check all components in `/reddit/voice-settings/_components/`
- [ ] Ensure organizationId is passed to all actions

### Warm-up Components
- [ ] Check all components in `/reddit/warm-up/_components/`
- [ ] Ensure organizationId is passed to all actions

### Settings Components
- [ ] Check all components in `/reddit/settings/_components/`
- [ ] Ensure organizationId is passed to all actions

## Onboarding Flow (Already Updated - Verified)
- [x] `/onboarding/page.tsx` - Creates organization after profile step
- [x] `/onboarding/_components/connect-reddit-step.tsx` - Uses organizationId
- [x] Organization creation happens after profile step
- [x] Campaign creation uses organizationId

## Authentication & Authorization
- [ ] Add organization context provider
- [ ] Add organization selector component
- [ ] Add middleware to ensure organizationId is available
- [ ] Add organization member access checks

## Data Migration
- [ ] Create migration script for existing data
- [ ] Add organizationId to existing records
- [ ] Update any hardcoded user-based queries

## Testing
- [ ] Test onboarding flow with new organization creation
- [ ] Test all CRUD operations with organizationId
- [ ] Test organization switching
- [ ] Test member access controls
- [ ] Test Reddit auth with organization context

## Documentation
- [ ] Update API documentation
- [ ] Update component documentation
- [ ] Add organization management guide 