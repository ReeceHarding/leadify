# Organization Migration Plan

## Overview

This document outlines the complete migration plan to update the Leadify system from profile-based Reddit authentication and business data to organization-based management.

## Current State Analysis

### 1. Profile System Issues

The `ProfileDocument` currently contains:

- Reddit OAuth tokens (should be in Organization)
- Business website (should be in Organization)
- Keywords array (should be in Campaign)
- Business name (should be in Organization)

### 2. Reddit Authentication Issues

All Reddit actions are using:

- `getRedditTokensFromProfileAction()` (deprecated)
- `refreshRedditTokenFromProfileAction()` (deprecated)
- Profile-based token storage

### 3. Lead Generation Issues

- Workflow uses `userId` instead of `organizationId`
- Knowledge base fetched by userId instead of organizationId
- Voice settings fetched by userId instead of organizationId
- Generated comments don't have organizationId field

### 4. Data Model Issues

- Duplicate fields between Campaign and Organization
- No clear separation of concerns
- Missing organization context in many collections

## Migration Steps

### Phase 1: Update Data Models

#### 1.1 Clean ProfileDocument

Remove from `ProfileDocument`:

```typescript
// Remove these fields:
- website?: string
- keywords?: string[]
- redditAccessToken?: string
- redditRefreshToken?: string
- redditTokenExpiresAt?: Timestamp
- redditUsername?: string
```

Keep only:

```typescript
ProfileDocument {
  userId: string
  membership: MembershipType
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  name?: string
  profilePictureUrl?: string
  onboardingCompleted?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### 1.2 Update GeneratedCommentDocument

Add organizationId field:

```typescript
GeneratedCommentDocument {
  // ... existing fields ...
  organizationId: string // NEW: Link to organization
  // ... rest of fields ...
}
```

#### 1.3 Clean CampaignDocument

Remove duplicate fields:

```typescript
CampaignDocument {
  // Remove:
  - website: string
  - businessDescription?: string

  // Keep only keyword-search related fields
}
```

### Phase 2: Create Migration Actions

#### 2.1 Data Migration Script

Create `scripts/migrate-to-organizations.ts`:

1. For each user with Reddit tokens in profile:

   - Create an organization with their business data
   - Move Reddit tokens to organization
   - Move website to organization
   - Clear these fields from profile

2. For each campaign:

   - Remove website/businessDescription
   - Ensure organizationId is set

3. For each generated comment:
   - Add organizationId from campaign

### Phase 3: Update Reddit Actions

#### 3.1 Create Organization Token Helper

```typescript
// actions/integrations/reddit/reddit-auth-helpers.ts
export async function getCurrentOrganizationTokens(organizationId: string) {
  const result = await getRedditTokensFromOrganizationAction(organizationId)
  if (!result.isSuccess && result.data?.refreshToken) {
    // Try refresh
    const refreshResult =
      await refreshRedditTokenFromOrganizationAction(organizationId)
    if (refreshResult.isSuccess) {
      return getRedditTokensFromOrganizationAction(organizationId)
    }
  }
  return result
}
```

#### 3.2 Update All Reddit Actions

Files to update:

- `reddit-posting-actions.ts`
- `reddit-search-actions.ts`
- `reddit-warmup-actions.ts`
- `reddit-actions.ts`

Replace all instances of:

- `getRedditTokensFromProfileAction()` → `getCurrentOrganizationTokens(organizationId)`
- `refreshRedditTokenFromProfileAction()` → `refreshRedditTokenFromOrganizationAction(organizationId)`

### Phase 4: Update Lead Generation Workflow

#### 4.1 Pass Organization Context

Update `runLeadGenerationWorkflowWithLimitsAction`:

1. Get organizationId from campaign
2. Pass organizationId to:
   - `getKnowledgeBaseByOrganizationIdAction()`
   - `getVoiceSettingsByOrganizationIdAction()`
   - `scoreThreadAndGeneratePersonalizedCommentsAction()`

#### 4.2 Update Comment Generation

Update `createGeneratedCommentAction`:

1. Accept organizationId in data
2. Store organizationId in document

### Phase 5: Update UI Components

#### 5.1 Lead Finder Dashboard

Update to:

1. Get active organization from context
2. Pass organizationId to all actions
3. Filter leads by organizationId

#### 5.2 Reddit Auth Flow

Update callback to:

1. Get organizationId from cookie/state
2. Save tokens to organization, not profile

### Phase 6: Remove Legacy Code

#### 6.1 Remove Deprecated Actions

Delete:

- `saveRedditTokensToProfileAction`
- `getRedditTokensFromProfileAction`
- `refreshRedditTokenFromProfileAction`
- `clearRedditTokensFromProfileAction`

#### 6.2 Remove Legacy Fields

Update types to remove deprecated fields from:

- `ProfileDocument`
- `SerializedProfileDocument`
- Profile-related types

## Implementation Order

1. **Day 1**: Update data models and create migration script
2. **Day 2**: Run migration on test data
3. **Day 3**: Update Reddit actions to use organization tokens
4. **Day 4**: Update lead generation workflow
5. **Day 5**: Update UI components
6. **Day 6**: Remove legacy code
7. **Day 7**: Testing and verification

## Rollback Plan

1. Keep backup of all collections before migration
2. Maintain legacy actions with `_deprecated` suffix
3. Feature flag for gradual rollout
4. Monitor error rates during migration

## Success Criteria

1. All Reddit actions use organization tokens
2. No profile documents contain Reddit tokens
3. All generated comments have organizationId
4. Lead generation uses organization context
5. No duplicate business data between entities
6. All tests pass
7. No increase in error rates

## Post-Migration Cleanup

1. Remove all `_deprecated` functions
2. Update documentation
3. Update onboarding flow
4. Clean up unused imports
5. Run full system test
