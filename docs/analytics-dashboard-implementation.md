# Analytics Dashboard Implementation

## Overview

The Analytics Dashboard provides comprehensive insights into Reddit lead generation performance, including engagement metrics, keyword effectiveness, and campaign analytics. This feature enables users to track ROI, optimize strategies, and monitor success metrics in real-time.

## Features Implemented

### 📊 KPI Dashboard
- **Total Leads**: Count of all generated leads in selected timeframe
- **Average Relevance Score**: Mean relevance score across all leads 
- **Posting Success Rate**: Percentage of leads successfully posted to Reddit
- **Average Engagement**: Mean upvotes and replies per posted comment

### 📈 Data Visualizations
- **Leads Over Time**: Line chart showing daily lead generation with high-quality lead overlay
- **Relevance Distribution**: Bar chart displaying score ranges (0-20, 21-40, etc.)
- **Keyword Performance Table**: Top keywords by leads generated, relevance, and engagement
- **Top Comments Table**: Best performing posted comments with Reddit links

### 🔍 Filtering & Controls
- **Campaign Selection**: Filter by specific campaign or view all campaigns
- **Date Ranges**: Today, Last 7 days, Last 30 days, Custom range
- **Real-time Refresh**: Manual refresh button with last updated timestamp
- **Responsive Design**: Mobile-friendly layout with proper loading states

## Database Schema Changes

### Extended GeneratedCommentDocument
```typescript
interface GeneratedCommentDocument {
  // ... existing fields ...
  
  // New analytics fields
  engagementUpvotes?: number           // Reddit upvotes received
  engagementRepliesCount?: number      // Reddit replies received  
  lastEngagementCheckAt?: Timestamp    // Last engagement sync
  engagementCheckCount?: number        // Rate limiting counter
}
```

### Enhanced KeywordPerformanceDocument
```typescript
interface KeywordPerformanceDocument {
  keyword: string                      // Individual keyword
  totalLeadsGenerated: number         // Total leads for keyword
  totalHighQualityLeads: number       // Leads with score >= 70
  sumRelevanceScore: number          // Sum for average calculation
  totalEngagementUpvotes: number     // Total upvotes across posts
  totalEngagementReplies: number     // Total replies across posts
  totalPostedCommentsUsingKeyword: number
  lastCalculatedAt: Timestamp        // Analytics calculation timestamp
  // ... other fields ...
}
```

### New DailyAnalyticsSnapshotDocument
```typescript
interface DailyAnalyticsSnapshotDocument {
  id: string                         // org_campaign_date format
  organizationId: string
  campaignId?: string               // null for org-wide snapshots
  date: Timestamp                   // Start of day
  metrics: {
    leadsGenerated: number
    highQualityLeads: number
    avgRelevanceScore: number
    totalEngagementUpvotes: number
    totalEngagementReplies: number
    commentsPosted: number
    uniqueKeywords: number
    topKeyword?: string
    topKeywordLeads?: number
  }
}
```

## Backend Actions

### Analytics Data Retrieval
- `getOrganizationAnalyticsAction()`: Org-wide performance metrics
- `getCampaignAnalyticsAction()`: Campaign-specific analytics  
- `getLeadsOverTimeAction()`: Time series data for charts
- `getRelevanceDistributionAction()`: Score distribution analysis
- `getKeywordPerformanceAction()`: Keyword effectiveness tracking
- `getTopPerformingCommentsAction()`: Best engagement performers

### Data Management
- `updateCommentEngagementAction()`: Update engagement metrics
- `calculateAndStoreAnalyticsSnapshotAction()`: Daily aggregation for performance

## API Routes

### Automated Data Collection
- **POST `/api/analytics/snapshot`**
  - Generates daily analytics snapshots for all organizations
  - Protected by `CRON_SECRET` for automated execution
  - Processes historical data for efficient querying

- **POST `/api/analytics/update-engagement`**
  - Updates engagement metrics from Reddit API
  - Protected by `CRON_SECRET` for scheduled updates
  - Includes rate limiting and error handling

## Frontend Components

### Main Components
- **`AnalyticsDashboard`**: Main dashboard container with data fetching
- **`AnalyticsLoadingSkeleton`**: Skeleton loader for all dashboard elements
- **Analytics Page**: Server component at `/reddit/analytics`

### Chart Integration
- Uses `recharts` library with `ChartContainer` from shadcn/ui
- Responsive design with proper tooltip formatting
- Consistent theming across all visualizations

### Navigation Integration
- Added to sidebar navigation under Reddit section
- Accessible via `/reddit/analytics` route
- Icon: `BarChart3` from Lucide React

## Usage Examples

### Accessing Analytics
1. Navigate to "Reddit" → "Analytics" in sidebar
2. Select campaign filter (All Campaigns or specific campaign)
3. Choose date range (Today, 7 days, 30 days, Custom)
4. View real-time metrics and visualizations

### Interpreting Metrics
- **High relevance scores (70+)**: Quality leads likely to convert
- **Posting success rate**: Efficiency of comment posting workflow  
- **Engagement trends**: Community reception and content effectiveness
- **Keyword performance**: Which search terms generate best results

### Optimization Insights
- **Low relevance keywords**: Consider refining or removing
- **High engagement posts**: Analyze for successful patterns
- **Time-based trends**: Identify optimal posting schedules
- **Campaign comparison**: Allocate resources to top performers

## Performance Considerations

### Data Efficiency
- Daily snapshots reduce query load for historical data
- Engagement updates run on scheduled intervals (not real-time)
- Client-side filtering minimizes server requests
- Proper indexing on date and organization fields

### Scalability
- Batch processing for daily aggregations
- Rate limiting on Reddit API calls
- Pagination support for large datasets
- Caching opportunities for frequently accessed data

## Error Handling

### Client-Side
- Loading states during data fetching
- Error boundaries for component failures
- Graceful degradation when data unavailable
- User-friendly error messages

### Server-Side  
- Comprehensive logging with console outputs
- Transaction rollbacks for data consistency
- Retry logic for transient failures
- Rate limiting compliance for external APIs

## Future Enhancements

### Potential Features
- **Export functionality**: CSV/PDF report generation
- **Email reports**: Scheduled analytics summaries  
- **Advanced filtering**: Subreddit, author, engagement thresholds
- **Predictive analytics**: ML-based performance forecasting
- **A/B testing**: Compare different posting strategies
- **ROI calculations**: Revenue attribution from leads

### Technical Improvements
- **Real-time updates**: WebSocket integration for live metrics
- **Data streaming**: Server-sent events for continuous updates
- **Advanced caching**: Redis for improved performance
- **Custom date ranges**: More granular time period selection
- **Drill-down views**: Detailed analysis of specific data points

## Testing

### Manual Testing
- Verify all charts render correctly with sample data
- Test date range filtering and campaign selection
- Confirm responsive behavior on mobile devices
- Validate loading states and error handling

### Automated Testing (Recommended)
- Unit tests for analytics calculation functions
- Integration tests for API endpoints
- Component tests for UI interactions
- End-to-end tests for complete workflows

## Security & Privacy

### Data Protection
- User data isolated by organization
- API endpoints protected by authentication
- CRON endpoints secured with secret tokens
- No PII exposure in analytics aggregations

### Access Control
- Analytics limited to organization members
- Campaign data restricted by permissions
- Audit logging for sensitive operations
- Compliance with data retention policies

---

## Quick Start Guide

1. **Access Dashboard**: Visit `/reddit/analytics` 
2. **Select Filters**: Choose campaign and date range
3. **Review KPIs**: Check overview metrics at top
4. **Analyze Charts**: Examine trends and distributions
5. **Review Tables**: Identify top keywords and comments
6. **Take Action**: Optimize based on insights

The analytics dashboard provides actionable insights to improve Reddit lead generation performance and maximize ROI from your campaigns. 