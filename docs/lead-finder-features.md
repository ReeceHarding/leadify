# Lead Finder Dashboard - Feature Documentation

## Overview
The Lead Finder Dashboard is a comprehensive Reddit lead generation tool that automatically finds relevant posts, generates AI-powered comments, and manages the posting workflow.

## Core Features

### 1. Real-Time Lead Generation
- **Automatic Workflow**: Fetches keywords from user profile and searches Reddit for relevant posts
- **Live Updates**: Uses Firebase real-time listeners to display new leads as they're found
- **Relevance Scoring**: AI-powered scoring system (0-100) to rank post relevance
- **Visual Feedback**: New leads appear with green ring animation and toast notifications

### 2. Lead Management

#### Individual Lead Actions
- **Post Now**: Instantly post a comment to Reddit with authentication check
- **Add to Queue**: Save leads for batch posting later
- **Remove from Queue**: Remove leads from the batch posting queue
- **Edit Comments**: Click on any comment to edit before posting
- **Copy Comment**: Animated copy button for quick clipboard access
- **View on Reddit**: External link to view the original post

#### Comment Generation
- **Three Length Options**: Micro, Medium, and Verbose comment styles
- **AI-Powered Generation**: Comments tailored to post content and user's website
- **Tone Customization**: Regenerate all comments with custom tone instructions
- **Per-Lead Selection**: Choose comment length individually for each lead

### 3. Batch Operations

#### Batch Posting System
- **Queue Management**: Dedicated "Queue" tab showing approved leads
- **Batch Controls**: Start, Pause, Resume, and Cancel batch posting
- **Rate Limiting**: 10-second delay between posts to avoid Reddit limits
- **Progress Tracking**: Real-time progress bar with current/total count
- **Error Handling**: Continues on failure with success/failure count

#### Batch UI Features
```typescript
// Batch posting card shows:
- Number of queued comments ready to post
- Start/Pause/Resume/Cancel buttons
- Progress bar during posting
- Status messages (Processing/Paused)
```

### 4. Filtering and Sorting

#### Filter Options
- **Keyword Filter**: Search leads by keyword
- **Score Filter**: Set minimum relevance score threshold
- **Tab Filter**: Toggle between "All Leads" and "Queue"

#### Sort Options
- **By Relevance**: Sort by AI-generated relevance score
- **By Upvotes**: Sort by Reddit post score
- **By Time**: Sort by discovery time (newest first)

### 5. Pagination
- **10 Items Per Page**: Clean, manageable view
- **Smart Pagination**: Previous/Next buttons with page numbers
- **Ellipsis**: Shows "..." for large page ranges
- **State Preservation**: Maintains filters and sort when paginating

### 6. Lead Card Features

Each lead card displays:
- **Post Author**: Avatar and username
- **Post Title**: Full title with overflow handling
- **Content Snippet**: Preview of post content
- **Metadata**: Upvotes, time ago, keyword tag
- **Relevance Score**: Visual badge with score reasoning
- **Generated Comment**: Editable comment with length indicator
- **Action Buttons**: Queue/Remove and Post Now

### 7. Reddit Integration

#### Authentication
- **OAuth Flow**: Secure Reddit authentication
- **Auth Check**: Verifies authentication before posting
- **Auto-Redirect**: Redirects to auth page if not authenticated

#### Posting Features
- **Direct Posting**: Posts comments via Reddit API
- **Status Updates**: Updates lead status after posting
- **Success Feedback**: Opens posted comment in new tab
- **Error Handling**: Shows specific error messages

### 8. Real-Time Features

#### Firebase Integration
- **Live Listeners**: Real-time updates for new leads
- **Optimistic Updates**: Immediate UI feedback
- **Offline Support**: Works with Firebase's offline capabilities
- **Efficient Queries**: Ordered by creation date, filtered by campaign

### 9. Campaign Management
- **Create Campaigns**: New campaign dialog
- **Campaign Selection**: Dropdown to switch between campaigns
- **Website Content**: Loads campaign-specific website content

### 10. Error Handling and Feedback

#### User Feedback
- **Toast Notifications**: Success/error messages for all actions
- **Loading States**: Skeletons and spinners during data fetching
- **Empty States**: Clear messaging when no leads found
- **Error Messages**: Specific error details for debugging

#### Progress Indicators
- **Workflow Progress**: Shows lead generation steps
- **Loading Skeletons**: Placeholder UI during loading
- **Batch Progress**: Real-time updates during batch posting

## Technical Implementation

### State Management
```typescript
// Key state variables:
- leads: LeadResult[] // All fetched leads
- workflowProgress: WorkflowProgress // Generation status
- isBatchPosting: boolean // Batch posting state
- batchPostingProgress: { current, total, isPaused }
- newLeadIds: Set<string> // For animations
```

### Performance Optimizations
- **Memoized Computations**: Filtering and sorting with useMemo
- **Ref-based Control**: batchPostingRef for cancellation
- **Pagination**: Limits DOM nodes to 10 items
- **Cached Timestamps**: Prevents recalculation

### Error Recovery
- **Graceful Degradation**: Continues on individual failures
- **Retry Logic**: Built into Reddit posting actions
- **Validation**: Thread ID extraction with fallbacks
- **Auth Recovery**: Redirects to auth on failure

## Usage Flow

1. **Initial Setup**: User completes onboarding with keywords
2. **Lead Generation**: System automatically finds Reddit posts
3. **Review Leads**: User reviews scored and generated comments
4. **Edit/Customize**: Optional editing and tone adjustment
5. **Queue Management**: Add leads to queue or post immediately
6. **Batch Posting**: Start batch posting with monitoring
7. **Success Tracking**: View posted comments on Reddit

## Future Enhancements
- Schedule posting for optimal times
- Analytics dashboard for tracking performance
- Multi-platform support (LinkedIn, Twitter)
- A/B testing for comment variations
- Automated follow-up responses 