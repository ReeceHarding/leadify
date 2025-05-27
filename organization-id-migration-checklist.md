# Organization ID Migration Checklist

## Database Schema Issues

### Collections Missing Organization ID
- [x] `keyword-performance-collections.ts` - Add organizationId field
- [x] Update `KeywordPerformanceDocument` interface
- [x] Update create/update data interfaces

### Collections Already Have Organization ID (Verified)
- [x] `organizations-collections.ts`
- [x] `personalization-collections.ts` (KnowledgeBase, VoiceSettings, ScrapedContent, TwitterAnalysis)
- [x] `lead-generation-collections.ts` (Campaigns, GeneratedComments)
- [x] `warmup-collections.ts` (WarmupAccounts, WarmupPosts, WarmupComments, WarmupRateLimits)
- [x] `posting-queue-collections.ts` (PostingQueue, RedditRateLimits)

## Actions to Update

### Keyword Performance Actions
- [x] Check if `keyword-performance-actions.ts` exists (doesn't exist, functionality in keywords-actions.ts)
- [x] Add organizationId parameter to all CRUD operations
- [x] Update queries to filter by organizationId

### Profile Actions
- [x] Review `profiles-actions.ts` for any organization-specific data that should be moved
- [x] Ensure profile is user-specific, not organization-specific

## API Routes to Update

### Lead Generation API
- [x] `/api/lead-generation/start/route.ts` - Already uses organizationId from campaign
- [x] `/api/test-keywords/route.ts` - Add organizationId support (doesn't exist - empty directory)
- [x] `/api/test-personalized-comments/route.ts` - Add organizationId support (doesn't exist - empty directory)
- [x] `/api/test-warmup/route.ts` - Add organizationId support (doesn't exist - empty directory)

### Queue Processing APIs
- [x] `/api/queue/process-posts/route.ts` - Already uses organizationId from posting queue
- [x] `/api/queue/process-warmup/route.ts` - Already uses organizationId
- [x] `/api/queue/check-warmup-comments/route.ts` - Already uses organizationId from posts

### Warmup APIs
- [x] `/api/warmup/generate-posts/route.ts` - Already uses organizationId

### Reddit APIs
- [x] `/api/reddit/auth/route.ts` - Organization-based auth already implemented
- [x] `/api/reddit/callback/route.ts` - Already handles organization context
- [x] `/api/reddit/comments/[commentId]/replies/route.ts` - Mock implementation, doesn't need organizationId yet

## Frontend Pages to Update

### Dashboard Pages
- [x] `/dashboard/page.tsx` - Already checks for organizations and redirects
- [x] Organization context provider created
- [x] Organization selector component created

### Reddit Pages
- [x] `/reddit/knowledge-base/page.tsx` - Fixed to use currentOrganization
- [x] `/reddit/lead-finder/page.tsx` - Fixed to use currentOrganization
- [x] `/reddit/my-posts/page.tsx` - Fixed to use currentOrganization
- [x] `/reddit/personalization/page.tsx` - Navigation only, no org context needed
- [x] `/reddit/settings/page.tsx` - Fixed to use currentOrganization
- [x] `/reddit/voice-settings/page.tsx` - Fixed to use currentOrganization
- [x] `/reddit/warm-up/page.tsx` - Fixed to use currentOrganization

### Debug Pages
- [x] `/debug/lead-generation-debug/page.tsx` - Component disabled for maintenance
- [x] `/debug/test-page/page.tsx` - Simple test page, no org context needed

## Components to Update

### Lead Finder Components
- [x] Check all components in `/reddit/lead-finder/_components/`
- [x] Fixed lead-finder-dashboard.tsx to use currentOrganization

### Knowledge Base Components
- [x] Check all components in `/reddit/knowledge-base/_components/`
- [x] Fixed knowledge-base-wrapper.tsx to use currentOrganization

### My Posts Components
- [x] Check all components in `/reddit/my-posts/_components/`
- [x] Fixed my-posts-dashboard.tsx to use currentOrganization

### Personalization Components
- [x] Check all components in `/reddit/personalization/_components/`
- [x] Navigation only, no changes needed

### Voice Settings Components
- [x] Check all components in `/reddit/voice-settings/_components/`
- [x] Fixed voice-settings-wrapper.tsx to use currentOrganization

### Warm-up Components
- [x] Check all components in `/reddit/warm-up/_components/`
- [x] Fixed warmup-wrapper.tsx to use currentOrganization

### Settings Components
- [x] Check all components in `/reddit/settings/_components/`
- [x] Fixed organization-settings.tsx to use currentOrganization

## Onboarding Flow (Already Updated - Verified)
- [x] `/onboarding/page.tsx` - Creates organization after profile step
- [x] `/onboarding/_components/connect-reddit-step.tsx` - Uses organizationId
- [x] Organization creation happens after profile step
- [x] Campaign creation uses organizationId

## Authentication & Authorization
- [x] Add organization context provider
- [x] Add organization selector component
- [x] Add middleware to ensure organizationId is available
- [ ] Add organization member access checks (basic check added in middleware)

## Data Migration
- [x] Create migration script for existing data
- [ ] Add organizationId to existing records (script created, needs to be run)
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